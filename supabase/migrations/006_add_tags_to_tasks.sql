-- Add tags column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create GIN index for efficient tag searching
CREATE INDEX IF NOT EXISTS tasks_tags_idx ON public.tasks USING GIN(tags);
