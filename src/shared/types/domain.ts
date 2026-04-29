export type WorkflowStepId = "importAnalysis" | "renaming" | "processing" | "export";
export type StepStatus = "pending" | "running" | "success" | "error" | "skipped";

export interface WorkDirs {
  sources: string;
  renamed: string;
  processed: string;
  exported: string;
  logs: string;
}

export interface SourceFile {
  id: string;
  fileName: string;
  absolutePath: string;
  fileSizeBytes: number;
  durationSeconds?: number;
  sampleRateHz?: number;
  bitDepth?: number;
  channels: number;
  codec?: string;
  channelNames: string[];
}

export type TrackState = "source" | "renamed" | "processed" | "exported" | "ignored";

export interface AudioTrack {
  id: string;
  sourceFileId: string;
  channelIndex?: number;
  displayName: string;
  currentPath: string;
  state: TrackState;
}

export interface StepExecutionState {
  status: StepStatus;
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

export type WorkflowState = Record<WorkflowStepId, StepExecutionState>;

export interface ExecutionRun {
  id: string;
  step: WorkflowStepId;
  command: string;
  arguments: string[];
  startedAt: string;
  endedAt?: string;
  exitCode?: number;
  success: boolean;
  stdoutSnippet: string;
  stderrSnippet: string;
}

export interface SelectedTemplateIds {
  workflow?: string;
  rename?: string;
  processing?: string;
  export?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rootDir: string;
  workDirs: WorkDirs;
  sourceFiles: SourceFile[];
  tracks: AudioTrack[];
  selectedTemplateIds: SelectedTemplateIds;
  workflowState: WorkflowState;
  executionHistory: ExecutionRun[];
}

export interface RenameRule {
  sourceLabel: string;
  targetLabel: string;
}

export type NameConflictStrategy = "error" | "suffixIncrement" | "replace";

export interface NamingPattern {
  prefix?: string;
  suffix?: string;
  includeProjectName: boolean;
  includeDate: boolean;
  includeTrackIndex: boolean;
  includeSourceName: boolean;
}

export interface RenameTemplate {
  id: string;
  name: string;
  description?: string;
  map: RenameRule[];
  ignoredTrackIds: string[];
  naming: NamingPattern;
  conflictStrategy: NameConflictStrategy;
}

export interface RenameTrackRequest {
  trackId: string;
  targetName: string;
}

export interface ReverbSettings {
  delayMs: number;
  decay: number;
}

export type ProcessingOperation =
  | {
      type: "processTrack";
      inputTrackId: string;
      outputFileName: string;
      gainDb?: number;
      pan?: number;
      reverb?: ReverbSettings;
    }
  | {
      type: "mixToStereoPanned";
      inputs: Array<{
        inputTrackId: string;
        pan: number;
      }>;
      outputFileName: string;
    }
  | {
      type: "mergeToStereo";
      inputLeftTrackId: string;
      inputRightTrackId: string;
      outputFileName: string;
    }
  | {
      type: "mergeToMonoBus";
      inputTrackIds: string[];
      outputFileName: string;
    }
  | {
      type: "pan";
      inputTrackId: string;
      position: number;
      outputFileName: string;
    }
  | {
      type: "gain";
      inputTrackId: string;
      gainDb: number;
      outputFileName: string;
    }
  | {
      type: "reverbSimple";
      inputTrackId: string;
      outputFileName: string;
      delayMs: number;
      decay: number;
    }
  | {
      type: "futureCompression";
      inputTrackId: string;
      outputFileName: string;
      thresholdDb: number;
      ratio: number;
    }
  | {
      type: "futureNormalize";
      inputTrackId: string;
      outputFileName: string;
      mode: string;
    };

export interface ProcessingTemplate {
  id: string;
  name: string;
  operations: ProcessingOperation[];
  keepOriginalTracks: boolean;
  keepGeneratedTracks: boolean;
}

export type ExportFormat = "wav" | "mp3" | "aacM4a";

export interface ExportPreset {
  id: string;
  format: ExportFormat;
  bitrateKbps?: number;
  sampleRateHz?: number;
  channels?: number;
  qualityVbr?: number;
}

export interface ExportTemplate {
  id: string;
  name: string;
  outputDir?: string;
  presets: ExportPreset[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  renameTemplateId?: string;
  processingTemplateId?: string;
  exportTemplateId?: string;
}

export interface TemplatesBundle {
  workflows: WorkflowTemplate[];
  renaming: RenameTemplate[];
  processing: ProcessingTemplate[];
  export: ExportTemplate[];
}

export interface FFmpegCommand {
  binary: string;
  args: string[];
  description: string;
  stepName: string;
}
