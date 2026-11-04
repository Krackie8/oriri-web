# 🎧 Oriri Podcast App - Visual System Overview
## Quick Visual Reference for Claude Code

---

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         END USERS                                │
│                    www.oriri.me (Production)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌──────▼──────┐
         │   Desktop   │          │   Mobile    │
         │   Browser   │          │   Browser   │
         └──────┬──────┘          └──────┬──────┘
                │                         │
                └────────────┬────────��───┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    FRONTEND (React PWA)                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React Router • Context API • Custom Hooks             │    │
│  │  Tailwind CSS • Dark Mode • Glassmorphism              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Components:                                                     │
│  • HomeScreen         • EpisodeDetail    • AdminDashboard       │
│  • AudioPlayer        • VipGate          • SearchScreen         │
│  • AuthModal          • ProfileScreen    • StoreScreen          │
│                                                                  │
│  Contexts:                                                       │
│  • SimplePodcastContext    • VipSubscriptionContext             │
│  • EpisodeInteractionContext • AdminContext                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS/REST
                               │ Bearer Token Auth
┌──────────────────────────────▼──────────────────────────────────┐
│               BACKEND (Supabase Edge Functions)                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Hono Web Framework • Deno Runtime                     │    │
│  │  Route: /make-server-a278ea32/*                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Key Routes:                                                     │
│  • /health               • /episodes           • /vip/status    │
│  • /spotify-rss-proxy    • /youtube-episodes   • /upload        │
│  • /live-sessions        • /chat/:id           • /tips          │
│                                                                  │
│  Middleware:                                                     │
│  • CORS (open)           • Logger              • Auth checking  │
└───┬─────────────────┬──────────────────┬───────────────────┬───┘
    │                 │                  │                   │
    ▼                 ▼                  ▼                   ▼
┌─────────┐    ┌─────────────┐   ┌──────────────┐   ┌──────────┐
│Supabase │    │  Supabase   │   │   Supabase   │   │ External │
│  Auth   │    │  KV Store   │   │   Storage    │   │   APIs   │
│         │    │ (Database)  │   │  (Files)     │   │          │
└─────────┘    └─────────────┘   └──────────────┘   └──────────┘
   │                  │                  │                 │
   │ User Sessions    │ Key-Value Pairs  │ Audio Files     │ Content
   │ JWT Tokens       │ Episodes, VIP    │ Images          │ Spotify RSS
   │ OAuth            │ Users, Orders    │ Signed URLs     │ YouTube API
   └──────────────────┴──────────────────┴─────────────────┘
```

---

## 👥 User Roles & Permissions Flow

```
┌────────────────────────────────────────────────────────────┐
│                        USER TYPES                          │
└────────────────────────────────────────────────────────────┘

┌─────────────┐
│   GUEST     │  (Not Logged In)
└──────┬──────┘
       │
       ├─► Browse public episodes (Spotify, YouTube)
       ├─► View episode details
       └─► ❌ Cannot: Like, comment, access VIP content

                  │ Sign Up
                  ▼

┌─────────────┐
│ REGISTERED  │  (Logged In)
└──────┬──────┘
       │
       ├─► ✅ All guest permissions
       ├─► ✅ 7-day VIP trial (automatic)
       ├─► ✅ Like, comment, share episodes
       ├─► ✅ Access VIP content (during trial)
       └─► ✅ View profile & orders

                  │ Trial Ends
                  ▼

┌─────────────┐
│  VIP TRIAL  │  (Days 1-7)
└──────┬──────┘
       │
       ├─► ✅ All registered permissions
       ├─► ✅ Access exclusive VIP content
       ├─► ✅ VIP badge
       └─► ⏰ 7 days remaining

                  │ Subscribe (AED20/month)
                  ▼

┌─────────────┐
│    VIP      │  (Paid Subscriber)
└──────┬──────┘
       │
       ├─► ✅ All trial permissions
       ├─► ✅ Unlimited VIP content access
       ├─► ✅ No expiration (while subscribed)
       ├─► ✅ Priority support
       └─► ✅ Special VIP badge

                  │ Admin Grant
                  ▼

┌─────────────┐
│   ADMIN     │  (Administrator)
└──────┬──────┘
       │
       ├─► ✅ All VIP permissions
       ├─► ✅ Access admin dashboard
       ├─► ✅ CRUD episodes
       ├─► ✅ Manage users
       ├─► ✅ Manage VIP subscriptions
       ├─► ✅ View analytics
       ├─► ✅ Manage store
       └─► ✅ Schedule live sessions
```

---

## 📡 Content Sources Integration

```
┌────────────────────────────────────────────────────────────┐
│                    CONTENT SOURCES                          │
└────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  SPOTIFY RSS     │  (Public Content)
└────────┬─────────┘
         │
         ├─► RSS Feed URL
         ├─► Server-side proxy (CORS fix)
         ├─► Route: /spotify-rss-proxy
         ├─► Parsed to JSON episodes
         ├─► Access: Public
         └─► Platform: 'spotify'
                │
                ▼
         ┌─────────────┐
         │  Episode    │
         │  {          │
         │   id,       │
         │   title,    │
         │   audioUrl, │
         │   platform: │
         │   'spotify' │
         │  }          │
         └─────────────┘

┌──────────────────┐
│  YOUTUBE API     │  (Public Content)
└────────┬─────────┘
         │
         ├─► YouTube Data API v3
         ├─► API Key: YOUTUBE_API_KEY
         ├─► Playlist ID: YOUTUBE_PLAYLIST_ID
         ├─► Route: /youtube-episodes
         ├─► Access: Public
         └─► Platform: 'youtube'
                │
                ▼
         ┌─────────────┐
         │  Episode    │
         │  {          │
         │   id,       │
         │   title,    │
         │   audioUrl, │
         │   platform: │
         │   'youtube' │
         │  }          │
         └─────────────┘

┌──────────────────┐
│  ADMIN UPLOAD    │  (VIP-Only Content)
└────────┬─────────┘
         │
         ├─► Supabase Storage
         ├─► Bucket: make-a278ea32-episodes
         ├─► Route: /upload (multipart)
         ├─► Signed URLs (1 year expiry)
         ├─► Access: VIP subscribers only
         └─► Platform: 'admin'
                │
                ▼
         ┌─────────────┐
         │  Episode    │
         │  {          │
         │   id,       │
         │   title,    │
         │   audioUrl, │
         │   platform: │
         │   'admin',  │
         │   access:   │
         │   'vip'     │
         │  }          │
         └─────────────┘

         ALL EPISODES MERGED
                │
                ▼
    ┌──────────────────────┐
    │  SimplePodcastContext│
    │  allEpisodes[]       │
    └──────────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │    HomeScreen        │
    │  (Episode Feed)      │
    └──────────────────────┘
```

---

## 💎 VIP Subscription Flow

```
┌────────────────────────────────────────────────────────────┐
│                  VIP SUBSCRIPTION FLOW                      │
└────────────────────────────────────────────────────────────┘

    USER SIGNS UP
         │
         ▼
    ┌─────────────────────┐
    │  Create Account     │
    │  (Supabase Auth)    │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Auto-Activate      │
    │  7-Day Trial        │
    │  (VIP Access)       │
    └──────────┬──────────┘
               │
               │ Store in KV:
               │ vip_user_{userId}
               │ {
               │   status: 'trial',
               │   isTrialing: true,
               │   trialEnd: +7 days
               │ }
               │
               ▼
    ┌─────────────────────┐
    │  Trial Period       │
    │  (Days 1-7)         │
    │                     │
    │  ✅ Access VIP      │
    │     content         │
    │  ✅ VIP badge       │
    └──────────┬──────────┘
               │
               │ Day 7
               ▼
    ┌─────────────────────┐
    │  Trial Expires      │
    │                     │
    │  Show subscription  │
    │  prompt             │
    └──────────┬──────────┘
               │
         ┌─────┴─────┐
         │           │
    User │           │ User
    Subs │           │ Doesn't
         │           │ Subscribe
         ▼           ▼
┌─────────────┐  ┌─────────────┐
│  Subscribe  │  │   Trial     │
│  AED20/mo   │  │   Expired   │
│             │  │             │
│  Create     │  │  ❌ No VIP  │
│  vip_sub_   │  │    access   │
│  {id}       │  │             │
│             │  │  Can still  │
│  Update     │  │  access     │
│  vip_user_  │  │  public     │
│  {          │  │  content    │
│   status:   │  └─────────────┘
│   'active'  │
│  }          │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  VIP Active         │
│  (Subscribed)       │
│                     │
│  ✅ Unlimited VIP   │
│     content         │
│  ✅ Auto-renewal    │
│  ✅ Monthly billing │
│                     │
│  Can cancel         │
│  anytime           │
└─────────────────────┘
       │
       │ Cancel
       ▼
┌─────────────────────┐
│  Cancelled          │
│                     │
│  Access until       │
│  period end         │
│                     │
│  No auto-renewal    │
└─────────────────────┘
```

---

## 🔐 Authentication & Authorization Flow

```
┌────────────────────────────────────────────────────────────┐
│               AUTHENTICATION FLOW                           │
└────────────────────────────────────────────────────────────┘

    USER ATTEMPTS LOGIN
         │
         ▼
┌─────────────────────┐
│  AuthModal          │
│  (Frontend)         │
│                     │
│  Enter email &      │
│  password           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Auth      │
│  signInWithPassword │
│                     │
│  Returns:           │
│  - accessToken      │
│  - user object      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Store in Context   │
│  (useAuth)          │
│                     │
│  - currentUser      │
│  - accessToken      │
│  - isAuthenticated  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Fetch VIP Status   │
│  GET /vip/status    │
│                     │
│  Returns VIP tier   │
│  & user status      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update VIP Context │
│  (VipSubscription)  │
│                     │
│  - vipStatus        │
│  - isTrialing       │
│  - canAccessVip     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Check Role         │
│                     │
│  Guest → Home       │
│  Registered → Home  │
│  VIP → Home + VIP   │
│  Admin → Dashboard  │
└─────────────────────┘


PROTECTED API REQUEST
         │
         ▼
┌─────────────────────┐
│  Frontend Request   │
│                     │
│  Headers: {         │
│    Authorization:   │
│    Bearer ${token}  │
│  }                  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend Validation │
│  (Hono Server)      │
│                     │
│  Extract token      │
│  from header        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Auth      │
│  getUser(token)     │
│                     │
│  Validate token     │
│  Return user        │
└──────────┬──────────┘
           │
      ┌────┴────┐
      │         │
   Valid     Invalid
      │         │
      ▼         ▼
┌─────────┐  ┌─────────┐
│ Process │  │  401    │
│ Request │  │  Error  │
└─────────┘  └─────────┘
```

---

## 🗄️ Database (KV Store) Structure

```
┌────────────────────────────────────────────────────────────┐
│                    KV STORE SCHEMA                          │
└────────────────────────────────────────────────────────────┘

EPISODES
├── episode_spotify_{id}      → Spotify episodes
├── episode_youtube_{id}      → YouTube episodes
├── episode_admin_{id}        → Admin-uploaded episodes
└── episode_{id}              → General episode metadata

VIP SYSTEM
├── vip_tier_{tierId}         → VIP tier config (default)
├── vip_user_{userId}         → User VIP status
│   └── {
│        userId,
│        status: 'trial' | 'active' | 'cancelled',
│        isTrialing: boolean,
│        trialEnd: string,
│        currentPeriodEnd: string
│      }
└── vip_subscription_{subId}  → Subscription records

USERS
├── user_profile_{userId}     → User profiles
└── user_preferences_{userId} → User settings

INTERACTIONS
├── episode_like_{userId}_{episodeId}       → Likes
├── episode_comment_{commentId}             → Comments
├── episode_share_{shareId}                 → Shares
├── episode_view_{userId}_{episodeId}       → Views
└── episode_analytics_{episodeId}           → Metrics

LIVE SESSIONS
├── live_session_{sessionId}                → Sessions
├── chat_message_{sessionId}_{messageId}    → Chat
├── tip_{tipId}                             → Tips
└── reminder_{userId}_{sessionId}           → Reminders

STORE
├── product_{productId}       → Products
├── order_{orderId}           → Orders
└── cart_{userId}             → Carts

ADMIN
├── admin_settings            → Admin config
└── platform_config_{platform} → API configs


KV OPERATIONS
┌─────────────────────────────────────────┐
│ kv.get(key)              → Single get   │
│ kv.set(key, value)       → Single set   │
│ kv.del(key)              → Single delete│
│                                         │
│ kv.mget([keys])          → Multi get    │
│ kv.mset({key: val})      → Multi set    │
│ kv.mdel([keys])          → Multi delete │
│                                         │
│ kv.getByPrefix('prefix_') → Query      │
└─────────────────────────────────────────┘
```

---

## 🎨 Component Tree

```
App (BrowserRouter)
│
└── ErrorBoundary
    │
    └── OptimizedProviders (All Contexts)
        │
        ├── SimplePodcastContext
        ├── VipSubscriptionContext
        ├── EpisodeInteractionContext
        ├── AdminContext
        ├── StoreContext
        ├── ModalContext
        └── NotificationContext
            │
            └── SplashWrapper
                │
                └── UserFlowCoordinator
                    │
                    └── VipUserExperience
                        │
                        ├── AppLayout
                        │   │
                        │   ├── Header
                        │   │   ├── Logo
                        │   │   ├── SearchBar
                        │   │   ├── UserMenu
                        │   │   └── VipBadge
                        │   │
                        │   ├── SideMenu (Desktop)
                        │   │   ├── Navigation Links
                        │   │   ├── VIP Upgrade Button
                        │   │   └── Admin Link
                        │   │
                        │   ├── [Route Content]
                        │   │   │
                        │   │   ├── HomeScreen
                        │   │   │   ├── EpisodeCard (x many)
                        │   │   │   │   ├── Thumbnail
                        │   │   │   │   ├── Title
                        │   │   │   │   ├── PlayButton
                        │   │   │   │   └── VipBadge (if VIP)
                        │   │   │   └── LoadMore
                        │   │   │
                        │   │   ├── EpisodeDetailScreen
                        │   │   │   ├── VipGateComponent
                        │   │   │   │   └── [Content if access]
                        │   │   │   ├── EpisodeInfo
                        │   │   │   ├── AudioPlayer
                        │   │   │   ├── InteractionBar
                        │   │   │   │   ├── LikeButton
                        │   │   │   │   ├── CommentButton
                        │   │   │   │   ├── ShareButton
                        │   │   │   │   └── TipButton
                        │   │   │   └── CommentsSection
                        │   │   │
                        │   │   ├── SearchScreen
                        │   │   │   ├── SearchInput
                        │   │   │   ├── Filters
                        │   │   │   └── Results
                        │   │   │
                        │   │   ├── ProfileScreen
                        │   │   │   ├── UserInfo
                        │   │   │   ├── VipStatus
                        │   │   │   ├── OrderHistory
                        │   │   │   └── Settings
                        │   │   │
                        │   │   ├── AdminDashboard
                        │   │   │   ├── EpisodeManagement
                        │   │   │   ├── UserManagement
                        │   │   │   ├── VipManagement
                        │   │   │   ├── Analytics
                        │   │   │   └── StoreManagement
                        │   │   │
                        │   │   └── StoreScreen
                        │   │       ├── ProductGrid
                        │   │       └── CartButton
                        │   │
                        │   ├── MiniPlayer (Bottom)
                        │   │   ├── CurrentEpisode
                        │   │   ├── PlayPauseButton
                        │   │   ├── Progress
                        │   │   └── ExpandButton
                        │   │
                        │   └── BottomTabBar (Mobile)
                        │       ├── Home
                        │       ├── Search
                        │       ├── Library
                        │       └── Profile
                        │
                        └── AppModals
                            ├── AuthModal
                            ├── SubscriptionModal
                            ├── ShareModal
                            ├── CommentsModal
                            └── TipModal
```

---

## 🚀 Deployment Flow

```
┌────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT FLOW                          │
└────────────────────────────────────────────────────────────┘

DEVELOPMENT (Figma Make)
│
├── Make code changes
├── Test in preview
├── Fix bugs
├── Test mobile responsive
└── Verify all features work
        │
        ▼
EXPORT FILES
│
├── Export modified files
├── Note which files changed
└── Prepare for upload
        │
        ▼
PRODUCTION DEPLOYMENT
│
├── Log into cPanel (wardah.tasjeel.ae)
├── Navigate to public_html
├── 🚨 BACK UP existing files
├── Upload new files
├── Verify file permissions
└── Clear server cache
        │
        ▼
TESTING
│
├── Clear browser cache
├── Visit www.oriri.me
├── Test homepage
├── Test authentication
├── Test VIP content
├── Test audio playback
├── Test mobile responsive
└── Check console for errors
        │
        ▼
MONITORING
│
├── Watch Google Analytics
├── Monitor error logs
├── Check user feedback
└── Verify all features working


BACKEND DEPLOYMENT (Automatic)
│
└── Changes in /supabase/functions/server/
        │
        ▼
    Supabase Auto-Deploys
        │
        ▼
    Check Supabase Functions Dashboard
        │
        ▼
    View logs for errors
```

---

## 📊 Data Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                      DATA FLOW                              │
└────────────────────────────────────────────────────────────┘

USER OPENS APP
     │
     ▼
┌─────────────┐
│ App.tsx     │ Load React app
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Contexts    │ Initialize state
└──────┬──────┘
       │
       ├─► Check auth session
       │   └─► Fetch VIP status
       │
       ├─► Load episode cache
       │   └─► Check freshness
       │
       └─► Initialize audio player
           │
           ▼
┌─────────────────┐
│ HomeScreen      │ Render UI
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Episodes  │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐  ┌────────┐
│Spotify │  │YouTube │
│  RSS   │  │  API   │
└───┬────┘  └───┬────┘
    │           │
    │  Server   │
    │  Proxies  │
    │           │
    └─────┬─────┘
          │
          ▼
┌─────────────────┐
│ Merge Episodes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check VIP Status│
└────────┬────────┘
         │
         ├─► Filter by access level
         ├─► Apply VIP gating
         └─► Show VIP badges
             │
             ▼
┌─────────────────┐
│ Render Feed     │
│                 │
│ [Episode Cards] │
└─────────────────┘
         │
    USER CLICKS
         │
         ▼
┌─────────────────┐
│ Episode Detail  │
└────────┬────────┘
         │
         ├─► Check access permission
         │   │
         │   ├─► Has access → Show content
         │   └─► No access → Show VIP gate
         │
         ├─► Load audio
         ├─► Fetch comments
         └─► Track view
             │
             ▼
┌─────────────────┐
│ Update Analytics│
└─────────────────┘
```

---

## 🎯 Quick Reference Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FEATURE MATRIX                                    │
├──────────────┬─────────┬────────────┬───────┬─────────────┬────────┤
│   FEATURE    │  GUEST  │ REGISTERED │  VIP  │ VIP (Trial) │ ADMIN  │
├──────────────┼─────────┼────────────┼───────┼─────────────┼────────┤
│Browse Public │   ✅    │     ✅     │  ✅   │     ✅      │   ✅   │
│View Details  │   ✅    │     ✅     │  ✅   │     ✅      │   ✅   │
│Like Episodes │   ❌    │     ✅     │  ✅   │     ✅      │   ✅   │
│Comment       │   ❌    │     ✅     │  ✅   │     ✅      │   ✅   │
│Share         │   ✅    │     ✅     │  ✅   │     ✅      │   ✅   │
│VIP Content   │   ❌    │     ❌     │  ✅   │     ✅      │   ✅   │
│Upload Content│   ❌    │     ❌     │  ❌   │     ❌      │   ✅   │
│Manage Users  │   ❌    │     ❌     │  ❌   │     ❌      │   ✅   │
│View Analytics│   ❌    │     ❌     │  ❌   │     ❌      │   ✅   │
│Manage Store  │   ❌    │     ❌     │  ❌   │     ❌      │   ✅   │
│Purchase      │   ❌    │     ✅     │  ✅   │     ✅      │   ✅   │
│Trial Period  │   ❌    │     ✅     │  ❌   │     ✅      │   N/A  │
└──────────────┴─────────┴────────────┴───────┴─────────────┴────────┘
```

---

## 🔗 API Endpoints Quick Map

```
┌─────────────────────────────────────────────────────────────┐
│              API ENDPOINTS BY CATEGORY                       │
└─────────────────────────────────────────────────────────────┘

HEALTH & SYSTEM
├── GET  /health                    (Public)
└── POST /init-storage              (Admin)

AUTHENTICATION
├── GET  /user-info                 (Auth Required)
└── POST /make-admin                (Auth Required)

EPISODES
├── GET    /episodes                (Public)
├── GET    /episodes/:id            (Public)
├── POST   /episodes                (Admin)
├── PUT    /episodes/:id            (Admin)
└── DELETE /episodes/:id            (Admin)

EXTERNAL CONTENT
├── GET  /spotify-rss-proxy         (Public - CORS bypass)
├── GET  /youtube-episodes          (Public)
└── POST /sync-all                  (Admin)

VIP SYSTEM
├── GET  /vip/status                (Auth Required)
├── GET  /vip/tiers                 (Public)
├── POST /vip/subscribe             (Auth Required)
├── POST /vip/cancel                (Auth Required)
├── POST /vip/admin/grant           (Admin)
├── POST /vip/admin/revoke          (Admin)
├── GET  /vip/admin/users           (Admin)
└── GET  /vip/admin/stats           (Admin)

LIVE SESSIONS
├── GET    /live-sessions           (Public)
├── POST   /live-sessions           (Admin)
├── PUT    /live-sessions/:id       (Admin/Host)
└── DELETE /live-sessions/:id       (Admin/Host)

LIVE CHAT
├── GET  /chat/:sessionId                    (Public)
├── POST /chat/:sessionId                    (Auth Required)
└── POST /chat/:sessionId/:messageId/react   (Auth Required)

INTERACTIONS
├── POST /episode-like              (Auth Required)
├── POST /episode-comment           (Auth Required)
├── POST /episode-share             (Public)
├── POST /episode-view              (Public)
└── GET  /episode-analytics/:id     (Admin)

STORE
├── GET    /products                (Public)
├── GET    /products/:id            (Public)
├── POST   /products                (Admin)
├── PUT    /products/:id            (Admin)
├── DELETE /products/:id            (Admin)
├── POST   /orders                  (Auth Required)
├── GET    /orders                  (Auth Required)
└── GET    /orders/:id              (Auth Required)

TIPS & REMINDERS
├── POST /tips                      (Auth Required)
├── GET  /tips/:sessionId           (Public)
├── GET  /reminders                 (Auth Required)
└── POST /reminders                 (Auth Required)

FILE MANAGEMENT
└── POST /upload                    (Admin)
```

---

**This visual overview provides a quick-reference understanding of the Oriri system architecture, flows, and relationships. Use this alongside the detailed documentation for comprehensive understanding.**

---

*Last Updated: April 2, 2026*  
*Version: 1.0*  
*For: Claude Code Visual Reference*
