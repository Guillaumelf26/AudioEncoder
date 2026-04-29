use crate::errors::AppError;
use crate::process_runner::runner::run_process;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeAudioStream {
    pub codec_name: Option<String>,
    pub channels: Option<u16>,
    pub sample_rate: Option<String>,
    pub bits_per_sample: Option<u16>,
    pub bits_per_raw_sample: Option<String>,
    pub channel_layout: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeFormat {
    pub duration: Option<String>,
    pub size: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeResponse {
    pub streams: Vec<ProbeAudioStream>,
    pub format: ProbeFormat,
}

pub async fn probe_audio(file_path: &str, ffprobe_path: &str) -> Result<ProbeResponse, AppError> {
    let args = vec![
        "-v".to_string(),
        "error".to_string(),
        "-print_format".to_string(),
        "json".to_string(),
        "-show_format".to_string(),
        "-show_streams".to_string(),
        file_path.to_string(),
    ];

    let result = run_process(ffprobe_path, &args).await?;
    if !result.success {
        return Err(AppError::ProcessFailure(result.stderr));
    }

    serde_json::from_str::<ProbeResponse>(&result.stdout)
        .map_err(|err| AppError::InvalidJson(err.to_string()))
}
