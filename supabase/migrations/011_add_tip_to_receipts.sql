-- Lägg till tip_amount kolumn i receipts tabellen för att hantera dricks
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2);

-- Lägg till kommentar för klarhet
COMMENT ON COLUMN receipts.tip_amount IS 'Dricksbelopp (vanligt på restaurangkvitton)';
