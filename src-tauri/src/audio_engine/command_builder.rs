use crate::audio_engine::models::FFmpegCommand;
use crate::domain::{ExportFormat, ExportPreset, ProcessingOperation};
use crate::errors::AppError;

pub fn build_processing_command(
    ffmpeg_bin: &str,
    input_base_dir: &str,
    output_base_dir: &str,
    operation: &ProcessingOperation,
) -> Result<FFmpegCommand, AppError> {
    match operation {
        ProcessingOperation::MergeToStereo {
            input_left_track_id,
            input_right_track_id,
            output_file_name,
        } => Ok(FFmpegCommand {
            binary: ffmpeg_bin.to_string(),
            args: vec![
                "-y".to_string(),
                "-i".to_string(),
                format!("{input_base_dir}/{input_left_track_id}.wav"),
                "-i".to_string(),
                format!("{input_base_dir}/{input_right_track_id}.wav"),
                "-filter_complex".to_string(),
                "[0:a][1:a]join=inputs=2:channel_layout=stereo".to_string(),
                "-c:a".to_string(),
                "pcm_s24le".to_string(),
                format!("{output_base_dir}/{output_file_name}"),
            ],
            description: "Fusionner deux pistes mono en stereo".to_string(),
            step_name: "processing:mergeStereo".to_string(),
        }),
        ProcessingOperation::MergeToMonoBus {
            input_track_ids,
            output_file_name,
        } => {
            if input_track_ids.is_empty() {
                return Err(AppError::Validation(
                    "MergeToMonoBus requiert au moins une piste".to_string(),
                ));
            }

            let mut args = vec!["-y".to_string()];
            for track in input_track_ids {
                args.push("-i".to_string());
                args.push(format!("{input_base_dir}/{track}.wav"));
            }

            let mut mix_inputs = String::new();
            for index in 0..input_track_ids.len() {
                mix_inputs.push_str(&format!("[{index}:a]"));
            }
            mix_inputs.push_str(&format!("amix=inputs={}:normalize=0", input_track_ids.len()));

            args.push("-filter_complex".to_string());
            args.push(mix_inputs);
            args.push("-c:a".to_string());
            args.push("pcm_s24le".to_string());
            args.push(format!("{output_base_dir}/{output_file_name}"));

            Ok(FFmpegCommand {
                binary: ffmpeg_bin.to_string(),
                args,
                description: "Mixer plusieurs pistes mono en bus mono".to_string(),
                step_name: "processing:mergeBusMono".to_string(),
            })
        }
        ProcessingOperation::Pan {
            input_track_id,
            position,
            output_file_name,
        } => {
            let p = position.clamp(-1.0, 1.0);
            let left_gain = ((1.0 - p) / 2.0) + 0.5;
            let right_gain = ((1.0 + p) / 2.0) + 0.5;
            let filter = format!("pan=stereo|c0={left_gain:.3}*c0|c1={right_gain:.3}*c0");

            Ok(FFmpegCommand {
                binary: ffmpeg_bin.to_string(),
                args: vec![
                    "-y".to_string(),
                    "-i".to_string(),
                    format!("{input_base_dir}/{input_track_id}.wav"),
                    "-af".to_string(),
                    filter,
                    "-c:a".to_string(),
                    "pcm_s24le".to_string(),
                    format!("{output_base_dir}/{output_file_name}"),
                ],
                description: "Appliquer un panoramique".to_string(),
                step_name: "processing:pan".to_string(),
            })
        }
        ProcessingOperation::Gain {
            input_track_id,
            gain_db,
            output_file_name,
        } => Ok(FFmpegCommand {
            binary: ffmpeg_bin.to_string(),
            args: vec![
                "-y".to_string(),
                "-i".to_string(),
                format!("{input_base_dir}/{input_track_id}.wav"),
                "-af".to_string(),
                format!("volume={gain_db:+}dB"),
                "-c:a".to_string(),
                "pcm_s24le".to_string(),
                format!("{output_base_dir}/{output_file_name}"),
            ],
            description: "Appliquer un gain".to_string(),
            step_name: "processing:gain".to_string(),
        }),
        ProcessingOperation::ReverbSimple {
            input_track_id,
            output_file_name,
            delay_ms,
            decay,
        } => Ok(FFmpegCommand {
            binary: ffmpeg_bin.to_string(),
            args: vec![
                "-y".to_string(),
                "-i".to_string(),
                format!("{input_base_dir}/{input_track_id}.wav"),
                "-af".to_string(),
                format!("aecho=0.8:0.9:{delay_ms}:{decay}"),
                "-c:a".to_string(),
                "pcm_s24le".to_string(),
                format!("{output_base_dir}/{output_file_name}"),
            ],
            description: "Appliquer une reverb simple".to_string(),
            step_name: "processing:reverbSimple".to_string(),
        }),
        ProcessingOperation::FutureCompression { .. } => Err(AppError::Validation(
            "Compression non implémentée dans le MVP".to_string(),
        )),
        ProcessingOperation::FutureNormalize { .. } => Err(AppError::Validation(
            "Normalisation non implémentée dans le MVP".to_string(),
        )),
    }
}

pub fn build_export_command(
    ffmpeg_bin: &str,
    input_wav_path: &str,
    output_path: &str,
    preset: &ExportPreset,
) -> FFmpegCommand {
    let mut args = vec!["-y".to_string(), "-i".to_string(), input_wav_path.to_string()];

    match preset.format {
        ExportFormat::Wav => {
            args.push("-c:a".to_string());
            args.push("pcm_s24le".to_string());
        }
        ExportFormat::Mp3 => {
            args.push("-c:a".to_string());
            args.push("libmp3lame".to_string());
            if let Some(vbr) = preset.quality_vbr {
                args.push("-q:a".to_string());
                args.push(vbr.to_string());
            } else if let Some(bitrate) = preset.bitrate_kbps {
                args.push("-b:a".to_string());
                args.push(format!("{bitrate}k"));
            }
        }
        ExportFormat::AacM4a => {
            args.push("-c:a".to_string());
            args.push("aac".to_string());
            if let Some(bitrate) = preset.bitrate_kbps {
                args.push("-b:a".to_string());
                args.push(format!("{bitrate}k"));
            }
        }
    }

    if let Some(sr) = preset.sample_rate_hz {
        args.push("-ar".to_string());
        args.push(sr.to_string());
    }

    if let Some(channels) = preset.channels {
        args.push("-ac".to_string());
        args.push(channels.to_string());
    }

    args.push(output_path.to_string());

    FFmpegCommand {
        binary: ffmpeg_bin.to_string(),
        args,
        description: "Encoder un fichier de sortie".to_string(),
        step_name: "export:encode".to_string(),
    }
}
