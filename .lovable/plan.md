

# Plan: Integrating WB API + OpenRouter AI for Auto-Replies

## Overview

The system will connect to Wildberries API to fetch new reviews every 5 minutes, generate AI responses via OpenRouter, and either auto-send them or save as drafts for manual approval. Two modes will be available via the existing "Auto-reply" toggle.

## Architecture

```text
+------------------+       +---------------------+       +------------------+
|   Frontend       | ----> | Supabase Edge Funcs  | ----> | WB API           |
|   (React App)    | <---- | (Deno)               | <---- | feedbacks-api    |
+------------------+       +---------------------+       +------------------+
                                    |       ^
                                    v       |
                            +-------+-------+------+
                            | Supabase DB          |
                            | - reviews            |
                            | - settings           |
                            +----------------------+
                                    |
                                    v
                            +----------------------+
                            | OpenRouter API       |
                            | (AI generation)      |
                            +----------------------+
```

## Step-by-Step Plan

### 1. Connect Supabase

First, connect your existing Supabase project to Lovable. After that, securely store two API keys as Supabase secrets:

- **WB_API_KEY** -- your Wildberries API token (for reviews/questions)
- **OPENROUTER_API_KEY** -- your OpenRouter key (for AI generation)

### 2. Create Database Tables

**Table `reviews`** -- stores fetched reviews from WB:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Internal ID |
| wb_id | text (unique) | WB feedback ID |
| rating | integer | Stars 1-5 |
| author_name | text | Reviewer name |
| text | text | Review text |
| product_name | text | Product name |
| product_article | text | WB article number |
| photo_links | jsonb | Array of photo URLs |
| created_date | timestamptz | WB review date |
| status | text | new / pending / auto / sent |
| ai_draft | text | AI-generated draft response |
| sent_answer | text | Actually sent answer |
| fetched_at | timestamptz | When we fetched it |

**Table `settings`** -- stores configuration (auto-reply mode, prompt template):

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Single row |
| auto_reply_enabled | boolean | Auto-send or draft mode |
| ai_prompt_template | text | System prompt for AI |
| last_sync_at | timestamptz | Last successful sync |

RLS policies will be set to allow authenticated users to read/write their data.

### 3. Edge Function: `sync-reviews`

This function will:

1. Fetch unanswered reviews from WB API (`GET /api/v1/feedbacks?isAnswered=false`)
2. Save new reviews to the `reviews` table (skip duplicates by `wb_id`)
3. For each new review, call OpenRouter to generate a response
4. If auto-reply is ON: immediately send the response to WB via `POST /api/v1/feedbacks/answer` and set status = "sent"
5. If auto-reply is OFF: save the AI draft and set status = "pending"
6. Update `last_sync_at` in settings

**OpenRouter call format:**
```text
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer OPENROUTER_API_KEY
Body: { model: "...", messages: [system_prompt, user_review] }
```

**Rate limiting:** WB allows 3 req/sec. The function will add a small delay between answer submissions.

### 4. Edge Function: `send-reply`

A separate function for manually sending a draft reply:

1. Accept `review_id` and optionally edited `answer_text`
2. Send to WB via `POST /api/v1/feedbacks/answer`
3. Update review status to "sent" and save `sent_answer`

### 5. Edge Function: `generate-reply`

Re-generate an AI draft for a specific review (if the user doesn't like the first one):

1. Accept `review_id`
2. Fetch review text from DB
3. Call OpenRouter for a new draft
4. Update `ai_draft` in the database

### 6. Scheduled Sync (pg_cron)

Set up a cron job to call `sync-reviews` every 5 minutes automatically:

```text
Schedule: */5 * * * * (every 5 minutes)
Action: HTTP POST to sync-reviews edge function
```

### 7. Frontend Updates

**Settings Page** -- new page/modal for:
- Entering/viewing API connection status
- Editing the AI prompt template
- Toggling auto-reply mode

**Review Card Enhancements:**
- Show AI draft text under the review (expandable)
- "Send" button to approve and send a draft
- "Regenerate" button to get a new AI draft
- "Edit" option to modify the draft before sending

**Real-time updates:**
- "Sync" button calls `sync-reviews` on demand
- After sync, refresh the reviews list from the database
- Show last sync time from the `settings` table

**Stats Cards** -- counts will come from actual DB data instead of mock data.

### 8. Questions Tab

Later extension: the same logic will work for WB questions (`/api/v1/questions` and `PATCH /api/v1/questions`), using the existing "Questions" tab structure.

---

## Technical Details

- **Edge functions** use `Deno.env.get()` for secrets (WB_API_KEY, OPENROUTER_API_KEY)
- **CORS headers** included in all edge functions for browser calls
- **JWT verification** set to `false` in config.toml; auth checked via `getClaims()` in code
- **Error handling**: WB rate limit (429), OpenRouter errors, and network failures are caught and surfaced as toasts
- **React Query** used for data fetching with automatic refetch after mutations
- Mock data in `Index.tsx` will be replaced with real DB queries via Supabase client

