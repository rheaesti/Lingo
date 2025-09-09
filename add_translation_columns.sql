-- Add translation columns to messages table
-- Run this in your Supabase SQL editor

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS translated_content TEXT,
ADD COLUMN IF NOT EXISTS original_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS translated_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN messages.translated_content IS 'The translated message content (if translation occurred)';
COMMENT ON COLUMN messages.original_language IS 'The original language of the message';
COMMENT ON COLUMN messages.translated_language IS 'The language the message was translated to';
COMMENT ON COLUMN messages.is_translated IS 'Whether the message was translated';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('translated_content', 'original_language', 'translated_language', 'is_translated')
ORDER BY column_name;
