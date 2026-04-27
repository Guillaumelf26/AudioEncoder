import { create } from "zustand";
import type { Project, TemplatesBundle } from "@/shared/types/domain";
import type { CommandExecutionResponse } from "@/shared/api/tauriClient";

export interface StepRunLog {
  id: string;
  stepId: "importAnalysis" | "renaming" | "processing" | "export";
  at: string;
  message: string;
  level: "info" | "warn" | "error";
  response?: CommandExecutionResponse;
}

interface AppState {
  project: Project | undefined;
  templates: TemplatesBundle | undefined;
  ffmpegPath: string;
  ffprobePath: string;
  isRunning: boolean;
  selectedStep: "importAnalysis" | "renaming" | "processing" | "export";
  logs: StepRunLog[];
  setProject: (project?: Project) => void;
  setTemplates: (templates?: TemplatesBundle) => void;
  setToolPaths: (ffmpegPath: string, ffprobePath: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  setSelectedStep: (step: "importAnalysis" | "renaming" | "processing" | "export") => void;
  addLog: (entry: StepRunLog) => void;
  clearLogs: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  project: undefined,
  templates: undefined,
  ffmpegPath: "ffmpeg",
  ffprobePath: "ffprobe",
  isRunning: false,
  selectedStep: "importAnalysis",
  logs: [],
  setProject: (project) => set({ project }),
  setTemplates: (templates) => set({ templates }),
  setToolPaths: (ffmpegPath, ffprobePath) => set({ ffmpegPath, ffprobePath }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setSelectedStep: (selectedStep) => set({ selectedStep }),
  addLog: (entry) => set((state) => ({ logs: [entry, ...state.logs].slice(0, 500) })),
  clearLogs: () => set({ logs: [] })
}));
