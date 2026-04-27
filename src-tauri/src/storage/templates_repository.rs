use crate::domain::TemplatesBundle;
use crate::errors::AppError;
use std::fs;
use std::path::Path;

pub fn save_templates(bundle: &TemplatesBundle, path: &Path) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(bundle)?;
    fs::write(path, content)?;
    Ok(())
}

pub fn load_templates(path: &Path) -> Result<TemplatesBundle, AppError> {
    if !path.exists() {
        return Ok(TemplatesBundle {
            workflows: Vec::new(),
            renaming: Vec::new(),
            processing: Vec::new(),
            export: Vec::new(),
        });
    }
    let content = fs::read_to_string(path)?;
    let bundle = serde_json::from_str::<TemplatesBundle>(&content)?;
    Ok(bundle)
}
