-- Add category column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Allmänt';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
