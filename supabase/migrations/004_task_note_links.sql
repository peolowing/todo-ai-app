-- Create junction table for many-to-many relationship between tasks and notes
CREATE TABLE task_note_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Prevent duplicate links
  UNIQUE(task_id, note_id)
);

-- Indexes for performance
CREATE INDEX idx_task_note_links_task_id ON task_note_links(task_id);
CREATE INDEX idx_task_note_links_note_id ON task_note_links(note_id);
CREATE INDEX idx_task_note_links_user_id ON task_note_links(user_id);

-- RLS policies
ALTER TABLE task_note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task-note links"
  ON task_note_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task-note links"
  ON task_note_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task-note links"
  ON task_note_links FOR DELETE
  USING (auth.uid() = user_id);
