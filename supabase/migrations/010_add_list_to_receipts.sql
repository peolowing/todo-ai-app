-- Lägg till list_name kolumn i receipts tabellen
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS list_name TEXT;

-- Index för list_name
CREATE INDEX IF NOT EXISTS idx_receipts_list ON receipts(list_name);
