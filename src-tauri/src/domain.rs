use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub root_dir: String,
    pub work_dirs: WorkDirs,
    pub source_files: Vec<SourceFile>,
    pub tracks: Vec<AudioTrack>,
    pub selected_template_ids: SelectedTemplateIds,
    pub workflow_state: WorkflowState,
    pub execution_history: Vec<ExecutionRun>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkDirs {
    pub sources: String,
    pub renamed: String,
    pub processed: String,
    pub exported: String,
    pub logs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SelectedTemplateIds {
    pub workflow: Option<String>,
    pub rename: Option<String>,
    pub processing: Option<String>,
    pub export: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceFile {
    pub id: String,
    pub file_name: String,
    pub absolute_path: String,
    pub file_size_bytes: u64,
    pub duration_seconds: Option<f64>,
    pub sample_rate_hz: Option<u32>,
    pub bit_depth: Option<u16>,
    pub channels: u16,
    pub codec: Option<String>,
    pub channel_names: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioTrack {
    pub id: String,
    pub source_file_id: String,
    pub channel_index: Option<u16>,
    pub display_name: String,
    pub current_path: String,
    pub state: TrackState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TrackState {
    Source,
    Renamed,
    Processed,
    Exported,
    Ignored,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowState {
    pub steps: HashMap<WorkflowStepId, StepExecutionState>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkflowStepId {
    ImportAnalysis,
    Renaming,
    Processing,
    Export,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepExecutionState {
    pub status: StepStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StepStatus {
    Pending,
    Running,
    Success,
    Error,
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionRun {
    pub id: String,
    pub step: WorkflowStepId,
    pub command: String,
    pub arguments: Vec<String>,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub exit_code: Option<i32>,
    pub success: bool,
    pub stdout_snippet: String,
    pub stderr_snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub map: Vec<RenameRule>,
    pub ignored_track_ids: Vec<String>,
    pub naming: NamingPattern,
    pub conflict_strategy: NameConflictStrategy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameRule {
    pub source_label: String,
    pub target_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NamingPattern {
    pub prefix: Option<String>,
    pub suffix: Option<String>,
    pub include_project_name: bool,
    pub include_date: bool,
    pub include_track_index: bool,
    pub include_source_name: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NameConflictStrategy {
    Error,
    SuffixIncrement,
    Replace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum ProcessingOperation {
    ProcessTrack {
        input_track_id: String,
        output_file_name: String,
        gain_db: Option<f32>,
        pan: Option<f32>,
        reverb: Option<ReverbSettings>,
    },
    MixToStereoPanned {
        inputs: Vec<PannedTrackInput>,
        output_file_name: String,
    },
    MergeToStereo {
        input_left_track_id: String,
        input_right_track_id: String,
        output_file_name: String,
    },
    MergeToMonoBus {
        input_track_ids: Vec<String>,
        output_file_name: String,
    },
    Pan {
        input_track_id: String,
        position: f32,
        output_file_name: String,
    },
    Gain {
        input_track_id: String,
        gain_db: f32,
        output_file_name: String,
    },
    ReverbSimple {
        input_track_id: String,
        output_file_name: String,
        delay_ms: u32,
        decay: f32,
    },
    FutureCompression {
        input_track_id: String,
        output_file_name: String,
        threshold_db: f32,
        ratio: f32,
    },
    FutureNormalize {
        input_track_id: String,
        output_file_name: String,
        mode: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReverbSettings {
    pub delay_ms: u32,
    pub decay: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PannedTrackInput {
    pub input_track_id: String,
    pub pan: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessingTemplate {
    pub id: String,
    pub name: String,
    pub operations: Vec<ProcessingOperation>,
    pub keep_original_tracks: bool,
    pub keep_generated_tracks: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExportFormat {
    Wav,
    Mp3,
    AacM4a,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPreset {
    pub id: String,
    pub format: ExportFormat,
    pub bitrate_kbps: Option<u16>,
    pub sample_rate_hz: Option<u32>,
    pub channels: Option<u8>,
    pub quality_vbr: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTemplate {
    pub id: String,
    pub name: String,
    pub output_dir: Option<String>,
    pub presets: Vec<ExportPreset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowTemplate {
    pub id: String,
    pub name: String,
    pub rename_template_id: Option<String>,
    pub processing_template_id: Option<String>,
    pub export_template_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplatesBundle {
    pub workflows: Vec<WorkflowTemplate>,
    pub renaming: Vec<RenameTemplate>,
    pub processing: Vec<ProcessingTemplate>,
    pub export: Vec<ExportTemplate>,
}
