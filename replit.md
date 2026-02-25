# WB Отзывы (ReplAi) - Wildberries Review Management

## Overview
ReplAi is a Wildberries marketplace review management application designed to automate and enhance seller-customer interactions. It enables sellers to sync reviews from Wildberries, generate AI-powered replies, manage chats with buyers, and oversee multiple seller cabinets. The platform aims to improve customer satisfaction, streamline review management processes, and provide AI-driven analytics for better decision-making.

## User Preferences
- Language: Russian (UI and content)
- Dark mode support via CSS variables

## System Architecture
The application uses a React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui frontend and an Express.js + Drizzle ORM (TypeScript) backend. Authentication is handled by Supabase (email + password), but all application data is stored in an external PostgreSQL database. The system supports multi-cabinet management, token-based billing, and an admin panel for user management.

**Key Technical Implementations:**
- **Frontend:** Utilizes TanStack Query for data fetching and caching, `useMemo` and `useCallback` for performance optimization, and `React.memo` for component rendering efficiency. It features mobile-responsive design, progressive review rendering, and collapsible UI elements.
- **Backend:** Express.js handles all API routes and business logic, which was fully ported from Supabase Edge Functions. Drizzle ORM manages interactions with the external PostgreSQL database.
- **AI Integration:** OpenRouter API is used for AI-generated review replies and analytics. It supports dynamic AI model selection based on review rating (e.g., GPT-4o for critical reviews, Gemini 2.0 Flash for positive reviews) and multimodal photo analysis using GPT-4o Vision. AI prompts are structured with explicit "DO" and "DON'T" rules and rating-matched example responses.
- **Data Management:** All data operations are routed through the Express API. Supabase is used solely for authentication and session management; no data is stored within Supabase. User data isolation is ensured by using the user ID from the JWT payload for all database queries.
- **Telegram Bot:** An integrated Telegram bot provides notifications for new reviews, allows manual review approval, and supports a step-by-step configuration for reply modes and notification preferences via inline buttons and commands.
- **Billing & Payments:** Modular subscription system with 5 tiers (Micro/Start/Standard/Business/Enterprise) + optional modules (Photo Analysis +199₽, AI Analyst +299₽). Legacy token-based billing still supported as fallback. Subscription data in `user_subscriptions` table. Payment flow prepared for Robokassa/Prodamus integration. Plans defined in `shared/subscriptionPlans.ts`.
- **Monitoring & Analytics:** The admin panel includes SaaS metrics for user activity, token consumption, AI vision usage, and churn alerts. It also features session and device tracking.
- **Business Logic:** Centralized in `server/functions.ts`, including review synchronization, chat synchronization, reply generation and sending, AI assistant for analytics, and payment processing.
- **Date Handling:** All dates in the admin panel are displayed in Moscow timezone (UTC+3) using `Intl.DateTimeFormat`.

## External Dependencies
- **Supabase:** Used exclusively for user authentication (email + password) and session management.
- **PostgreSQL:** Primary database for all application data, hosted externally (85.193.81.180, database: `default_db`, schema: `replai`).
- **OpenRouter API:** Integrated for AI model access (Gemini, GPT models) to generate review replies and power the AI analytics assistant.
- **Robokassa:** Payment gateway integrated for processing token purchases.
- **Wildberries API:** Used for syncing reviews, chats, messages, and sending replies to the Wildberries marketplace.
- **`node-telegram-bot-api`:** Library used for Telegram bot integration.
- **`ua-parser-js`:** Used for parsing user-agent strings for session tracking.