use crate::domain::{
    Project, SelectedTemplateIds, SourceFile, StepExecutionState, StepStatus, WorkDirs, WorkflowState, WorkflowStepId,
};
use crate::errors::AppError;
use crate::media_probe::probe::probe_audio;
use crate::storage::project_repository;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
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
    pub resolved_ffmpeg_path: Option<String>,
    pub resolved_ffprobe_path: Option<String>,
    pub auto_install_attempted: bool,
    pub auto_install_succeeded: bool,
    pub details: String,
}

#[tauri::command]
pub fn check_toolchain(ffmpeg_path: String, ffprobe_path: String) -> Result<ToolCheckResult, String> {
    let mut details: Vec<String> = Vec::new();
    let mut ffmpeg_resolved = resolve_tool_path(&ffmpeg_path, "ffmpeg");
    let mut ffprobe_resolved = resolve_tool_path(&ffprobe_path, "ffprobe");
    let mut auto_install_attempted = false;
    let mut auto_install_succeeded = false;

    let mut ffmpeg_available = ffmpeg_resolved.is_some();
    let mut ffprobe_available = ffprobe_resolved.is_some();

    if !ffmpeg_available || !ffprobe_available {
        auto_install_attempted = true;
        let install_result = auto_install_ffmpeg_windows();
        details.push(install_result.log);
        auto_install_succeeded = install_result.success;

        ffmpeg_resolved = resolve_tool_path("ffmpeg", "ffmpeg");
        ffprobe_resolved = resolve_tool_path("ffprobe", "ffprobe");
        ffmpeg_available = ffmpeg_resolved.is_some();
        ffprobe_available = ffprobe_resolved.is_some();
    }

    Ok(ToolCheckResult {
        ffmpeg_available,
        ffprobe_available,
        ffmpeg_path,
        ffprobe_path,
        resolved_ffmpeg_path: ffmpeg_resolved,
        resolved_ffprobe_path: ffprobe_resolved,
        auto_install_attempted,
        auto_install_succeeded,
        details: details.join(" | "),
    })
}

#[tauri::command]
pub fn create_project(input: CreateProjectInput) -> Result<Project, String> {
    create_project_impl(input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_session_project() -> Result<Project, String> {
    let input = CreateProjectInput {
        name: "Session rapide".to_string(),
        root_dir: resolve_session_root_dir().to_string_lossy().to_string(),
    };
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

fn resolve_session_root_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            return PathBuf::from(local_app_data).join("AudioWorkflow").join("sessions");
        }
    }

    env::temp_dir().join("audio-workflow").join("sessions")
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendLogEntryInput {
    pub logs_dir: String,
    pub level: String,
    pub step_id: String,
    pub message: String,
}

#[tauri::command]
pub fn append_log_entry(input: AppendLogEntryInput) -> Result<(), String> {
    let logs_dir = PathBuf::from(&input.logs_dir);
    if logs_dir.as_os_str().is_empty() {
        return Ok(());
    }
    fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;
    let log_path = logs_dir.join("app.log");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;
    let line = serde_json::json!({
        "at": Utc::now().to_rfc3339(),
        "level": input.level,
        "stepId": input.step_id,
        "message": input.message,
    });
    writeln!(file, "{}", line).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn analyze_source_files(input: AnalyzeInput) -> Result<Vec<SourceFile>, String> {
    let mut resolved_ffprobe = resolve_tool_path(&input.ffprobe_path, "ffprobe");
    if resolved_ffprobe.is_none() {
        let _ = auto_install_ffmpeg_windows();
        resolved_ffprobe = resolve_tool_path("ffprobe", "ffprobe");
    }

    let ffprobe_bin = resolved_ffprobe.ok_or_else(|| {
        "FFprobe introuvable. Clique sur 'Vérifier' pour lancer l'installation automatique, puis réessaie."
            .to_string()
    })?;

    let mut results = Vec::new();
    for file in &input.file_paths {
        let path = PathBuf::from(file);
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
        let probe = probe_audio(file, &ffprobe_bin)
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

        let bit_depth = stream.bits_per_sample.filter(|v| *v > 0).or_else(|| {
            stream
                .bits_per_raw_sample
                .as_ref()
                .and_then(|v| v.parse::<u16>().ok())
        });

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
            bit_depth,
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

fn is_tool_available(input: &str) -> bool {
    if input.trim().is_empty() {
        return false;
    }

    if Path::new(input).exists() {
        return true;
    }

    Command::new(input)
        .arg("-version")
        .output()
        .map(|output| output.status.success() || output.status.code().is_some())
        .unwrap_or(false)
}

#[derive(Debug)]
struct InstallAttempt {
    success: bool,
    log: String,
}

fn resolve_tool_path(input: &str, fallback_cmd: &str) -> Option<String> {
    if input.trim().is_empty() {
        return None;
    }

    if Path::new(input).exists() {
        return Some(input.to_string());
    }

    if is_tool_available(input) {
        if let Some(path) = where_first(input) {
            return Some(path);
        }
        return Some(input.to_string());
    }

    if let Some(path) = where_first(fallback_cmd) {
        return Some(path);
    }

    None
}

fn where_first(command_name: &str) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("where").arg(command_name).output().ok()?;
        if !output.status.success() {
            return None;
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        return stdout
            .lines()
            .find(|line| !line.trim().is_empty())
            .map(|line| line.trim().to_string());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("which").arg(command_name).output().ok()?;
        if !output.status.success() {
            return None;
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        return stdout
            .lines()
            .find(|line| !line.trim().is_empty())
            .map(|line| line.trim().to_string());
    }
}

fn auto_install_ffmpeg_windows() -> InstallAttempt {
    #[cfg(target_os = "windows")]
    {
        let winget_ok = Command::new("winget")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if !winget_ok {
            return InstallAttempt {
                success: false,
                log: "winget non disponible, installation automatique impossible".to_string(),
            };
        }

        let package_ids = ["Gyan.FFmpeg", "BtbN.FFmpeg", "FFmpeg.FFmpeg"];
        for package_id in package_ids {
            let output = Command::new("winget")
                .args([
                    "install",
                    "--id",
                    package_id,
                    "-e",
                    "--accept-package-agreements",
                    "--accept-source-agreements",
                ])
                .output();

            match output {
                Ok(out) if out.status.success() => {
                    return InstallAttempt {
                        success: true,
                        log: format!("Installation automatique réussie via winget package {}", package_id),
                    }
                }
                Ok(out) => {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let combined = format!("{} {}", stdout.trim(), stderr.trim());
                    if combined.contains("already installed")
                        || combined.contains("déjà installé")
                        || combined.contains("No available upgrade found")
                    {
                        return InstallAttempt {
                            success: true,
                            log: format!("FFmpeg déjà installé (package {})", package_id),
                        };
                    }
                }
                Err(_) => continue,
            }
        }

        InstallAttempt {
            success: false,
            log: "Echec installation automatique FFmpeg/FFprobe via winget".to_string(),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        InstallAttempt {
            success: false,
            log: "Installation automatique non implémentée hors Windows".to_string(),
        }
    }
}
