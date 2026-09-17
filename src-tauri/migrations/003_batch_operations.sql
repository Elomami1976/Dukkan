BEGIN IMMEDIATE;

CREATE TABLE inventory_losses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_minor INTEGER NOT NULL CHECK (unit_cost_minor >= 0),
  total_cost_minor INTEGER NOT NULL CHECK (total_cost_minor >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('expired', 'damaged')),
  reason TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE supplier_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER NOT NULL REFERENCES inventory_batches(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  purchase_id INTEGER NOT NULL REFERENCES purchases(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_minor INTEGER NOT NULL CHECK (unit_cost_minor >= 0),
  total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
  reason TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  reason TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_inventory_losses_date ON inventory_losses(created_at);
CREATE INDEX idx_supplier_returns_date ON supplier_returns(created_at);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);

INSERT INTO schema_migrations(version, applied_at) VALUES (3, datetime('now'));
COMMIT;
