# Cosmic Destiny (宇宙命理)

## Overview

Cosmic Destiny is a globalized, AI-powered fortune-telling and astrology platform based on the Cosmic Destiny™ Protocol v3.0. The application provides BaZi (八字) readings, daily fortune predictions, AI divination, and compatibility matching across 8 cultural systems (Chinese, Japanese, Western, Buddhist, Arabic, Pokémon, Marvel, Genshin). The platform targets users aged 18-45 interested in astrology and fortune-telling, with special appeal to gaming and IP fans.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom cosmic purple theme (dark mode primary)
- **Animations**: Framer Motion for page transitions and effects
- **Internationalization**: Custom i18n system supporting zh/en/ja/ko languages with 200+ translation keys. All dashboard pages use t() function for UI text. BaZi chart content (stems, branches, ten gods) intentionally stays in Chinese regardless of language setting. Language selector displays labels in native language (中文, English, 日本語, 한국어) per UX standards
- **Timezone Support**: Global timezone selector in header with browser auto-detection, birth timezone selection in settings and matching forms

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Replit Auth with OpenID Connect, session-based with PostgreSQL session store
- **Build System**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` with models split into `shared/models/`
- **Key Tables**: user_profiles, bazi_charts, daily_fortunes, divinations, matchings, subscriptions, referrals, stardust_accounts, stardust_logs, subscription_plans, devices
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Stardust Points System (Refactored Jan 2026)
- **Tables**: stardust_accounts (balance, totals, check-in tracking), stardust_logs (transaction history), subscription_plans (tier quotas)
- **Consumption Costs**: daily_fortune=5, hourly_fortune=10, ai_deep_query=20, bazi_deep_read=20, culture_switch=15, compatibility_reading=20
- **Usage History**: GET /api/stardust/logs returns transaction history with time, action type, and amount
- **Earning Rules**: initial_free_gift=200, check_in=5 (+50 week bonus), referral_success=200
- **Subscription Quotas**: free=0, pro=1200/month, elite=4000/month
- **APIs**: GET /api/stardust, POST /api/stardust/consume, POST /api/stardust/earn, POST /api/stardust/check-in
- **Frontend Hook**: `useStardust()` in client/src/hooks/use-stardust.ts

### RAG Knowledge Base System (Added Jan 2026)
- **Vector Database**: PostgreSQL with pgvector extension for semantic search
- **Tables**: knowledge_files (file metadata, status), knowledge_chunks (text chunks with embeddings)
- **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions)
- **Chunking**: RecursiveCharacterTextSplitter-style with 512 token chunks, 50 token overlap
- **Service**: `server/lib/knowledge-service.ts` handles chunking, embedding, search, and RAG context building
- **APIs**:
  - GET /api/knowledge/status - Check knowledge base status
  - POST /api/knowledge/upload - Upload protocol file (supports .pdf, .md, .txt)
  - POST /api/knowledge/update - Replace entire knowledge base with new file
  - POST /api/knowledge/search - Search knowledge base (for debugging)
  - DELETE /api/knowledge - Clear entire knowledge base
- **RAG Pipeline**: When knowledge base is populated, all AI interpretations (daily fortune, divination, cultural interpretation) automatically retrieve relevant protocol chunks and inject them into the system prompt
- **Multi-language Support**: RAG system prompts are localized for zh/en/ja/ko

### Core Domain Logic
- **BaZi Calculator**: Server-side implementation in `server/lib/bazi-calculator.ts` handling Chinese astrology calculations:
  - Four Pillars (Year, Month, Day, Hour) with Heavenly Stems, Earthly Branches
  - Hidden Stems (藏干) with associated Ten Gods (十神)
  - Day Master Element (日主五行) with Yin/Yang polarity
  - Favorable Gods (喜用神) and Unfavorable Gods (忌神) calculation
  - Body Strength (身强/身弱) analysis
  - Destiny Pattern (命格) identification
  - Grand Luck (大运) periods: Uses `lunar-javascript` library's `EightChar.getYun().getDaYun()` for accurate calculation based on birth date relative to solar terms. Correctly handles gender and year polarity for forward/reverse order. Start age is calculated from birth date to nearest Jie (节气), not fixed.
  - Yearly Fortunes (流年运势) with 10-year projections
- **Fortune Generator**: AI-powered fortune generation using OpenAI API in `server/lib/fortune-generator.ts`
- **Multi-dimensional scoring**: Career, love, wealth, health, study with hourly fortune breakdowns
- **8 Cultural Systems**: Chinese mythology, Japanese RPG, Western fantasy, Buddhist, Arabic, Pokemon, Marvel, Genshin (UI selector implemented, AI wiring is future enhancement)

### Authentication Flow
- Replit Auth integration with OIDC
- Protected routes use `isAuthenticated` middleware
- User profiles created on first login with default subscription tier

## External Dependencies

### AI Services
- **Kimi API (Moonshot AI)**: Primary AI provider for fortune interpretations
  - Model Selection: Free users use `kimi-k2-thinking`, paid users (pro/elite) use `kimi-k2.5`
  - Fast Translation Model: `moonshot-v1-8k` for quick language switching
  - Deep Reading Length: 200-300 characters (enforced via truncation)
- **Multi-language Instant Switching**: Deep readings stored as MultiLangInterpretation objects {zh, en, ja, ko} for instant language switching without re-generation
- **OpenAI API**: Used for knowledge base embeddings
- **Environment Variables**: `KIMI_API_KEY`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Database
- **PostgreSQL**: Primary database requiring `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management with `drizzle-kit push` for migrations

