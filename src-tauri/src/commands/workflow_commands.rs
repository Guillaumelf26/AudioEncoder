use crate::audio_engine::service::{
    create_export_command, create_processing_command, execute_ffmpeg_command,
};
use crate::domain::{ExportPreset, ProcessingOperation, TemplatesBundle};
use crate::storage::templates_repository;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
    templates_repository::save_templates(&bundle, PathBuf::from(templates_file_path).as_path())
        .map_err(|e| e.to_string())
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
