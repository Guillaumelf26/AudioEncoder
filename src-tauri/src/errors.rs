use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Chemin invalide: {0}")]
    InvalidPath(String),
    #[error("Echec exécution processus: {0}")]
    ProcessFailure(String),
    #[error("Fichier introuvable: {0}")]
    MissingFile(String),
    #[error("JSON invalide: {0}")]
    InvalidJson(String),
    #[error("Validation échouée: {0}")]
    Validation(String),
    #[error("Erreur interne: {0}")]
    Internal(String),
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::Internal(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::InvalidJson(value.to_string())
    }
}
