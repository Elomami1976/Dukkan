BEGIN IMMEDIATE;

CREATE TABLE app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO schema_migrations(version, applied_at) VALUES (5, datetime('now'));
COMMIT;
