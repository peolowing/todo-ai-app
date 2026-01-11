# Lägg till kategori-funktionen

För att aktivera kategori-funktionen, kör följande SQL i Supabase SQL Editor:

```sql
-- Add category column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS category text DEFAULT 'Allmänt';

-- Create index for category
CREATE INDEX IF NOT EXISTS notes_category_idx ON public.notes(category);
```

## Steg:

1. Gå till din Supabase dashboard: https://supabase.com/dashboard
2. Välj ditt projekt
3. Gå till "SQL Editor" i menyn
4. Klicka "New query"
5. Klistra in SQL-koden ovan
6. Klicka "Run"

Efter detta kommer kategorifunktionen att fungera!
