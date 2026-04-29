use crate::audio_engine::service::{
    create_export_command, create_processing_command, execute_ffmpeg_command,
};
use crate::domain::{ExportPreset, ProcessingOperation, Project, TemplatesBundle, TrackState};
use crate::storage::templates_repository;
use crate::validation::validators::{validate_processing_template, validate_rename_template};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteOperationInput {
    pub ffmpeg_path: String,
    pub input_base_dir: String,
    pub output_base_dir: String,
    pub operation: ProcessingOperation,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteExportInput {
    pub ffmpeg_path: String,
    pub input_wav_path: String,
    pub output_path: String,
    pub preset: ExportPreset,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameTrackInput {
    pub track_id: String,
    pub target_name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyTrackRenamingInput {
    pub project: Project,
    pub renames: Vec<RenameTrackInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandExecutionResponse {
    pub started_at: String,
    pub ended_at: String,
    pub success: bool,
    pub exit_code: Option<i32>,
    pub command: String,
    pub args: Vec<String>,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn load_templates(templates_file_path: String) -> Result<TemplatesBundle, String> {
    templates_repository::load_templates(PathBuf::from(templates_file_path).as_path())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_templates(templates_file_path: String, bundle: TemplatesBundle) -> Result<(), String> {
    for template in &bundle.renaming {
        validate_rename_template(template).map_err(|e| e.to_string())?;
    }
    for template in &bundle.processing {
        validate_processing_template(template).map_err(|e| e.to_string())?;
    }
    templates_repository::save_templates(&bundle, PathBuf::from(templates_file_path).as_path())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_directory_files(directory_path: String, extensions: Vec<String>) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&directory_path);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let mut results: Vec<String> = Vec::new();
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let normalized_extensions: Vec<String> = extensions
        .iter()
        .map(|ext| ext.trim_start_matches('.').to_lowercase())
        .collect();
    for entry in entries.flatten() {
        let entry_path = entry.path();
        if !entry_path.is_file() {
            continue;
        }
        if !normalized_extensions.is_empty() {
            let extension_match = entry_path
                .extension()
                .and_then(|v| v.to_str())
                .map(|v| v.to_lowercase())
                .map(|v| normalized_extensions.contains(&v))
                .unwrap_or(false);
            if !extension_match {
                continue;
            }
        }
        results.push(entry_path.to_string_lossy().to_string());
    }
    results.sort();
    Ok(results)
}

#[tauri::command]
pub fn reveal_in_explorer(path: String) -> Result<(), String> {
    let target = Path::new(&path);
    if !target.exists() {
        return Err(format!("Chemin introuvable: {path}"));
    }

    #[cfg(target_os = "windows")]
    {
        let arg = if target.is_dir() {
            target.to_string_lossy().to_string()
        } else {
            format!("/select,{}", target.to_string_lossy())
        };
        std::process::Command::new("explorer.exe")
            .arg(arg)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(target)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn apply_track_renaming(input: ApplyTrackRenamingInput) -> Result<Project, String> {
    let mut project = input.project;
    let renamed_dir = PathBuf::from(&project.work_dirs.renamed);
    fs::create_dir_all(&renamed_dir).map_err(|e| e.to_string())?;

    let rename_map: HashMap<String, String> = input
        .renames
        .into_iter()
        .map(|entry| (entry.track_id, entry.target_name))
        .collect();

    let mut reserved_names: HashSet<String> = HashSet::new();
    for track in &mut project.tracks {
        let Some(requested_name) = rename_map.get(&track.id) else {
            continue;
        };
        let safe_base = sanitize_filename(requested_name);
        let final_base = ensure_unique_base_name(&safe_base, &mut reserved_names);
        let target_path = renamed_dir.join(format!("{final_base}.wav"));
        let current_path = PathBuf::from(&track.current_path);

        if current_path != target_path {
            fs::copy(&current_path, &target_path).map_err(|e| e.to_string())?;
        }

        track.display_name = final_base;
        track.current_path = target_path.to_string_lossy().to_string();
        track.state = TrackState::Renamed;
    }

    project.updated_at = Utc::now();
    Ok(project)
}

#[tauri::command]
pub async fn execute_processing_operation(
    input: ExecuteOperationInput,
) -> Result<CommandExecutionResponse, String> {
    let started = Utc::now();
    let command = create_processing_command(
        &input.ffmpeg_path,
        &input.input_base_dir,
        &input.output_base_dir,
        &input.operation,
    )
    .map_err(|e| e.to_string())?;

    let result = execute_ffmpeg_command(&command)
        .await
        .map_err(|e| e.to_string())?;

    Ok(CommandExecutionResponse {
        started_at: started.to_rfc3339(),
        ended_at: Utc::now().to_rfc3339(),
        success: result.success,
        exit_code: result.exit_code,
        command: command.binary,
        args: command.args,
        stdout: result.stdout,
        stderr: result.stderr,
    })
}

#[tauri::command]
pub async fn execute_export_operation(
    input: ExecuteExportInput,
) -> Result<CommandExecutionResponse, String> {
    let started = Utc::now();
    let command = create_export_command(
        &input.ffmpeg_path,
        &input.input_wav_path,
        &input.output_path,
        &input.preset,
    );

    let result = execute_ffmpeg_command(&command)
        .await
        .map_err(|e| e.to_string())?;

    Ok(CommandExecutionResponse {
        started_at: started.to_rfc3339(),
        ended_at: Utc::now().to_rfc3339(),
        success: result.success,
        exit_code: result.exit_code,
        command: command.binary,
        args: command.args,
        stdout: result.stdout,
        stderr: result.stderr,
    })
}

fn sanitize_filename(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return "track".to_string();
    }
    const FORBIDDEN: &[char] = &['\\', '/', ':', '*', '?', '"', '<', '>', '|', '\0'];
    let mut clean = String::new();
    for c in trimmed.chars() {
        if c.is_control() {
            continue;
        }
        if FORBIDDEN.contains(&c) {
            clean.push('_');
            continue;
        }
        if c.is_whitespace() {
            clean.push('_');
            continue;
        }
        clean.push(c);
    }
    let trimmed_clean: String = clean.trim_matches(|c: char| c == '.' || c == ' ').to_string();
    if trimmed_clean.is_empty() {
        "track".to_string()
    } else {
        trimmed_clean
    }
}

fn ensure_unique_base_name(base: &str, reserved_names: &mut HashSet<String>) -> String {
    let mut candidate = base.to_string();
    let mut index = 2u32;
    loop {
        let key = candidate.to_lowercase();
        if !reserved_names.contains(&key) {
            reserved_names.insert(key);
            return candidate;
        }
        candidate = format!("{base}_{index:02}");
        index += 1;
    }
}
