use crate::errors::AppError;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub command: String,
    pub arguments: Vec<String>,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

pub async fn run_process(command: &str, arguments: &[String]) -> Result<ProcessResult, AppError> {
    let output = Command::new(command)
        .args(arguments)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| AppError::ProcessFailure(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(ProcessResult {
        command: command.to_string(),
        arguments: arguments.to_vec(),
        exit_code: output.status.code(),
        stdout,
        stderr,
        success: output.status.success(),
    })
}
