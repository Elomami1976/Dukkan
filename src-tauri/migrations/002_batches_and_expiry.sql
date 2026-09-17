BEGIN IMMEDIATE;

ALTER TABLE products ADD COLUMN track_batches INTEGER NOT NULL DEFAULT 0 CHECK (track_batches IN (0, 1));
ALTER TABLE products ADD COLUMN track_expiry INTEGER NOT NULL DEFAULT 0 CHECK (track_expiry IN (0, 1));
ALTER TABLE products ADD COLUMN expiry_warning_days INTEGER NOT NULL DEFAULT 30 CHECK (expiry_warning_days >= 0);

CREATE TABLE inventory_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES product_variants(id),
  lot_number TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  production_date TEXT,
  expiry_date TEXT,
  unit_cost_minor INTEGER NOT NULL CHECK (unit_cost_minor >= 0),
  supplier_id INTEGER REFERENCES suppliers(id),
  purchase_id INTEGER REFERENCES purchases(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE inventory_transactions ADD COLUMN batch_id INTEGER REFERENCES inventory_batches(id);
ALTER TABLE sale_items ADD COLUMN batch_allocations_json TEXT;
ALTER TABLE purchase_items ADD COLUMN batch_id INTEGER REFERENCES inventory_batches(id);

CREATE INDEX idx_inventory_batches_product ON inventory_batches(product_id, variant_id);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE UNIQUE INDEX idx_inventory_batches_lot ON inventory_batches(product_id, ifnull(variant_id, 0), lot_number);
CREATE INDEX idx_inventory_transactions_batch ON inventory_transactions(batch_id);

INSERT INTO schema_migrations(version, applied_at) VALUES (2, datetime('now'));
COMMIT;
