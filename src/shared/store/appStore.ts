import { create } from "zustand";
import { buildDefaultTemplatesBundle } from "@/features/templates/defaultTemplates";
import { tauriClient } from "@/shared/api/tauriClient";
import type { Project, StepStatus, TemplatesBundle, WorkflowStepId } from "@/shared/types/domain";
import type { CommandExecutionResponse } from "@/shared/api/tauriClient";

const TEMPLATES_STORAGE_KEY = "audio-workflow-renaming-presets-v1";

function loadInitialTemplates(): TemplatesBundle {
  const defaults = buildDefaultTemplatesBundle();
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as TemplatesBundle;
    if (
      !parsed ||
      !Array.isArray(parsed.renaming) ||
      !Array.isArray(parsed.processing) ||
      !Array.isArray(parsed.export) ||
      !Array.isArray(parsed.workflows)
    ) {
      return defaults;
    }
    return parsed;
  } catch {
    return defaults;
  }
}

function persistTemplates(templates?: TemplatesBundle) {
  if (typeof window === "undefined" || !templates) {
    return;
  }
  window.localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export interface StepRunLog {
  id: string;
  stepId: WorkflowStepId;
  at: string;
  message: string;
  level: "info" | "warn" | "error";
  response?: CommandExecutionResponse;
}

export interface ToastNotification {
  id: string;
  level: "info" | "success" | "warn" | "error";
  title: string;
  message?: string;
  action?: { label: string; path: string };
  createdAt: number;
}

interface AppState {
  project: Project | undefined;
  templates: TemplatesBundle | undefined;
  ffmpegPath: string;
  ffprobePath: string;
  isRunning: boolean;
  selectedStep: WorkflowStepId;
  logs: StepRunLog[];
  toasts: ToastNotification[];
  setProject: (project?: Project) => void;
  setTemplates: (templates?: TemplatesBundle) => void;
  setToolPaths: (ffmpegPath: string, ffprobePath: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  setSelectedStep: (step: WorkflowStepId) => void;
  addLog: (entry: StepRunLog) => void;
  clearLogs: () => void;
  pushToast: (toast: Omit<ToastNotification, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;
  setStepStatus: (
    stepId: WorkflowStepId,
    status: StepStatus,
    extra?: { startedAt?: string; endedAt?: string; error?: string }
  ) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  project: undefined,
  templates: loadInitialTemplates(),
  ffmpegPath: "ffmpeg",
  ffprobePath: "ffprobe",
  isRunning: false,
  selectedStep: "importAnalysis",
  logs: [],
  toasts: [],
  setProject: (project) => set({ project }),
  setTemplates: (templates) => {
    persistTemplates(templates);
    set({ templates });
  },
  setToolPaths: (ffmpegPath, ffprobePath) => set({ ffmpegPath, ffprobePath }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setSelectedStep: (selectedStep) => set({ selectedStep }),
  addLog: (entry) => {
    set((state) => ({ logs: [entry, ...state.logs].slice(0, 500) }));
    const project = get().project;
    if (project) {
      tauriClient
        .appendLogEntry(project.workDirs.logs, entry.level, entry.stepId, entry.message)
        .catch(() => undefined);
    }
  },
  clearLogs: () => set({ logs: [] }),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: crypto.randomUUID(), createdAt: Date.now() }
      ].slice(-6)
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  setStepStatus: (stepId, status, extra) =>
    set((state) => {
      if (!state.project) {
        return state;
      }
      const previous = state.project.workflowState[stepId];
      const startedAt = extra?.startedAt ?? previous?.startedAt;
      const endedAt = extra?.endedAt ?? previous?.endedAt;
      const next: import("@/shared/types/domain").StepExecutionState = { status };
      if (startedAt !== undefined) {
        next.startedAt = startedAt;
      }
      if (endedAt !== undefined) {
        next.endedAt = endedAt;
      }
      if (extra?.error !== undefined) {
        next.error = extra.error;
      }
      const updated = {
        ...state.project,
        workflowState: {
          ...state.project.workflowState,
          [stepId]: next
        },
        updatedAt: new Date().toISOString()
      };
      return { project: updated };
    })
}));
