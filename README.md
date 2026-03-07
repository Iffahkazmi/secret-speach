# SecretSpeak — Next.js 15 Rebuild

Chat with friends in your own secret language.

---

## Stack

- **Next.js 15** (App Router, Server Actions, Turbopack)
- **Auth.js v5** (Credentials provider — username/password stored in Supabase)
- **Supabase** (PostgreSQL DB + Realtime)
- **Tailwind CSS** (custom dark glowy design system)

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. From **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret!)

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Generate with: openssl rand -base64 32
AUTH_SECRET=your-random-secret

NEXTAUTH_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
  (auth)/auth/         → Login / signup page
  (app)/
    dashboard/         → Conversations list (server component)
    chat/[id]/         → Real-time chat room
    languages/         → Create & manage languages
  api/auth/[...nextauth]/  → Auth.js handler
actions/               → Server actions (all DB mutations)
components/
  chat/                → ChatRoom, ConversationsClient
  language/            → LanguagesClient
lib/
  auth.js              → Auth.js v5 config
  encoder.js           → Encode/decode engine
  supabase/            → Browser + server Supabase clients
supabase/
  schema.sql           → Run this in Supabase SQL Editor
middleware.js          → Protects /dashboard, /chat, /languages
```

---

## Key Design Decisions

### Why Auth.js instead of Supabase Auth?
Requested in the spec. Auth.js handles sessions via JWT cookies.
Passwords are hashed with bcrypt (cost factor 12) and stored in `profiles.password_hash`.
The `SUPABASE_SERVICE_ROLE_KEY` is only used in server actions — never exposed to the browser.

### Why service role for mutations?
All INSERT/UPDATE/DELETE goes through Next.js Server Actions using the service role client.
This eliminates the entire class of RLS policy bugs from the original app.
The client-side Supabase client is only used for real-time subscriptions (SELECT).

### Next.js 15 specifics
- `params` in page components is awaited (`const { id } = await params`)
- Default fetch cache is `no-store` — pages use `export const dynamic = 'force-dynamic'`
- Server Actions are stable (no experimental flag needed)

---

## Features

- **Secret language creation** — build languages from 8 transformation rules, stack them in order
- **Live encode preview** — see your message encoded as you type in the chat input
- **Decode toggle** — hover any message to reveal its original content
- **Invite codes** — share 6-character codes to let others join your language
- **Real-time chat** — messages appear instantly via Supabase Realtime
- **Rate limiting** — max 20 messages per minute, enforced server-side