### Authentication
- **Replit Auth**: OpenID Connect provider via `ISSUER_URL` (defaults to replit.com/oidc)
- **Session Secret**: Requires `SESSION_SECRET` environment variable

### Payment (PayPal Advanced Checkout)
- **PayPal SDK v6**: Advanced checkout with card fields + PayPal button
- **Backend**: `server/paypal.ts` - PayPal client setup, order creation, capture, client token generation
- **Frontend**: `client/src/components/PayPalAdvancedCheckout.tsx` - Tab-based UI with credit card fields and PayPal button
- **Environment Variables**: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` (set to "live" for production)
- **Supported Methods**: Credit/Debit Card (hosted fields), PayPal
- **Apple Pay/Google Pay**: Requires additional onboarding in PayPal Dashboard (domain verification, Apple Developer account). Once onboarded, SDK components can be added to PayPalAdvancedCheckout.tsx
- **Subscription Flow**: User selects plan → Payment dialog opens → PayPalAdvancedCheckout renders → Payment captured → POST /api/subscription/upgrade upgrades tier

### TikTok Events API (Server-Side Postback)
- **Pixel ID**: D65L8EJC77U5GADIL890
- **API Endpoint**: POST `https://business-api.tiktok.com/open_api/v1.3/event/track/`
- **Server Service**: `server/lib/tiktok-events.ts` - SHA-256 hashed PII, auto IP/UA extraction
- **Client Module**: `client/src/lib/tiktok-pixel.ts` - Dual-fire (client pixel + server API)
- **Tracked Events**: CompleteRegistration (on profile creation), Login (returning user login), ViewContent (dashboard pages), InitiateCheckout (plan selection), AddPaymentInfo, PlaceAnOrder, CompletePayment (subscription purchase)
- **Deduplication**: Shared `event_id` generated on client, sent to both browser pixel and server API
- **Server Tracking Endpoint**: POST `/api/track` - accepts event, event_id, properties, ttclid, ttp from frontend
- **ttclid Backend Mapping**: Stored in user_profiles table (ttclid, ttp columns), saved on login via POST `/api/track/ttclid`, used as fallback in `/api/track` when not available from request
- **User Parameters**: external_id (SHA-256), email (SHA-256), ip, user_agent, ttclid, ttp, locale (from Accept-Language header)
- **Environment Variables**: `TIKTOK_ACCESS_TOKEN`
- **Privacy**: Email and external_id SHA-256 hashed on both client and server before sending to TikTok

### Mobile App (Capacitor)
- **Framework**: Capacitor 7.x wrapping the web app in native WebView
- **App ID**: `com.cosmicdestiny.app`
- **Mode**: Remote URL mode — loads from `https://cosmic-destiny-universe.replit.app`
- **Android Project**: `android/` directory, ready for Android Studio
- **iOS Project**: `ios/` directory, requires macOS + Xcode + `pod install`
- **Native Plugins**: @capacitor/splash-screen, @capacitor/status-bar, @capacitor/app, @capacitor/haptics, @capacitor/keyboard
- **Build Script**: `scripts/build-mobile.sh` — builds web assets and syncs to native projects
- **Theme**: Dark cosmic background (#0F0A1E), purple accent (#A855F7)
- **To build APK**: Download project → Open `android/` in Android Studio → Build > Generate Signed APK
- **To build IPA**: Download project to Mac → `cd ios/App && pod install` → Open .xcworkspace in Xcode → Archive

### Audio/Voice Features (Optional)
- Voice chat capabilities with WebM to WAV conversion using ffmpeg
- AudioWorklet-based playback for streaming audio responses

### Development Tools
- Replit-specific Vite plugins for development (cartographer, dev-banner, runtime-error-modal)