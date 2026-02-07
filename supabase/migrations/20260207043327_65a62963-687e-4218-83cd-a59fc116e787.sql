
-- Create chats table
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text UNIQUE NOT NULL,
  reply_sign text,
  client_name text NOT NULL DEFAULT '',
  product_nm_id bigint,
  product_name text NOT NULL DEFAULT '',
  last_message_text text,
  last_message_at timestamptz,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL REFERENCES public.chats(chat_id) ON DELETE CASCADE,
  event_id text UNIQUE NOT NULL,
  sender text NOT NULL DEFAULT 'client',
  text text,
  attachments jsonb DEFAULT '[]'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast message lookup by chat
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_sent_at ON public.chat_messages(sent_at DESC);
CREATE INDEX idx_chats_last_message_at ON public.chats(last_message_at DESC);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chats (matching existing reviews pattern)
CREATE POLICY "Authenticated users can view chats"
  ON public.chats FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert chats"
  ON public.chats FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update chats"
  ON public.chats FOR UPDATE USING (true);

CREATE POLICY "Service role can manage chats"
  ON public.chats FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for chat_messages
CREATE POLICY "Authenticated users can view chat_messages"
  ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert chat_messages"
  ON public.chat_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can manage chat_messages"
  ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at on chats
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
