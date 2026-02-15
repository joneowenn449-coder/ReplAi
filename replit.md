# WB Отзывы (ReplAi) - Wildberries Review Management

## Overview
A Wildberries marketplace review management application with AI-powered reply generation. Built with React + Vite frontend and Express + Drizzle ORM backend. Uses Supabase for authentication only, with all data stored in an external PostgreSQL database.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + Drizzle ORM (TypeScript)
- **Database**: External PostgreSQL (85.193.81.180, database: default_db, schema: replai)
- **Auth**: Supabase (phone OTP, session management only - no data operations)
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
1. Frontend uses Supabase auth (phone OTP) for login/signup
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

## Recent Changes
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
