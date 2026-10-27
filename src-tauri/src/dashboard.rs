//! Native session gate for read-only analytics. Uses the existing PBKDF2 credential format.
use pbkdf2::pbkdf2_hmac;
use rusqlite::Connection;
use serde_json::Value;
use sha2::Sha256;
use std::sync::Mutex;

#[derive(Default)]
pub struct DashboardSession(pub Mutex<Option<(String, String)>>);

fn snapshot(connection: &Connection) -> Result<Value, String> {
    let json: String = connection
        .query_row("SELECT state_json FROM app_state WHERE id = 1", [], |r| {
            r.get(0)
        })
        .map_err(|_| "تعذر قراءة بيانات النشاط".to_string())?;
    serde_json::from_str(&json).map_err(|_| "بيانات النشاط غير صالحة".to_string())
}
fn password_matches(password: &str, user: &Value) -> bool {
    let Some(salt) = user["salt"].as_str() else {
        return false;
    };
    let Some(hash) = user["hash"].as_str() else {
        return false;
    };
    if salt.len() != 32 || hash.len() != 64 {
        return false;
    }
    let mut derived = [0u8; 32];
    // The established WebCrypto implementation uses the UTF-8 hex salt, not decoded salt bytes.
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt.as_bytes(), 600_000, &mut derived);
    let actual: String = derived.iter().map(|b| format!("{b:02x}")).collect();
    actual
        .bytes()
        .zip(hash.bytes())
        .fold(0u8, |diff, (a, b)| diff | (a ^ b))
        == 0
}
pub fn authenticate(
    connection: &Connection,
    session: &DashboardSession,
    username: &str,
    password: &str,
) -> Result<(), String> {
    *session.0.lock().map_err(|_| "تعذر فتح الجلسة")? = None;
    let data = snapshot(connection)?;
    let user = data["users"]
        .as_array()
        .and_then(|users| {
            users.iter().find(|u| {
                u["username"]
                    .as_str()
                    .is_some_and(|name| name.to_lowercase() == username.trim().to_lowercase())
                    && u["active"] == true
            })
        })
        .ok_or("اسم المستخدم أو كلمة المرور غير صحيحة")?;
    if !password_matches(password, user) {
        return Err("اسم المستخدم أو كلمة المرور غير صحيحة".into());
    }
    *session.0.lock().map_err(|_| "تعذر فتح الجلسة")? = Some((
        user["id"].as_str().ok_or("حساب غير صالح")?.into(),
        user["hash"].as_str().ok_or("حساب غير صالح")?.into(),
    ));
    Ok(())
}
pub fn read(connection: &Connection, session: &DashboardSession) -> Result<Value, String> {
    let mut data = snapshot(connection)?;
    {
        let guard = session.0.lock().map_err(|_| "تعذر قراءة الجلسة")?;
        let (id, hash) = guard.as_ref().ok_or("لوحة التحليلات متاحة للمدير فقط")?;
        if !data["users"].as_array().is_some_and(|users| {
            users.iter().any(|u| {
                u["id"] == *id && u["hash"] == *hash && u["active"] == true && u["role"] == "admin"
            })
        }) {
            return Err("لوحة التحليلات متاحة للمدير فقط".into());
        }
    }
    data["users"] = serde_json::json!([]);
    Ok(data)
}

#[tauri::command]
pub fn dashboard_login(
    app: tauri::AppHandle,
    session: tauri::State<DashboardSession>,
    username: String,
    password: String,
) -> Result<(), String> {
    let connection = Connection::open(super::database_path(&app)?)
        .map_err(|_| "تعذر فتح قاعدة بيانات النشاط".to_string())?;
    authenticate(&connection, &session, &username, &password)
}
#[tauri::command]
pub fn dashboard_logout(session: tauri::State<DashboardSession>) -> Result<(), String> {
    *session.0.lock().map_err(|_| "تعذر إغلاق الجلسة")? = None;
    Ok(())
}
#[tauri::command]
pub fn dashboard_snapshot(
    app: tauri::AppHandle,
    session: tauri::State<DashboardSession>,
) -> Result<Value, String> {
    let connection = Connection::open(super::database_path(&app)?)
        .map_err(|_| "تعذر فتح قاعدة بيانات النشاط".to_string())?;
    read(&connection, &session)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn verifies_existing_webcrypto_credential_format() {
        // Independently generated with Node crypto.pbkdf2Sync, matching existing WebCrypto.
        let salt = "0123456789abcdef0123456789abcdef";
        let hash = "85e8ee46e56767cef2e56d9b6b43d498d3a8a2b24c72e94a91ec6419dfaa45fa";
        let u = serde_json::json!({"salt":salt,"hash":hash});
        assert!(password_matches("test-password", &u));
        assert!(!password_matches("wrong", &u));
    }
    #[test]
    fn rejects_missing_cashier_disabled_and_stale_sessions() {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch("CREATE TABLE app_state(id INTEGER PRIMARY KEY, state_json TEXT);")
            .unwrap();
        let data = serde_json::json!({"users":[{"id":"u", "hash":"h", "role":"cashier", "active":true}],"sales":[{"total":1234}]});
        c.execute("INSERT INTO app_state VALUES(1, ?1)", [data.to_string()])
            .unwrap();
        let session = DashboardSession::default();
        assert!(read(&c, &session).is_err());
        *session.0.lock().unwrap() = Some(("u".into(), "h".into()));
        assert!(read(&c, &session).is_err());
        let mut data = data;
        data["users"][0]["role"] = "admin".into();
        c.execute("UPDATE app_state SET state_json=?1", [data.to_string()])
            .unwrap();
        let result = read(&c, &session).unwrap();
        assert_eq!(result["users"], serde_json::json!([]));
        assert_eq!(result["sales"][0]["total"], 1234);
        data["users"][0]["active"] = false.into();
        c.execute("UPDATE app_state SET state_json=?1", [data.to_string()])
            .unwrap();
        assert!(read(&c, &session).is_err());
        data["users"][0]["active"] = true.into();
        data["users"][0]["hash"] = "changed".into();
        c.execute("UPDATE app_state SET state_json=?1", [data.to_string()])
            .unwrap();
        assert!(read(&c, &session).is_err());
    }
}
