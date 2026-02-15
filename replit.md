# WB Отзывы (ReplAi) - Wildberries Review Management

## Overview
A Wildberries marketplace review management application with AI-powered reply generation. Built with React + Vite frontend and Express + Drizzle ORM backend. Uses Supabase for authentication only, with all data stored in an external PostgreSQL database.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + Drizzle ORM (TypeScript)
- **Database**: External PostgreSQL (85.193.81.180, database: default_db, schema: replai)
- **Auth**: Supabase (email + password, session management only - no data operations)
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
server/
  index.ts            # Express server entry point
  db.ts               # Drizzle ORM database connection
  storage.ts          # DatabaseStorage class (50+ methods)
  routes.ts           # Express API routes
  vite.ts             # Vite dev server integration
shared/
  schema.ts           # Drizzle schema (replai schema, 14 tables)
src/
  components/         # React components
    ui/               # shadcn/ui primitives
    admin/            # Admin panel components
  contexts/           # React context (AuthContext - Supabase auth)
  hooks/              # Custom React hooks (all use server API)
  integrations/       # Supabase client config (auth only)
  lib/
    api.ts            # API helper with auth token injection
    fetchAllRows.ts   # Export data helper
    exportCsv.ts      # CSV export utilities
    queryClient.ts    # TanStack Query client
  pages/              # Route pages (Index, Auth, Admin, Pricing, PaymentReturn)
supabase/
  functions/          # Original Edge Functions (reference, not deployed)
```

## Authentication Flow
1. Frontend uses Supabase auth (email + password) for login/signup
2. Frontend gets JWT access token from Supabase session
3. All API requests include `Authorization: Bearer <token>` header
4. Server decodes JWT payload to extract user ID (`sub` field)
5. Server uses user ID for all database queries (data isolation)

## API Routes
All data operations go through Express API:
- `GET/PATCH /api/reviews` - Review CRUD
- `GET/PATCH /api/chats` - Chat operations
- `GET/POST/PATCH/DELETE /api/cabinets` - WB cabinet management
- `GET/PATCH /api/settings` - User settings
- `GET /api/balance/tokens|ai` - Balance queries
- `GET/POST /api/conversations` - AI conversation management
- `GET/POST /api/ai-messages` - AI message history
- `GET/POST/DELETE /api/recommendations` - Product recommendations
- `POST /api/functions/*` - Business logic (sync, send, generate)
- `GET/POST /api/admin/*` - Admin operations

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL (auth only)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (auth only)
- `DATABASE_URL` - External PostgreSQL connection string (replai schema)

## Running
- Dev server: `npx tsx server/index.ts` (serves both API and Vite frontend on port 5000)

## Business Logic Endpoints (server/functions.ts)
All business logic is fully ported from Supabase Edge Functions to Express:
- `POST /api/functions/sync-reviews` - Syncs reviews from WB API + auto-replies via OpenRouter AI
- `POST /api/functions/sync-chats` - Syncs chats and messages from WB API
- `POST /api/functions/send-reply` - Sends review reply to WB + deducts token
- `POST /api/functions/generate-reply` - Generates AI draft via OpenRouter (supports photos, recommendations, refusal detection)
- `POST /api/functions/validate-api-key` - Validates WB API key + saves + triggers archive import
- `POST /api/functions/send-chat-message` - Sends chat message via WB API
- `POST /api/functions/ai-assistant` - Streaming AI analytics with RAG context from reviews
- `POST /api/functions/create-payment` - Creates Robokassa payment URL
- `POST /api/functions/robokassa-webhook` - Handles Robokassa payment callback (no auth)
- `POST /api/functions/fetch-archive` - Imports archived (answered) reviews from WB

## Telegram Bot (server/telegram.ts)
- Uses TELEGRAM_BOT_TOKEN secret, gracefully skips init if not set
- Long polling via node-telegram-bot-api
- /start with auth_TOKEN payload: validates token, links chat_id to cabinet
- Auth tokens expire in 10 minutes, one-time use (stored in telegram_auth_tokens table)
- sendAutoReplyNotification: enhanced format with rating emoji, article, shouldNotify filtering
- sendNewReviewNotification: rich format with rating emoji, article, pros/cons, AI insight, photo support (sendPhoto), URL button for chat
- Settings menu: /start sends inline keyboard with notification type (all/negative/questions) + reply mode (manual/auto/drafts)
- Bot commands (setMyCommands): /start, /shops, /stats, /balance, /mode, /settings
- /shops: lists all connected WB cabinets with status, last sync date, reply modes
- /stats: today's review statistics (total/answered/pending, avg rating, distribution bars)
- /balance: token balance with "Пополнить" button linking to pricing page
- /mode: current reply modes with inline button to launch step-by-step configuration
- /settings command: reconfigure notification preferences
- Callback handlers: gen_REVIEWID generates AI draft, pub_REVIEWID sends to WB + deducts token, edit_REVIEWID enters edit mode (pendingEdits Map), regen_REVIEWID regenerates, cancel_edit_REVIEWID cancels edit
- Photo handling: reviews with photos sent via sendPhoto, edits use editMessageCaption; text reviews use sendMessage/editMessageText
- Duplicate protection: keyboard removed after publish
- shouldNotify(cabinet, rating, text): filters notifications based on tgNotifyType preference
- Schema fields: tgNotifyType (all/negative/questions) on wbCabinets
- Reply modes: configured via replyModes JSON on wbCabinets (per-rating: {"1":"manual",...,"5":"auto"}), editable from bot via step-by-step flow (rmcfg_start/rmset callbacks)
- API routes: POST /api/functions/telegram-link, POST /api/functions/telegram-unlink
- Frontend: SettingsDialog has collapsible Telegram section with connect/disconnect UI

## Recent Changes
- 2026-02-15: Fixed race condition in ensureUserProvisioned (duplicate cabinet prevention via provisioningInProgress map)
- 2026-02-15: Cleaned up duplicate empty cabinets from DB; fixed auth docs (email+password, not phone OTP)
- 2026-02-15: Landing page on Auth.tsx: hero, 4 USP cards, how-it-works, auth form
- 2026-02-15: Bot commands menu: /shops, /stats, /balance, /mode with setMyCommands; getTodayReviewStats storage method
- 2026-02-15: Telegram bot reply modes: removed tgReplyMode, now uses cabinet's replyModes JSON directly; step-by-step config in bot (4-5 stars / 1-3 stars, only Ручной/Авто)
- 2026-02-15: Enhanced Telegram bot: settings menu, notification preferences, rich notification format with photos, Generate/Publish/Edit/Regenerate flow, shouldNotify filtering
- 2026-02-15: Added tgNotifyType field to wbCabinets schema + DB migration
- 2026-02-15: Telegram bot integration: notifications, manual review approval via inline buttons, auth token linking
- 2026-02-15: Extracted generateReplyForReview as reusable function in functions.ts
- 2026-02-15: Added telegramChatId to wbCabinets, telegramAuthTokens table
- 2026-02-15: Ported all 10 Edge Functions to Express (server/functions.ts)
- 2026-02-15: Added 8 new storage methods for business logic support
- 2026-02-15: Migrated all frontend hooks from direct Supabase queries to server API
- 2026-02-15: Created comprehensive DatabaseStorage class (60+ methods) with Drizzle ORM
- 2026-02-15: Created complete Express API routes for all CRUD operations
- 2026-02-15: Replaced Supabase realtime subscriptions with polling (chats 30s, messages 10s)
- 2026-02-15: Created src/lib/api.ts helper for authenticated API requests

## User Preferences
- Language: Russian (UI and content)
- Dark mode support via CSS variables
