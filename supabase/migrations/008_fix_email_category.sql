-- Fix email tasks category from "Email" to "Emails"
UPDATE tasks
SET category = 'Emails'
WHERE category = 'Email';
