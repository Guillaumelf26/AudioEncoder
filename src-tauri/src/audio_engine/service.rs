use crate::audio_engine::command_builder::{build_export_command, build_processing_command};
use crate::audio_engine::models::FFmpegCommand;
use crate::domain::{ExportPreset, ProcessingOperation};
use crate::errors::AppError;
use crate::process_runner::runner::{run_process, ProcessResult};

pub async fn execute_ffmpeg_command(command: &FFmpegCommand) -> Result<ProcessResult, AppError> {
    run_process(&command.binary, &command.args).await
}

pub fn create_processing_command(
    ffmpeg_bin: &str,
    input_base_dir: &str,
    output_base_dir: &str,
    operation: &ProcessingOperation,
) -> Result<FFmpegCommand, AppError> {
    build_processing_command(ffmpeg_bin, input_base_dir, output_base_dir, operation)
}

pub fn create_export_command(
    ffmpeg_bin: &str,
    input_wav_path: &str,
    output_path: &str,
    preset: &ExportPreset,
) -> FFmpegCommand {
    build_export_command(ffmpeg_bin, input_wav_path, output_path, preset)
}
