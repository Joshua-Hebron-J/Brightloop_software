CREATE TABLE business_settings (id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL, address TEXT NOT NULL, state_code TEXT NOT NULL, gstin TEXT NOT NULL DEFAULT '', gst_enabled INTEGER NOT NULL DEFAULT 1);
INSERT INTO business_settings VALUES(1,'BillSync Demo Software','Demo office, Chennai, Tamil Nadu, India','33','DEMO-NOT-A-GSTIN',1);
ALTER TABLE invoices ADD COLUMN gst_snapshot TEXT;
ALTER TABLE quotes ADD COLUMN gst_snapshot TEXT;
ALTER TABLE tax_rules ADD COLUMN currency TEXT;
UPDATE tax_rules SET currency='USD';
ALTER TABLE discount_rules ADD COLUMN currency TEXT;
UPDATE discount_rules SET currency='USD';
