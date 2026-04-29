use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FFmpegCommand {
    pub binary: String,
    pub args: Vec<String>,
    pub description: String,
    pub step_name: String,
}
