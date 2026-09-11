use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("dukkan.sqlite3"))
}

#[tauri::command]
fn initialize_database(app: tauri::AppHandle) -> Result<String, String> {
    let path = database_path(&app)?;
    let connection = Connection::open(&path).map_err(|e| e.to_string())?;
    connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;").map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn local_database_location(app: tauri::AppHandle) -> Result<String, String> { Ok(database_path(&app)?.to_string_lossy().into_owned()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![initialize_database, local_database_location])
        .setup(|app| initialize_database(app.handle().clone()).map(|_| ()).map_err(|e| std::io::Error::other(e).into()))
        .run(tauri::generate_context!())
        .expect("error while running Dukkan");
}
