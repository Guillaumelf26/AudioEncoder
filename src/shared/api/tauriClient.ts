import { invoke } from "@tauri-apps/api/core";
import type {
  ExportPreset,
  ProcessingOperation,
  Project,
  RenameTrackRequest,
  SourceFile,
  TemplatesBundle
} from "@/shared/types/domain";

export interface ToolchainCheck {
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  ffmpegPath: string;
  ffprobePath: string;
  resolvedFfmpegPath?: string;
  resolvedFfprobePath?: string;
  autoInstallAttempted: boolean;
  autoInstallSucceeded: boolean;
  details: string;
}

export interface CommandExecutionResponse {
  startedAt: string;
  endedAt: string;
  success: boolean;
  exitCode?: number;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
}

function safeInvoke<T>(command: string, payload?: Record<string, unknown>) {
  if (typeof invoke !== "function") {
    throw new Error(
      "Backend Tauri indisponible. Lance l'application avec `npm run tauri:dev` (pas seulement `npm run dev`)."
    );
  }
  return invoke<T>(command, payload);
}

export function isTauriAvailable(): boolean {
  return typeof invoke === "function";
}

export const tauriClient = {
  checkToolchain: (ffmpegPath: string, ffprobePath: string) =>
    safeInvoke<ToolchainCheck>("check_toolchain", { ffmpegPath, ffprobePath }),

  createProject: (name: string, rootDir: string) =>
    safeInvoke<Project>("create_project", { input: { name, rootDir } }),

  createSessionProject: () => safeInvoke<Project>("create_session_project"),

  loadProject: (projectFilePath: string) =>
    safeInvoke<Project>("load_project", { projectFilePath }),

  saveProject: (project: Project) => safeInvoke<void>("save_project", { project }),

  applyTrackRenaming: (project: Project, renames: RenameTrackRequest[]) =>
    safeInvoke<Project>("apply_track_renaming", { input: { project, renames } }),

  analyzeSourceFiles: (filePaths: string[], ffprobePath: string) =>
    safeInvoke<SourceFile[]>("analyze_source_files", { input: { filePaths, ffprobePath } }),

  loadTemplates: (templatesFilePath: string) =>
    safeInvoke<TemplatesBundle>("load_templates", { templatesFilePath }),

  saveTemplates: (templatesFilePath: string, bundle: TemplatesBundle) =>
    safeInvoke<void>("save_templates", { templatesFilePath, bundle }),

  executeProcessingOperation: (
    ffmpegPath: string,
    inputBaseDir: string,
    outputBaseDir: string,
    operation: ProcessingOperation
  ) =>
    safeInvoke<CommandExecutionResponse>("execute_processing_operation", {
      input: { ffmpegPath, inputBaseDir, outputBaseDir, operation }
    }),

  executeExportOperation: (
    ffmpegPath: string,
    inputWavPath: string,
    outputPath: string,
    preset: ExportPreset
  ) =>
    safeInvoke<CommandExecutionResponse>("execute_export_operation", {
      input: { ffmpegPath, inputWavPath, outputPath, preset }
    }),

  listDirectoryFiles: (directoryPath: string, extensions: string[]) =>
    safeInvoke<string[]>("list_directory_files", { directoryPath, extensions }),

  revealInExplorer: (path: string) => safeInvoke<void>("reveal_in_explorer", { path }),

  appendLogEntry: (logsDir: string, level: "info" | "warn" | "error", stepId: string, message: string) =>
    safeInvoke<void>("append_log_entry", {
      input: { logsDir, level, stepId, message }
    })
};
