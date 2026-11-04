# Oriri Podcast App - Complete Project Blueprint
## Comprehensive Handoff Documentation for Claude Code

**Last Updated:** April 2, 2026  
**Production URL:** https://www.oriri.me  
**Status:** ✅ Live and Production-Ready

---

## 🎯 Executive Summary

**Oriri** (formerly "Tea for Two Podcast") is a mobile-first Progressive Web App (PWA) featuring Renee & Amanda's content about life in the UAE, personal growth, and wellness. The platform functions as an exclusive content hub with a sophisticated subscription model, multi-source podcast integration, and comprehensive admin management tools.

### Key Highlights
- **Mobile-First PWA** with dark mode glassmorphism design
- **Three Content Sources:** Spotify RSS, YouTube API, Admin-uploaded exclusive content
- **Role-Based Access:** Guest, Registered (7-day trial), VIP Subscribers (AED20/month)
- **Live Hosting:** www.oriri.me (external hosting, not Figma Make)
- **Backend:** Supabase with Edge Functions (Hono server)
- **Analytics:** Google Analytics (G-78GWK70520) integrated

---

## 📋 Table of Contents

1. [Technical Architecture](#technical-architecture)
2. [Project Structure](#project-structure)
3. [Core Technologies](#core-technologies)
4. [Environment Variables & Secrets](#environment-variables--secrets)
5. [Backend Architecture](#backend-architecture)
6. [Authentication & User Management](#authentication--user-management)
7. [VIP Subscription System](#vip-subscription-system)
8. [Content Sources & API Integrations](#content-sources--api-integrations)
9. [Key Features](#key-features)
10. [Component Architecture](#component-architecture)
11. [State Management](#state-management)
12. [Database Schema (KV Store)](#database-schema-kv-store)
13. [API Endpoints](#api-endpoints)
14. [Deployment Architecture](#deployment-architecture)
15. [Known Issues & Important Notes](#known-issues--important-notes)
16. [Development Workflow](#development-workflow)

---

## 🏗️ Technical Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React PWA)                      │
│  - Mobile-first responsive design                           │
│  - Dark mode with glassmorphism                             │
│  - Service Worker for offline capabilities                  │
│  - React Router for navigation                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│          Supabase Edge Functions (Hono Server)              │
│  - Route: /make-server-a278ea32/*                           │
│  - Authentication middleware                                │
│  - Business logic & API orchestration                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ↓             ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Supabase │  │ External │  │   Supabase   │
│   Auth   │  │   APIs   │  │  KV Store    │
│          │  │          │  │  (Database)  │
└──────────┘  └──────────┘  └──────────────┘
              - Spotify RSS
              - YouTube API
              - Apple Podcasts
```

### Technology Stack
- **Frontend Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS v4.0 (dark mode)
- **Routing:** React Router v6 (BrowserRouter)
- **State Management:** React Context API + Custom Hooks
- **UI Components:** Custom component library (shadcn/ui-inspired)
- **Icons:** Lucide React
- **Backend:** Supabase Edge Functions with Hono web framework
- **Database:** Supabase KV Store (key-value pairs)
- **Authentication:** Supabase Auth with email/password + OAuth
- **Storage:** Supabase Storage (for admin-uploaded content)
- **Analytics:** Google Analytics (GA4)

---

## 📁 Project Structure

### Root Files
```
/
├── App.tsx                          # Main app component with providers
├── main.tsx                         # Entry point
├── index.html                       # HTML shell with GA tracking
├── styles/globals.css               # Global Tailwind styles
└── [Various documentation files]    # Project history & reports
```

### Key Directories

#### `/components/`
Main application components organized by feature:

**Core App Components:**
- `AppLayout.tsx` - Main app layout with header, content, player
- `AppRouter.tsx` - Route configuration
- `AppModals.tsx` - Global modal management
- `OptimizedProviders.tsx` - Context providers wrapper
- `ErrorBoundary.tsx` - Global error handling
- `SplashWrapper.tsx` - App initialization splash screen

**Screen Components:**
- `HomeScreen.tsx` - Main episode feed
- `EpisodeDetailScreen.tsx` - Individual episode view
- `SearchScreen.tsx` - Search functionality
- `ProfileScreen.tsx` - User profile & settings
- `SettingsScreen.tsx` - App settings
- `StoreScreen.tsx` - E-commerce store
- `CommunityScreen.tsx` - Community features
- `LiveSessionsScreen.tsx` - Live streaming sessions

**Authentication:**
- `AuthModal.tsx` - Login/signup modal
- `LoginScreen.tsx` - Dedicated login screen
- `OnboardingFlow.tsx` - New user onboarding

**Admin Components (`/components/admin/`):**
- `EpisodeManagement.tsx` - Admin episode CRUD
- `VipManagement.tsx` - VIP subscriber management
- `UserManagement.tsx` - User management
- `ContentGenerator.tsx` - Content creation tools
- `EpisodeAnalyticsDashboard.tsx` - Analytics dashboard
- `StoreManagement.tsx` - Product management
- `LiveSessionManagement.tsx` - Live session scheduling
- `SocialMediaDashboard.tsx` - Social media automation

**VIP Components (`/components/vip/`):**
- `VipGateComponent.tsx` - Content access gate
- `VipUserExperience.tsx` - VIP user wrapper
- `SubscriptionModal.tsx` - Subscription purchase flow
- `VipBenefitsDisplay.tsx` - Benefits showcase

**Interaction Components (`/components/interactions/`):**
- `EpisodeInteractionBar.tsx` - Like/comment/share bar
- `ShareModal.tsx` - Share options modal
- `CommentsModal.tsx` - Episode comments
- `TipModal.tsx` - Creator tipping

**UI Components (`/components/ui/`):**
Custom component library including:
- `button.tsx`, `input.tsx`, `dialog.tsx`, `card.tsx`
- `dropdown-menu.tsx`, `tabs.tsx`, `select.tsx`
- `skeleton.tsx`, `empty-state.tsx`, `error-state.tsx`
- And 40+ more reusable components

#### `/contexts/`
React Context providers for state management:
- `SimplePodcastContext.tsx` - Podcast episode management
- `VipSubscriptionContext.tsx` - VIP subscription state
- `EpisodeInteractionContext.tsx` - Episode interactions (likes, comments)
- `AdminContext.tsx` - Admin functionality
- `StoreContext.tsx` - E-commerce store state
- `ModalContext.tsx` - Global modal state
- `NotificationContext.tsx` - Notification system
- `LiveTipContext.tsx` - Live tipping functionality
- `index.ts` - Context exports

#### `/hooks/`
Custom React hooks:
- `useAuth.tsx` - Authentication state
- `useAuthHandlers.tsx` - Auth action handlers
- `useAdmin.tsx` - Admin operations
- `useAudioPlayer.tsx` - Audio playback
- `useGlobalAudioPlayer.tsx` - Global player state
- `useEpisodePlayer.tsx` - Episode-specific player
- `usePermissions.tsx` - Permission checking
- `useUserProfile.tsx` - User profile data
- `useCommunityProfile.tsx` - Community features
- `useLiveSessions.tsx` - Live session management

#### `/utils/`
Utility functions and services:

**API Services:**
- `simplePodcastApi.ts` - Main podcast API client
- `adminApi.ts` - Admin API calls
- `vipApi.ts` - VIP subscription API
- `vipAdminApi.ts` - VIP admin operations
- `frontendPodcastService.ts` - Frontend podcast utilities

**Podcast APIs (`/utils/podcastApis/`):**
- `spotifyApi.ts` - Spotify RSS integration
- `youtubeApi.ts` - YouTube Data API v3
- `applePodcastsApi.ts` - Apple Podcasts integration
- `index.ts` - Unified API exports

**Core Utilities:**
- `audioService.ts` - Audio player service
- `rssParser.ts` - RSS feed parsing
- `spotifyRSSService.ts` - Spotify RSS handler
- `youtubeRSSService.ts` - YouTube RSS handler
- `imageErrorHandler.ts` - Image loading error handling
- `errorTracking.ts` - Error tracking & logging
- `debugUtils.ts` - Debug utilities
- `serviceWorker.ts` - PWA service worker registration
- `pwaHealthCheck.ts` - PWA diagnostic tools

**Supabase (`/utils/supabase/`):**
- `client.tsx` - Supabase client instance
- `info.tsx` - Project ID & API keys (protected)

#### `/supabase/functions/server/`
Backend Edge Function (Hono server):
- `index.tsx` - Main server with all routes
- `kv_store.tsx` - KV database utilities (PROTECTED)
- `vipRoutes.ts` - VIP subscription routes
- `vipHelpers.ts` - VIP helper functions
- `podcastOrchestrator.ts` - Multi-platform podcast sync

#### `/types/`
TypeScript type definitions:
- `podcast.ts` - Podcast-related interfaces

#### `/public/`
Static assets:
- `manifest.json` - PWA manifest
- `sw.js` - Service worker
- `favicon.ico` - Favicon
- Various app icons (192x192, 512x512, etc.)

---

## 🔧 Core Technologies

### Frontend Dependencies (via import)
```typescript
// Core
- react@18
- react-dom@18
- react-router@6

// UI & Styling
- tailwindcss@4.0
- lucide-react (icons)
- motion (animations - formerly Framer Motion)
- sonner@2.0.3 (toast notifications)

// Forms & Data
- react-hook-form@7.55.0

// Charts & Visualizations
- recharts

// Utilities
- date-fns (date handling)
```

### Backend Dependencies (Deno)
```typescript
// Server
- hono (web framework)
- @supabase/supabase-js@2

// Import via npm: or jsr:
- npm:hono
- npm:hono/cors
- npm:hono/logger
- npm:@supabase/supabase-js@2
```

---

## 🔐 Environment Variables & Secrets

### Already Configured Secrets
These are stored in Supabase and DO NOT need to be re-added:

```
SUPABASE_URL              # Supabase project URL
SUPABASE_ANON_KEY        # Public anon key (safe for frontend)
SUPABASE_SERVICE_ROLE_KEY # Service role key (backend only)
SUPABASE_DB_URL          # Database connection string

# Content Sources
YOUTUBE_API_KEY          # YouTube Data API v3 key
YOUTUBE_CHANNEL_ID       # Renee & Amanda's channel
YOUTUBE_PLAYLIST_ID      # Playlist to fetch
SPOTIFY_SHOW_ID          # Spotify podcast show ID
SPOTIFY_CLIENT_ID        # Spotify API credentials
SPOTIFY_CLIENT_SECRET    # Spotify API credentials
APPLE_PODCASTS_SHOW_ID   # Apple Podcasts show ID
APPLE_PODCASTS_FEED_URL  # Apple Podcasts RSS feed

# Analytics
GA_MEASUREMENT_ID        # Google Analytics (G-78GWK70520)
```

### Accessing Secrets

**Frontend:**
```typescript
import { projectId, publicAnonKey } from './utils/supabase/info';
```

**Backend:**
```typescript
Deno.env.get('SUPABASE_URL')
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
Deno.env.get('YOUTUBE_API_KEY')
```

---

## 🔙 Backend Architecture

### Server Overview
- **Framework:** Hono (Express-like for Deno)
- **Entry Point:** `/supabase/functions/server/index.tsx`
- **Base Route:** `/make-server-a278ea32/*`
- **CORS:** Open (allows all origins)
- **Authentication:** Bearer token via Authorization header

### Server Startup Process
1. Initialize Supabase client
2. Check/create storage buckets (if storage enabled)
3. Initialize VIP system with default tier
4. Register all routes
5. Start Deno.serve(app.fetch)

### Key Server Features
- **Automatic CORS** for all routes
- **Request logging** via Hono logger
- **Error handling** with detailed console logs
- **Auth middleware** for protected routes
- **Admin role checking** for admin routes
- **File upload** to Supabase Storage
- **KV store operations** via helper functions

---

## 🔑 Authentication & User Management

### Authentication Flow

**1. Sign Up (`/make-server-a278ea32/signup`)**
```typescript
POST /signup
Body: { email, password, name }
- Creates user with Supabase Auth
- Sets user_metadata: { name, role: 'registered' }
- Auto-confirms email (email_confirm: true)
- Returns { success, user, accessToken }
```

**2. Login (Frontend - Supabase Client)**
```typescript
const { data: { session: { access_token } } } = 
  await supabase.auth.signInWithPassword({ email, password })
```

**3. OAuth Login (Optional - requires setup)**
```typescript
// Google, Facebook, GitHub, etc.
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

**4. Session Management**
```typescript
// Check active session
const { data: { session } } = await supabase.auth.getSession()

// Logout
await supabase.auth.signOut()
```

### User Roles

**Guest** (unauthenticated)
- Browse public episodes (Spotify, YouTube)
- Limited features
- Cannot access VIP content

**Registered** (authenticated)
- All guest features
- 7-day VIP trial (automatic)
- Can comment, like, share
- Access to exclusive content during trial

**VIP Subscriber** (paid)
- All registered features
- Unlimited access to exclusive content
- Priority support
- Special badges/indicators
- AED20/month subscription

**Admin**
- Full system access
- Content management (create/edit/delete episodes)
- User management
- Analytics dashboard
- VIP subscriber management
- Store management
- Live session scheduling

### Making a User Admin

**Method 1: API Route**
```typescript
POST /make-server-a278ea32/make-admin
Headers: { Authorization: `Bearer ${accessToken}` }
- Makes the authenticated user an admin
```

**Method 2: Direct Supabase (recommended for first admin)**
```typescript
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: {
    role: 'admin',
    isAdmin: true
  }
})
```

### Admin Check Logic
```typescript
const isAdmin = 
  user.user_metadata?.role === 'admin' ||
  user.email === 'admin@oriri.com' ||
  user.user_metadata?.isAdmin === true
```

---

## 💎 VIP Subscription System

### VIP Architecture

**Storage Structure (KV Store):**
```
vip_tier_default          → Default VIP tier configuration
vip_user_{userId}         → User VIP status
vip_subscription_{subId}  → Subscription records
vip_trial_{userId}        → Trial tracking
```

### VIP Tier Configuration
```typescript
{
  tierId: 'default',
  displayName: 'VIP Membership',
  price: 20.00,           // AED
  currency: 'AED',
  billingCycle: 'monthly',
  trialDays: 7,           // 7-day free trial
  features: [
    'Exclusive VIP Episodes',
    'Early access to new content',
    'Ad-free listening',
    'Exclusive community access',
    'Priority support',
    'Special VIP badge'
  ],
  isActive: true
}
```

### VIP User Status
```typescript
{
  userId: 'user-id',
  status: 'trial' | 'active' | 'cancelled' | 'expired',
  subscriptionId: 'sub-id',
  currentPeriodStart: '2026-03-26T...',
  currentPeriodEnd: '2026-04-26T...',
  trialEnd: '2026-04-02T...',      // 7 days from signup
  isTrialing: true,
  autoRenew: true,
  cancelledAt: null,
  metadata: {
    signupDate: '2026-03-26T...',
    trialStarted: '2026-03-26T...'
  }
}
```

### VIP Gating Logic

**Content Access Check:**
```typescript
function canAccessVipContent(episode, user) {
  // Public episodes - always accessible
  if (episode.accessLevel === 'public') return true;
  
  // VIP episodes - requires VIP status
  if (episode.accessLevel === 'vip') {
    if (!user) return false;  // Not logged in
    
    const vipStatus = user.vipStatus;
    
    // Active VIP or trialing
    if (vipStatus?.status === 'active' || vipStatus?.isTrialing) {
      return true;
    }
  }
  
  return false;
}
```

### VIP Routes

**GET `/make-server-a278ea32/vip/status`**
- Get current user's VIP status
- Requires auth
- Returns VIP tier + user status

**POST `/make-server-a278ea32/vip/subscribe`**
- Create new subscription
- Auto-starts 7-day trial for new users
- Body: `{ tierId: 'default', paymentMethodId }`

**POST `/make-server-a278ea32/vip/cancel`**
- Cancel subscription
- Sets cancelledAt, autoRenew: false
- Access continues until period end

**GET `/make-server-a278ea32/vip/tiers`**
- Get available VIP tiers
- Public endpoint

**Admin VIP Routes:**
- `POST /vip/admin/grant` - Grant VIP manually
- `POST /vip/admin/revoke` - Revoke VIP access
- `GET /vip/admin/users` - List all VIP users
- `GET /vip/admin/stats` - VIP statistics

---

## 📡 Content Sources & API Integrations

### 1. Spotify RSS Feed

**Purpose:** Fetch public podcast episodes from Spotify

**Implementation:**
```typescript
// Server-side proxy to avoid CORS
GET /make-server-a278ea32/spotify-rss-proxy
- Fetches RSS feed from Spotify
- Parses XML to JSON
- Returns episodes array
```

**Episode Structure:**
```typescript
{
  id: 'spotify_episode_id',
  title: string,
  description: string,
  audioUrl: string,
  imageUrl: string,
  duration: number,
  publishedDate: string,
  platform: 'spotify',
  accessLevel: 'public'
}
```

**Important:** Server-side RSS proxy completely eliminated CORS issues

### 2. YouTube API Integration

**Purpose:** Fetch video content from YouTube channel

**API:** YouTube Data API v3
**Key:** `YOUTUBE_API_KEY`
**Channel:** `YOUTUBE_CHANNEL_ID`
**Playlist:** `YOUTUBE_PLAYLIST_ID`

**Endpoints Used:**
- `playlistItems.list` - Get videos from playlist
- `videos.list` - Get video details
- `channels.list` - Get channel info

**Implementation:**
```typescript
// utils/podcastApis/youtubeApi.ts
export async function fetchYouTubeEpisodes() {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?
     part=snippet,contentDetails&
     playlistId=${YOUTUBE_PLAYLIST_ID}&
     key=${YOUTUBE_API_KEY}&
     maxResults=50`
  );
  // Parse and transform to episode format
}
```

**Episode Structure:**
```typescript
{
  id: 'youtube_video_id',
  title: string,
  description: string,
  audioUrl: string,  // YouTube video URL
  imageUrl: string,  // Thumbnail
  duration: number,
  publishedDate: string,
  platform: 'youtube',
  views: number,
  accessLevel: 'public'
}
```

### 3. Admin-Uploaded Content

**Purpose:** Exclusive VIP content uploaded by admin

**Storage:** Supabase Storage bucket `make-a278ea32-episodes`

**Upload Flow:**
1. Admin uploads audio file via admin dashboard
2. File stored in Supabase Storage
3. Episode metadata saved to KV store
4. Signed URL generated for playback

**Episode Structure:**
```typescript
{
  id: 'admin_episode_id',
  title: string,
  description: string,
  audioUrl: string,  // Signed URL from Supabase Storage
  imageUrl: string,
  duration: number,
  publishedDate: string,
  platform: 'admin',
  accessLevel: 'vip',  // VIP-only content
  uploadedBy: 'admin_user_id'
}
```

**Admin Upload Route:**
```typescript
POST /make-server-a278ea32/upload
Content-Type: multipart/form-data
Body: { file, path }
- Uploads file to Supabase Storage
- Returns signed URL (1 year expiry)
```

---

## ✨ Key Features

### 1. Audio Player
- **Global persistent player** - Continues playing across navigation
- **Mini player** - Compact player bar at bottom
- **Full player modal** - Expanded player with controls
- **Playback controls** - Play/pause, seek, volume, speed
- **Queue management** - Next/previous track
- **Background audio** - Service worker for offline playback

### 2. Episode Interactions
- **Like/Unlike** - Heart episodes
- **Comments** - Thread-based commenting system
- **Share** - Social media sharing (Facebook, Twitter, LinkedIn, Bluesky)
- **Bookmark** - Save episodes for later
- **Download** - Offline listening (PWA feature)
- **Tip Creator** - Send tips to podcast hosts

### 3. Search & Discovery
- **Full-text search** - Search titles, descriptions, guests
- **Filter by platform** - Spotify, YouTube, Admin
- **Filter by access level** - Public vs VIP
- **Category browsing** - Browse by topic
- **Recently viewed** - Track viewing history

### 4. Live Sessions
- **Scheduled sessions** - Upcoming live streams
- **Ongoing sessions** - Currently live indicator
- **Archived sessions** - Past session replays
- **Live chat** - Real-time chat during sessions
- **Super chat** - Highlighted paid messages
- **Tipping** - Send tips during live sessions
- **Reminders** - Set reminders for upcoming sessions

### 5. Community Features
- **User profiles** - Public user profiles
- **Activity feed** - See what others are listening to
- **Discussion threads** - Episode discussions
- **Leaderboards** - Top contributors, listeners

### 6. E-Commerce Store
- **Product catalog** - Merchandise & digital products
- **Shopping cart** - Multi-item cart
- **Checkout** - Payment simulation (AED currency)
- **Order history** - Track past orders
- **Admin management** - CRUD for products

### 7. Admin Dashboard
- **Episode management** - Full CRUD for episodes
- **User management** - View, edit, delete users
- **VIP management** - Grant/revoke VIP access
- **Analytics dashboard** - Episode metrics, user stats
- **Content generator** - AI-assisted content creation
- **Store management** - Product CRUD
- **Live session scheduler** - Schedule/manage live sessions
- **Social media automation** - Auto-post to social platforms

### 8. Analytics & Tracking
- **Episode views** - Track episode plays
- **User engagement** - Likes, comments, shares
- **Listen duration** - Track listen time
- **Platform analytics** - Compare Spotify vs YouTube
- **User journey tracking** - Onboarding, conversion funnels
- **Google Analytics** - GA4 integration

### 9. PWA Features
- **Installable** - Add to home screen
- **Offline support** - Service worker caching
- **Push notifications** - New episode alerts
- **Background sync** - Sync when connection restored
- **App-like experience** - No browser chrome

---

## 🧩 Component Architecture

### Component Hierarchy
```
App (BrowserRouter)
└── ErrorBoundary
    └── OptimizedProviders (All Contexts)
        └── SplashWrapper
            └── UserFlowCoordinator
                └── VipUserExperience
                    ├── AppLayout
                    │   ├── Header
                    │   ├── SideMenu (desktop)
                    │   ├── [Route Content]
                    │   ├── MiniPlayer
                    │   └── BottomTabBar (mobile)
                    └── AppModals
                        ├── AuthModal
                        ├── SubscriptionModal
                        ├── ShareModal
                        ├── CommentsModal
                        └── TipModal
```

### Key Component Patterns

**1. Provider Pattern**
```typescript
// All contexts wrapped in OptimizedProviders
<SimplePodcastProvider>
  <VipSubscriptionProvider>
    <AdminProvider>
      <StoreProvider>
        {children}
      </StoreProvider>
    </AdminProvider>
  </VipSubscriptionProvider>
</SimplePodcastProvider>
```

**2. Modal Management**
```typescript
// Global modal state via ModalContext
const { openModal, closeModal } = useContext(ModalContext);

openModal('auth', { mode: 'login' });
openModal('subscription', { tierId: 'default' });
```

**3. Protected Routes**
```typescript
// VIP-gated content
<VipGateComponent episodeId={id} accessLevel="vip">
  <EpisodeDetail />
</VipGateComponent>

// Admin routes
<AdminProtectedRoute>
  <AdminDashboard />
</AdminProtectedRoute>
```

**4. Error Boundaries**
```typescript
// Catch React errors
<ErrorBoundary onError={handleError}>
  <ComponentThatMightError />
</ErrorBoundary>
```

---

## 🌐 State Management

### Context Providers

**1. SimplePodcastContext**
- All episodes (Spotify + YouTube + Admin)
- Loading states
- Sync methods (syncSpotify, syncYouTube, syncAll)
- Error handling

**2. VipSubscriptionContext**
- Current VIP status
- Subscription details
- Trial status
- Subscribe/cancel methods
- VIP tier information

**3. EpisodeInteractionContext**
- Episode likes/unlikes
- Comments
- Shares
- Bookmarks
- Analytics tracking

**4. AdminContext**
- Admin authentication
- Episode CRUD operations
- User management
- Analytics data

**5. StoreContext**
- Product catalog
- Shopping cart
- Checkout flow
- Order history

**6. ModalContext**
- Modal open/close state
- Active modal type
- Modal data/props

**7. NotificationContext**
- Toast notifications
- Push notification handling

### Custom Hooks

**Authentication:**
- `useAuth()` - Current user, login status
- `useAuthHandlers()` - Login, logout, signup handlers
- `usePermissions()` - Permission checking (isAdmin, isVIP)

**Audio:**
- `useGlobalAudioPlayer()` - Global player state
- `useAudioPlayer()` - Audio playback controls
- `useEpisodePlayer(episodeId)` - Episode-specific player

**Data Fetching:**
- `useUserProfile()` - Current user profile
- `useLiveSessions()` - Live session data
- `useEpisodeMetrics(episodeId)` - Episode analytics

---

## 🗄️ Database Schema (KV Store)

### Storage Structure

The app uses Supabase's KV store (key-value pairs) for all data storage.

**Key Prefixes:**

```typescript
// Episodes
episode_{episodeId}                 → Episode metadata
episode_spotify_{episodeId}         → Spotify episodes
episode_youtube_{episodeId}         → YouTube episodes
episode_admin_{episodeId}           → Admin-uploaded episodes

// VIP System
vip_tier_{tierId}                   → VIP tier config
vip_user_{userId}                   → User VIP status
vip_subscription_{subscriptionId}   → Subscription records
vip_trial_{userId}                  → Trial tracking

// User Data
user_profile_{userId}               → User profiles
user_preferences_{userId}           → User settings

// Interactions
episode_like_{userId}_{episodeId}   → Episode likes
episode_comment_{commentId}         → Comments
episode_share_{shareId}             → Share tracking
episode_view_{userId}_{episodeId}   → View tracking
episode_analytics_{episodeId}       → Episode metrics

// Live Sessions
live_session_{sessionId}            → Live session data
chat_message_{sessionId}_{messageId} → Chat messages
tip_{tipId}                         → Tips/donations
reminder_{userId}_{sessionId}       → Session reminders

// Store
product_{productId}                 → Products
order_{orderId}                     → Orders
cart_{userId}                       → Shopping carts

// Admin
admin_settings                      → Admin configuration
platform_config_{platform}          → API configuration
```

### KV Store Operations

**Available Methods:**
```typescript
// Single operations
await kv.get(key)           // Get single value
await kv.set(key, value)    // Set single value
await kv.del(key)           // Delete single key

// Bulk operations
await kv.mget([key1, key2]) // Get multiple values
await kv.mset({ key1: val1, key2: val2 }) // Set multiple
await kv.mdel([key1, key2]) // Delete multiple

// Query operations
await kv.getByPrefix('episode_') // Get all matching prefix
```

**Important:** DO NOT modify `/supabase/functions/server/kv_store.tsx` - it's a protected file.

---

## 🔌 API Endpoints

### Base URL
```
https://${projectId}.supabase.co/functions/v1/make-server-a278ea32
```

### Authentication
```
Headers: {
  'Authorization': `Bearer ${accessToken}`,  // For protected routes
  'Authorization': `Bearer ${publicAnonKey}`, // For public routes
  'Content-Type': 'application/json'
}
```

### Endpoints

#### Health & Info
```
GET  /health              → Server health check
GET  /user-info           → Current user info (requires auth)
POST /make-admin          → Make current user admin (requires auth)
POST /init-storage        → Initialize storage bucket (admin)
```

#### Episodes
```
GET  /episodes            → Get all episodes
GET  /episodes/:id        → Get episode by ID
POST /episodes            → Create episode (admin)
PUT  /episodes/:id        → Update episode (admin)
DELETE /episodes/:id      → Delete episode (admin)
```

#### VIP System
```
GET  /vip/status          → Get current VIP status (requires auth)
GET  /vip/tiers           → Get available VIP tiers (public)
POST /vip/subscribe       → Subscribe to VIP (requires auth)
POST /vip/cancel          → Cancel subscription (requires auth)

# Admin VIP routes
POST /vip/admin/grant     → Grant VIP to user (admin)
POST /vip/admin/revoke    → Revoke VIP from user (admin)
GET  /vip/admin/users     → List all VIP users (admin)
GET  /vip/admin/stats     → VIP statistics (admin)
```

#### External Content
```
GET  /spotify-rss-proxy   → Proxy Spotify RSS feed (avoids CORS)
GET  /youtube-episodes    → Fetch YouTube episodes
GET  /apple-episodes      → Fetch Apple Podcasts episodes
POST /sync-all            → Sync all platforms (admin)
```

#### Live Sessions
```
GET  /live-sessions       → Get live sessions (?type=upcoming|ongoing|archived)
POST /live-sessions       → Create live session (admin)
PUT  /live-sessions/:id   → Update live session (admin/host)
DELETE /live-sessions/:id → Delete live session (admin/host)

# Live chat
GET  /chat/:sessionId     → Get chat messages
POST /chat/:sessionId     → Send chat message (requires auth)
POST /chat/:sessionId/:messageId/react → React to message (requires auth)
```

#### Interactions
```
POST /episode-like        → Like/unlike episode (requires auth)
POST /episode-comment     → Comment on episode (requires auth)
POST /episode-share       → Track share (public)
POST /episode-view        → Track view (public)
GET  /episode-analytics/:id → Get episode analytics (admin)
```

#### Tipping & Donations
```
POST /tips                → Send tip (requires auth)
GET  /tips/:sessionId     → Get tips for session
```

#### Store
```
GET  /products            → Get all products
GET  /products/:id        → Get product by ID
POST /products            → Create product (admin)
PUT  /products/:id        → Update product (admin)
DELETE /products/:id      → Delete product (admin)

POST /orders              → Create order (requires auth)
GET  /orders              → Get user orders (requires auth)
GET  /orders/:id          → Get order by ID (requires auth)
```

#### File Upload
```
POST /upload              → Upload file to storage (admin)
                           Body: multipart/form-data { file, path }
                           Returns: { url, path }
```

---

## 🚀 Deployment Architecture

### Current Production Setup

**Frontend Hosting:**
- **Host:** External hosting server (wardah.tasjeel.ae via cPanel)
- **Domain:** www.oriri.me
- **Deployment:** Manual file upload via cPanel File Manager
- **CDN:** None (direct hosting)

**Backend:**
- **Platform:** Supabase Edge Functions
- **Region:** Auto-selected by Supabase
- **Runtime:** Deno
- **Auto-deploy:** Managed by Supabase

**Important:** The Figma Make environment and production (www.oriri.me) are SEPARATE. Changes must be manually deployed to production.

### Deployment Process

#### 1. Deploying Frontend Changes

**Manual Deployment (Current):**
1. Export files from Figma Make environment
2. Log into cPanel at wardah.tasjeel.ae
3. Navigate to File Manager → public_html
4. Upload modified files
5. Clear browser cache
6. Test at www.oriri.me

**Files to Deploy:**
- `index.html` - Main HTML shell
- `/src/**` - All React components (if modified)
- `/styles/globals.css` - Styles
- `/public/**` - Static assets
- Built JavaScript bundles

#### 2. Deploying Backend Changes

Backend (Supabase Edge Functions) deploys automatically when you update files in `/supabase/functions/server/`.

**No manual deployment needed** for backend changes.

#### 3. Environment Variables

All environment variables are stored in Supabase and persist across deployments. No need to reconfigure unless adding new secrets.

### Build Configuration

**Vite Configuration (Implicit):**
```typescript
// Built-in Figma Make configuration
- Entry: /main.tsx
- Output: Optimized production bundles
- Assets: Hashed filenames
- Tree shaking: Enabled
- Minification: Enabled
```

**Tailwind CSS v4:**
```css
/* /styles/globals.css */
@import "tailwindcss";

/* Custom theme tokens defined inline */
```

**No `tailwind.config.js`** - Using Tailwind v4 defaults

---

## ⚠️ Known Issues & Important Notes

### Critical Notes

1. **Manual Production Deployment Required**
   - Changes in Figma Make are NOT automatically live at www.oriri.me
   - Must manually deploy to production server
   - Always test in Figma Make before deploying

2. **Protected Files - DO NOT MODIFY:**
   - `/src/app/components/figma/ImageWithFallback.tsx`
   - `/supabase/functions/server/kv_store.tsx`
   - `/utils/supabase/info.tsx`

3. **Import Paths**
   - Use relative paths for local imports
   - Absolute paths from project root won't work in production
   - Example: `import { X } from '../../utils/api'` NOT `import { X } from '/utils/api'`

4. **Image Imports**
   - Figma assets: `import img from "figma:asset/abc123.png"` (NO path prefix)
   - Local images: Use `<ImageWithFallback />` component
   - Never hardcode image URLs

5. **Environment Variables**
   - Frontend uses `%VARIABLE_NAME%` placeholders (replaced at build)
   - Backend uses `Deno.env.get('VARIABLE_NAME')`
   - NEVER expose `SUPABASE_SERVICE_ROLE_KEY` to frontend

6. **CORS Issues**
   - Spotify RSS: Use server-side proxy (`/spotify-rss-proxy`)
   - YouTube API: Server-side only
   - Never call external APIs directly from frontend

7. **KV Store Limitations**
   - No SQL queries (key-value only)
   - No relations (must denormalize data)
   - No transactions (eventual consistency)
   - Prefix queries are efficient (`getByPrefix`)

8. **Supabase Storage**
   - Private buckets (requires signed URLs)
   - 1-year expiry for signed URLs
   - Files stored in `make-a278ea32-episodes` bucket
   - Must recreate signed URLs before expiry

9. **Service Worker**
   - May cache aggressively
   - Clear cache during development: `navigator.serviceWorker.getRegistration().then(r => r.unregister())`
   - PWA updates require service worker update

10. **Analytics**
    - Google Analytics tracking code in `/index.html`
    - Must be manually updated in production
    - GA Measurement ID: `G-78GWK70520`

### Common Issues & Fixes

**Issue:** "Failed to resolve import" error
- **Fix:** Check import path is relative and correct from file location

**Issue:** VIP content not showing for trial users
- **Fix:** Check trial period hasn't expired, verify VIP status in KV store

**Issue:** Audio not playing on mobile
- **Fix:** Ensure HTTPS, check audio URL is accessible, verify no CORS issues

**Issue:** Admin dashboard not accessible
- **Fix:** Make user admin via `/make-admin` route or Supabase dashboard

**Issue:** Images not loading
- **Fix:** Use `ImageWithFallback` component, check signed URLs haven't expired

**Issue:** RSS feed not updating
- **Fix:** Clear cache, re-sync via admin dashboard, check RSS URL

---

## 👨‍💻 Development Workflow

### Getting Started

1. **Understand the Architecture**
   - Review this blueprint thoroughly
   - Explore the file structure
   - Understand the data flow (Frontend → Server → Database)

2. **Set Up Local Environment**
   - All environment variables are already configured
   - No additional setup needed for Figma Make environment
   - Test changes in preview before deploying

3. **Making Changes**
   - Edit files in Figma Make
   - Test thoroughly in preview
   - Check mobile responsive design
   - Verify no console errors
   - Test authentication flows
   - Verify VIP gating works

4. **Deploying to Production**
   - Export necessary files from Figma Make
   - Log into production hosting (cPanel)
   - Back up existing files (important!)
   - Upload new files
   - Clear browser cache
   - Test at www.oriri.me
   - Monitor for errors

5. **Testing Checklist**
   - [ ] Homepage loads correctly
   - [ ] Episodes display from all sources (Spotify, YouTube, Admin)
   - [ ] Audio playback works
   - [ ] Login/signup flow works
   - [ ] VIP content is gated correctly
   - [ ] Trial period activates for new users
   - [ ] Admin dashboard accessible
   - [ ] Mobile responsive
   - [ ] PWA installable
   - [ ] Analytics tracking works

### Development Best Practices

1. **Component Creation**
   - Follow existing patterns
   - Use TypeScript for type safety
   - Create reusable components in `/components/ui/`
   - Document complex components

2. **State Management**
   - Use existing contexts when possible
   - Create new context only if necessary
   - Keep state as close to usage as possible
   - Avoid prop drilling

3. **API Integration**
   - Always use server-side proxy for external APIs
   - Handle errors gracefully
   - Show loading states
   - Cache responses when appropriate

4. **Styling**
   - Use Tailwind utility classes
   - Follow dark mode design system
   - Maintain glassmorphism aesthetic
   - Ensure mobile-first responsive design

5. **Error Handling**
   - Use ErrorBoundary for React errors
   - Log errors to console with context
   - Show user-friendly error messages
   - Track errors with error tracking service

6. **Performance**
   - Lazy load components when possible
   - Optimize images (use ImageWithFallback)
   - Minimize bundle size
   - Use code splitting for routes

---

## 📚 Additional Documentation Files

The project includes extensive documentation from development history:

**Diagnostic Reports:**
- `FULL_APP_DIAGNOSTIC_REPORT.md` - Complete app audit
- `ADMIN_DASHBOARD_FULL_DIAGNOSIS_REPORT.md` - Admin features
- `VIP_SYSTEM_COMPREHENSIVE_DIAGNOSIS.md` - VIP system details
- `ANALYTICS_DIAGNOSIS_REPORT.md` - Analytics implementation

**Implementation Guides:**
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `ADMIN_MANAGEMENT_UI_GUIDE.md` - Admin UI usage
- `IMPLEMENTATION_USER_ANALYTICS_COMPLETE.md` - Analytics setup

**Status Reports:**
- `COMPREHENSIVE_LAUNCH_READINESS_REPORT.md` - Launch checklist
- `PRODUCTION_READINESS_SUMMARY.md` - Production status
- `LAUNCH_CHECKLIST.md` - Pre-launch tasks

**Feature Documentation:**
- `VIP_*.md` - VIP system implementation phases
- `STORE_FEATURE_COMPLETE_DIAGNOSIS.md` - Store functionality
- `COMMUNITY_*.md` - Community features

These documents provide detailed historical context but may contain outdated information. **This blueprint is the authoritative reference.**

---

## 🎓 Key Takeaways for Claude Code

1. **This is a PRODUCTION app** - Handle with care, test thoroughly
2. **Manual deployment required** - Changes don't auto-deploy to www.oriri.me
3. **All secrets configured** - Don't recreate environment variables
4. **Server-side proxies are critical** - Never bypass CORS protections
5. **VIP system is core** - Understand trial + subscription flow
6. **KV store is key-value only** - No SQL queries available
7. **Mobile-first design** - Always test responsive layouts
8. **Error logging is essential** - Log everything for debugging
9. **Protected files exist** - Don't modify kv_store.tsx or info.tsx
10. **Documentation is extensive** - Reference this blueprint for all decisions

---

## 📞 Support & Handoff

### What Claude Code Needs to Know

**Immediate Priorities:**
- Understand the VIP subscription flow (trial → paid)
- Know how content gating works
- Understand server-side RSS proxying
- Be familiar with admin dashboard capabilities

**Common Maintenance Tasks:**
- Adding new episodes (admin dashboard)
- Managing VIP subscribers
- Updating environment variables
- Deploying frontend changes to production
- Troubleshooting CORS issues
- Fixing mobile responsive issues

**Advanced Tasks:**
- Modifying VIP tier structure
- Adding new content sources
- Implementing new analytics
- Extending admin dashboard
- Optimizing performance

### Questions to Ask User

Before starting development, Claude Code should clarify:
- What specific changes are needed?
- Is this a bug fix or new feature?
- Does it require backend changes?
- Should it be deployed to production immediately?
- Are there any business logic constraints?

---

## ✅ Verification Checklist

To verify understanding of the system:

- [ ] I understand the three-tier architecture (Frontend → Server → Database)
- [ ] I know where to find environment variables
- [ ] I understand the VIP subscription flow
- [ ] I know how to make a user admin
- [ ] I understand content source integration (Spotify, YouTube, Admin)
- [ ] I know the deployment process for production
- [ ] I understand KV store limitations and usage
- [ ] I know which files are protected and cannot be modified
- [ ] I understand the server-side RSS proxy pattern
- [ ] I know how to test changes before deploying

---

## 🏁 Conclusion

This blueprint provides a comprehensive overview of the Oriri podcast app. The system is production-ready and currently serving users at www.oriri.me. All core features are implemented and working, including:

✅ Multi-source podcast integration (Spotify, YouTube, Admin)  
✅ VIP subscription system with 7-day trial  
✅ Role-based access control (Guest, Registered, VIP, Admin)  
✅ Comprehensive admin dashboard  
✅ Live streaming sessions  
✅ E-commerce store  
✅ Community features  
✅ Analytics tracking  
✅ PWA capabilities  
✅ Google Analytics integration  

The app is stable, scalable, and ready for continued development. This documentation should provide everything needed to understand, maintain, and extend the system.

**Good luck, Claude Code! 🚀**

---

*Document Version: 1.0*  
*Created: April 2, 2026*  
*Last Updated: April 2, 2026*  
*Author: AI Assistant (Figma Make)*  
*Handoff Target: Claude Code*
