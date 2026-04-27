import { invoke } from "@tauri-apps/api/core";
import type {
  ExportPreset,
  ProcessingOperation,
  Project,
  SourceFile,
  TemplatesBundle
} from "@/shared/types/domain";

export interface ToolchainCheck {
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  ffmpegPath: string;
  ffprobePath: string;
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

export const tauriClient = {
  checkToolchain: (ffmpegPath: string, ffprobePath: string) =>
    invoke<ToolchainCheck>("check_toolchain", { ffmpegPath, ffprobePath }),

  createProject: (name: string, rootDir: string) =>
    invoke<Project>("create_project", { input: { name, rootDir } }),

  loadProject: (projectFilePath: string) =>
    invoke<Project>("load_project", { projectFilePath }),

  saveProject: (project: Project) => invoke<void>("save_project", { project }),

  analyzeSourceFiles: (filePaths: string[], ffprobePath: string) =>
    invoke<SourceFile[]>("analyze_source_files", { input: { filePaths, ffprobePath } }),

  loadTemplates: (templatesFilePath: string) =>
    invoke<TemplatesBundle>("load_templates", { templatesFilePath }),

  saveTemplates: (templatesFilePath: string, bundle: TemplatesBundle) =>
    invoke<void>("save_templates", { templatesFilePath, bundle }),

  executeProcessingOperation: (
    ffmpegPath: string,
    inputBaseDir: string,
    outputBaseDir: string,
    operation: ProcessingOperation
  ) =>
    invoke<CommandExecutionResponse>("execute_processing_operation", {
      input: { ffmpegPath, inputBaseDir, outputBaseDir, operation }
    }),

  executeExportOperation: (
    ffmpegPath: string,
    inputWavPath: string,
    outputPath: string,
    preset: ExportPreset
  ) =>
    invoke<CommandExecutionResponse>("execute_export_operation", {
      input: { ffmpegPath, inputWavPath, outputPath, preset }
    })
};
