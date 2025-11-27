-- Add the nullable subject column expected by the messaging module/tests.
ALTER TABLE "Conversation"
ADD COLUMN IF NOT EXISTS "subject" TEXT;

