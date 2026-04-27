use crate::domain::{ProcessingTemplate, RenameTemplate};
use crate::errors::AppError;

pub fn validate_rename_template(template: &RenameTemplate) -> Result<(), AppError> {
    if template.name.trim().is_empty() {
        return Err(AppError::Validation(
            "Le nom du template de renommage est obligatoire".to_string(),
        ));
    }

    for rule in &template.map {
        if rule.source_label.trim().is_empty() || rule.target_label.trim().is_empty() {
            return Err(AppError::Validation(
                "Chaque règle de mapping doit avoir source et cible".to_string(),
            ));
        }
    }

    Ok(())
}

pub fn validate_processing_template(template: &ProcessingTemplate) -> Result<(), AppError> {
    if template.name.trim().is_empty() {
        return Err(AppError::Validation(
            "Le nom du template de traitement est obligatoire".to_string(),
        ));
    }
    if template.operations.is_empty() {
        return Err(AppError::Validation(
            "Le template de traitement doit contenir au moins une opération".to_string(),
        ));
    }

    Ok(())
}
