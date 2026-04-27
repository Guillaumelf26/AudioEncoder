#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio_engine;
mod commands;
mod domain;
mod errors;
mod media_probe;
mod process_runner;
mod storage;
mod validation;

use commands::project_commands::{
    analyze_source_files, check_toolchain, create_project, load_project, save_project,
};
use commands::workflow_commands::{
    execute_export_operation, execute_processing_operation, load_templates, save_templates,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            check_toolchain,
            create_project,
            load_project,
            save_project,
            analyze_source_files,
            load_templates,
            save_templates,
            execute_processing_operation,
            execute_export_operation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
