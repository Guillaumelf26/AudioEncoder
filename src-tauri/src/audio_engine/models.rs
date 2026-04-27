use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FFmpegCommand {
    pub binary: String,
    pub args: Vec<String>,
    pub description: String,
    pub step_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ProcessingOperationKind {
    MergeStereo,
    MergeBusMono,
    Pan,
    Gain,
    ReverbSimple,
    FutureCompression,
    FutureNormalize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandLog {
    pub timestamp_iso: String,
    pub level: String,
    pub message: String,
}
