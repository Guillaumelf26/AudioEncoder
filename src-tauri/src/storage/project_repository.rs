use crate::domain::Project;
use crate::errors::AppError;
use std::fs;
use std::path::Path;

pub fn save_project(project: &Project, path: &Path) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(project)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn load_project(path: &Path) -> Result<Project, AppError> {
    if !path.exists() {
        return Err(AppError::MissingFile(path.display().to_string()));
    }
    let content = fs::read_to_string(path)?;
    let project = serde_json::from_str::<Project>(&content)?;
    Ok(project)
}
