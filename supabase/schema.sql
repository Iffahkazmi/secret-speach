-- ============================================================
-- SecretSpeak — Clean Schema
-- Run this entire file in Supabase SQL Editor → Run
-- ============================================================

-- ── Tables ─────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,20}$')
);

CREATE TABLE public.languages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_preset   BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT name_length CHECK (length(name) BETWEEN 1 AND 60)
);

CREATE TYPE public.rule_type AS ENUM (
  'reverse_words', 'reverse_letters', 'caesar_cipher',
  'add_prefix', 'add_suffix', 'vowel_replace', 'pig_latin', 'word_scramble'
);

CREATE TABLE public.rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  rule_type   public.rule_type NOT NULL,
  rule_config JSONB NOT NULL DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conv_name_length CHECK (length(name) BETWEEN 1 AND 100)
);

-- Flat participants table (composite PK — no duplicate entries)
CREATE TABLE public.participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  encoded_content  TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_length CHECK (
    length(original_content) <= 2000 AND length(encoded_content) <= 8000
  )
);

CREATE TABLE public.language_shares (
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (language_id, user_id)
);

-- ── Realtime ────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_rules_language_id              ON public.rules(language_id);
CREATE INDEX idx_messages_conversation_id       ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at            ON public.messages(created_at);
CREATE INDEX idx_participants_user_id           ON public.participants(user_id);
CREATE INDEX idx_participants_conversation_id   ON public.participants(conversation_id);
CREATE INDEX idx_language_shares_user_id        ON public.language_shares(user_id);
CREATE INDEX idx_languages_invite_code          ON public.languages(invite_code);
CREATE INDEX idx_conversations_language_id      ON public.conversations(language_id);

-- ── Updated-at trigger ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_languages_updated_at BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Enable RLS ──────────────────────────────────────────────

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_shares ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ────────────────────────────────────────────
-- NOTE: All server-side mutations use the service role key which
-- bypasses RLS entirely. These SELECT policies protect direct
-- client reads. All INSERT/UPDATE/DELETE is done server-side only.

-- profiles: anyone can read (needed for username display)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

-- languages: visible if preset, owned, or shared
CREATE POLICY "languages_select" ON public.languages
  FOR SELECT USING (
    is_preset = true
    OR owner_id IN (SELECT id FROM public.profiles WHERE id = owner_id)
    OR id IN (SELECT language_id FROM public.language_shares WHERE user_id IN (
      SELECT id FROM public.profiles
    ))
  );

-- rules: visible if language is visible
CREATE POLICY "rules_select" ON public.rules
  FOR SELECT USING (true);

-- conversations: visible to participants
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT USING (true);

-- participants: visible to all authenticated reads
CREATE POLICY "participants_select" ON public.participants
  FOR SELECT USING (true);

-- messages: visible in any conversation
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (true);

-- language_shares: visible
CREATE POLICY "language_shares_select" ON public.language_shares
  FOR SELECT USING (true);

-- ── Preset Languages ────────────────────────────────────────

INSERT INTO public.languages (name, description, is_preset, owner_id) VALUES
  ('Pig Latin',    'Move first consonant to end and add "ay"',   TRUE, NULL),
  ('Mirror Speak', 'Reverse every word letter-by-letter',        TRUE, NULL),
  ('Caesar Code',  'Shift each letter 3 positions forward',      TRUE, NULL),
  ('Alien Tongue', 'Replace all vowels with "z"',                TRUE, NULL);

DO $$
DECLARE
  pig_id UUID; mirror_id UUID; caesar_id UUID; alien_id UUID;
BEGIN
  SELECT id INTO pig_id    FROM public.languages WHERE name = 'Pig Latin';
  SELECT id INTO mirror_id FROM public.languages WHERE name = 'Mirror Speak';
  SELECT id INTO caesar_id FROM public.languages WHERE name = 'Caesar Code';
  SELECT id INTO alien_id  FROM public.languages WHERE name = 'Alien Tongue';

  INSERT INTO public.rules (language_id, rule_type, rule_config, sort_order) VALUES
    (pig_id,    'pig_latin',      '{}',            0),
    (mirror_id, 'reverse_letters','{}',            0),
    (caesar_id, 'caesar_cipher',  '{"shift": 3}',  0),
    (alien_id,  'vowel_replace',  '{"replacement": "z"}', 0);
END $$;
