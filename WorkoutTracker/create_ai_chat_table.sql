-- Create table for AI chat messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  sender TEXT CHECK (sender IN ('user', 'ai')) NOT NULL,
  message_type TEXT DEFAULT 'text',
  message_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Indexes for performance
  CONSTRAINT unique_message_id UNIQUE (user_id, message_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created ON ai_chat_messages(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own chat messages" 
  ON ai_chat_messages FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" 
  ON ai_chat_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" 
  ON ai_chat_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE ai_chat_messages IS 'Stores AI trainer chat history for each user';