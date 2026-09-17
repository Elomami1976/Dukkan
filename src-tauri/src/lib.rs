use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("dukkan.sqlite3"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredState {
    revision: i64,
    state_json: String,
}

#[tauri::command]
fn initialize_database(app: tauri::AppHandle) -> Result<String, String> {
    let path = database_path(&app)?;
    let connection = Connection::open(&path).map_err(|e| e.to_string())?;
    connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;").map_err(|e| e.to_string())?;
    connection.execute_batch(include_str!("../migrations/001_initial.sql")).map_err(|e| e.to_string())?;
    connection.execute_batch("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);").map_err(|e| e.to_string())?;
    let batch_migration_applied = connection
        .query_row("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 2)", [], |row| row.get::<_, bool>(0))
        .map_err(|e| e.to_string())?;
    if !batch_migration_applied {
        connection.execute_batch(include_str!("../migrations/002_batches_and_expiry.sql")).map_err(|e| e.to_string())?;
    }
    let batch_operations_applied = connection
        .query_row("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 3)", [], |row| row.get::<_, bool>(0))
        .map_err(|e| e.to_string())?;
    if !batch_operations_applied {
        connection.execute_batch(include_str!("../migrations/003_batch_operations.sql")).map_err(|e| e.to_string())?;
    }
    let batch_receipts_applied = connection
        .query_row("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 4)", [], |row| row.get::<_, bool>(0))
        .map_err(|e| e.to_string())?;
    if !batch_receipts_applied {
        connection.execute_batch(include_str!("../migrations/004_batch_receipts.sql")).map_err(|e| e.to_string())?;
    }
    let local_state_applied = connection
        .query_row("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 5)", [], |row| row.get::<_, bool>(0))
        .map_err(|e| e.to_string())?;
    if !local_state_applied {
        connection.execute_batch(include_str!("../migrations/005_local_state.sql")).map_err(|e| e.to_string())?;
    }
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<StoredState>, String> {
    let connection = Connection::open(database_path(&app)?).map_err(|e| e.to_string())?;
    connection.query_row("SELECT revision, state_json FROM app_state WHERE id = 1", [], |row| Ok(StoredState { revision: row.get(0)?, state_json: row.get(1)? }))
        .optional().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, expected_revision: i64, revision: i64, state_json: String) -> Result<(), String> {
    if expected_revision < -1 || revision <= expected_revision { return Err("invalid state revision".into()); }
    serde_json::from_str::<serde_json::Value>(&state_json).map_err(|_| "invalid state json".to_string())?;
    let mut connection = Connection::open(database_path(&app)?).map_err(|e| e.to_string())?;
    let transaction = connection.transaction().map_err(|e| e.to_string())?;
    let current = transaction.query_row("SELECT revision FROM app_state WHERE id = 1", [], |row| row.get::<_, i64>(0)).optional().map_err(|e| e.to_string())?;
    if current.unwrap_or(-1) != expected_revision { return Err("state revision conflict".into()); }
    transaction.execute(
        "INSERT INTO app_state(id, revision, state_json, updated_at) VALUES(1, ?1, ?2, datetime('now')) ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, state_json = excluded.state_json, updated_at = excluded.updated_at",
        params![revision, state_json],
    ).map_err(|e| e.to_string())?;
    transaction.commit().map_err(|e| e.to_string())
}

#[tauri::command]
fn local_database_location(app: tauri::AppHandle) -> Result<String, String> { Ok(database_path(&app)?.to_string_lossy().into_owned()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![initialize_database, local_database_location, load_app_state, save_app_state])
        .setup(|app| initialize_database(app.handle().clone()).map(|_| ()).map_err(|e| std::io::Error::other(e).into()))
        .run(tauri::generate_context!())
        .expect("error while running Dukkan");
}
