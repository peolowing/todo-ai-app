-- Add tags column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create GIN index for efficient tag searching
CREATE INDEX IF NOT EXISTS notes_tags_idx ON public.notes USING GIN(tags);
