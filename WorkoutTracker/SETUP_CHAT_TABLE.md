# Setup AI Chat Messages Table

## Quick Setup Instructions

1. **Go to your Supabase Dashboard**
   - Navigate to your project at https://app.supabase.com
   - Click on the "SQL Editor" in the left sidebar

2. **Run this SQL Query**
   Copy and paste this entire SQL code into the SQL editor and click "Run":

```sql
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
  
  -- Ensure unique message IDs per user
  CONSTRAINT unique_message_id UNIQUE (user_id, message_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created ON ai_chat_messages(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON ai_chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON ai_chat_messages;

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
```

3. **Verify the Table was Created**
   After running the query, you should see a success message. You can verify by:
   - Going to the "Table Editor" in the left sidebar
   - You should see `ai_chat_messages` in the list of tables

4. **Test in Your App**
   - Restart your app
   - Send a message to the AI trainer
   - Close and reopen the app
   - Your chat history should persist!

## Troubleshooting

If you get any errors:

1. **"relation already exists"** - The table is already created, you're good to go!

2. **Permission errors** - Make sure you're running the SQL as an admin user in the Supabase dashboard

3. **Messages still not persisting** - Check that:
   - Your user is properly authenticated
   - The RLS policies are enabled
   - Your Supabase connection is working

## What This Table Does

- Stores all AI chat messages for each user
- Keeps messages for 7 days (configurable in the app)
- Each user can only see their own messages (RLS)
- Supports text messages and workout plan cards
- Automatically timestamps all messages