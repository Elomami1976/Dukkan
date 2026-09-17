BEGIN IMMEDIATE;

DROP INDEX IF EXISTS idx_inventory_batches_lot;
CREATE INDEX idx_inventory_batches_lot ON inventory_batches(product_id, lot_number);
CREATE UNIQUE INDEX idx_inventory_batches_receipt ON inventory_batches(product_id, purchase_id, lot_number);

INSERT INTO schema_migrations(version, applied_at) VALUES (4, datetime('now'));
COMMIT;
