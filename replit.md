# WB Отзывы (ReplAi) - Wildberries Review Management

## Overview
A Wildberries marketplace review management application with AI-powered reply generation. Built with React + Vite, using Supabase as the backend (auth, database, edge functions).

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (hosted) - PostgreSQL database, Auth, Edge Functions, Realtime
- **AI**: OpenRouter API (Gemini, GPT models) for review reply generation
- **Payments**: Robokassa integration for token purchases

## Key Features
- Review sync from Wildberries API
- AI-generated review replies (auto and manual modes)
- Chat management with WB buyers
- Multi-cabinet support (multiple WB seller accounts)
- AI analytics assistant for review analysis
- Token-based billing system
- Admin panel for user management

## Project Structure
```
src/
  components/       # React components
    ui/             # shadcn/ui primitives
    admin/          # Admin panel components
  contexts/         # React context (AuthContext)
  hooks/            # Custom React hooks
  integrations/     # Supabase client config
  lib/              # Utility functions
  pages/            # Route pages (Index, Auth, Admin, Pricing, PaymentReturn)
supabase/
  functions/        # Edge Functions (deployed on Supabase)
  migrations/       # Database migration SQL files
```

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

## Running
- Dev server: `npx vite --host 0.0.0.0 --port 5000`
- Build: `npx vite build`

## Supabase Edge Functions
The following edge functions are deployed on Supabase infrastructure:
- `sync-reviews` - Syncs reviews from WB API
- `sync-chats` - Syncs chats from WB API
- `send-reply` - Sends review replies to WB
- `send-chat-message` - Sends chat messages via WB
- `generate-reply` - Generates AI reply for a review
- `validate-api-key` - Validates WB API key
- `fetch-archive` - Fetches archived reviews
- `create-payment` - Creates Robokassa payment
- `robokassa-webhook` - Handles payment webhook
- `ai-assistant` - AI analytics chat
- `archive-old-reviews` - Auto-archives old reviews

## User Preferences
- Language: Russian (UI and content)
- Dark mode support via CSS variables
