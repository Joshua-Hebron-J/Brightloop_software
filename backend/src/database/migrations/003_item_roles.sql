ALTER TABLE subscription_items ADD COLUMN is_base INTEGER NOT NULL DEFAULT 0;
UPDATE subscription_items SET is_base=1 WHERE id IN (SELECT min(si.id) FROM subscription_items si GROUP BY si.subscription_id);
