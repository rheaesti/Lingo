-- Add delivered_to_recipient column to messages table
ALTER TABLE messages 
ADD COLUMN delivered_to_recipient BOOLEAN DEFAULT FALSE;

-- Update existing messages to be marked as delivered (since they were already seen)
UPDATE messages 
SET delivered_to_recipient = TRUE 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Create index for better performance
CREATE INDEX idx_messages_delivered_recipient ON messages(delivered_to_recipient);
CREATE INDEX idx_messages_room_delivered ON messages(chat_room_id, delivered_to_recipient);
