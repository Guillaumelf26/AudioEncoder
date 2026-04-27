use crate::domain::{
    Project, SelectedTemplateIds, SourceFile, StepExecutionState, StepStatus, WorkDirs, WorkflowState, WorkflowStepId,
};
use crate::errors::AppError;
use crate::media_probe::probe::probe_audio;
use crate::storage::project_repository;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub root_dir: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeInput {
    pub file_paths: Vec<String>,
    pub ffprobe_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCheckResult {
    pub ffmpeg_available: bool,
    pub ffprobe_available: bool,
    pub ffmpeg_path: String,
    pub ffprobe_path: String,
}

#[tauri::command]
pub fn check_toolchain(ffmpeg_path: String, ffprobe_path: String) -> Result<ToolCheckResult, String> {
    let ffmpeg_available = Path::new(&ffmpeg_path).exists();
    let ffprobe_available = Path::new(&ffprobe_path).exists();
    Ok(ToolCheckResult {
        ffmpeg_available,
        ffprobe_available,
        ffmpeg_path,
        ffprobe_path,
    })
}

#[tauri::command]
pub fn create_project(input: CreateProjectInput) -> Result<Project, String> {
    create_project_impl(input).map_err(|e| e.to_string())
}

fn create_project_impl(input: CreateProjectInput) -> Result<Project, AppError> {
    let project_id = Uuid::new_v4().to_string();
    let root = PathBuf::from(input.root_dir);
    let project_dir = root.join(&project_id);
    fs::create_dir_all(&project_dir)?;

    let work_dirs = WorkDirs {
        sources: create_dir(&project_dir, "01_sources")?,
        renamed: create_dir(&project_dir, "03_renamed")?,
        processed: create_dir(&project_dir, "04_processed")?,
        exported: create_dir(&project_dir, "05_exports")?,
        logs: create_dir(&project_dir, "logs")?,
    };

    let now = Utc::now();
    let project = Project {
        id: project_id,
        name: input.name,
        created_at: now,
        updated_at: now,
        root_dir: project_dir.to_string_lossy().to_string(),
        work_dirs,
        source_files: Vec::new(),
        tracks: Vec::new(),
        selected_template_ids: SelectedTemplateIds::default(),
        workflow_state: default_workflow_state(),
        execution_history: Vec::new(),
    };

    let project_path = project_dir.join("project.json");
    project_repository::save_project(&project, &project_path)?;
    Ok(project)
}

#[tauri::command]
pub fn load_project(project_file_path: String) -> Result<Project, String> {
    project_repository::load_project(Path::new(&project_file_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_project(project: Project) -> Result<(), String> {
    let path = PathBuf::from(&project.root_dir).join("project.json");
    project_repository::save_project(&project, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn analyze_source_files(input: AnalyzeInput) -> Result<Vec<SourceFile>, String> {
    let mut results = Vec::new();
    for file in &input.file_paths {
        let path = PathBuf::from(file);
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
        let probe = probe_audio(file, &input.ffprobe_path)
            .await
            .map_err(|e| e.to_string())?;

        let stream = probe
            .streams
            .first()
            .ok_or_else(|| "Aucun flux audio détecté".to_string())?;

        let duration_seconds = probe
            .format
            .duration
            .as_ref()
            .and_then(|v| v.parse::<f64>().ok());
        let sample_rate_hz = stream
            .sample_rate
            .as_ref()
            .and_then(|v| v.parse::<u32>().ok());
        let channel_names = stream
            .channel_layout
            .clone()
            .map(|layout| vec![layout])
            .unwrap_or_default();

        let source = SourceFile {
            id: Uuid::new_v4().to_string(),
            file_name: path
                .file_name()
                .and_then(|v| v.to_str())
                .unwrap_or("unknown.wav")
                .to_string(),
            absolute_path: file.clone(),
            file_size_bytes: metadata.len(),
            duration_seconds,
            sample_rate_hz,
            bit_depth: stream.bits_per_sample,
            channels: stream.channels.unwrap_or(1),
            codec: stream.codec_name.clone(),
            channel_names,
        };
        results.push(source);
    }
    Ok(results)
}

fn create_dir(project_dir: &Path, name: &str) -> Result<String, AppError> {
    let path = project_dir.join(name);
    fs::create_dir_all(&path)?;
    Ok(path.to_string_lossy().to_string())
}

fn default_workflow_state() -> WorkflowState {
    let mut steps = HashMap::new();
    for step in [
        WorkflowStepId::ImportAnalysis,
        WorkflowStepId::Renaming,
        WorkflowStepId::Processing,
        WorkflowStepId::Export,
    ] {
        steps.insert(
            step,
            StepExecutionState {
                status: StepStatus::Pending,
                started_at: None,
                ended_at: None,
                error: None,
            },
        );
    }
    WorkflowState { steps }
}
