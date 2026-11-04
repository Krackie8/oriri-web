# Oriri Podcast App - Technical Specifications
## Quick Technical Reference

---

## 📋 System Overview

**Application Name:** Oriri (formerly "Tea for Two Podcast")  
**Type:** Mobile-first Progressive Web App (PWA)  
**Purpose:** Exclusive podcast platform for Renee & Amanda  
**Production URL:** https://www.oriri.me  
**Development Environment:** Figma Make  
**Status:** ✅ Live and Production-Ready

---

## 🏗️ Architecture

### Frontend

**Framework & Libraries:**
```yaml
Core:
  - React: 18.x
  - TypeScript: Latest
  - React Router: 6.x (BrowserRouter)

Styling:
  - Tailwind CSS: 4.0
  - Custom theme tokens
  - Dark mode (permanent)
  - Glassmorphism effects

UI Components:
  - Custom component library (shadcn/ui-inspired)
  - 40+ reusable components
  - Lucide React icons
  - Motion animations (formerly Framer Motion)

Forms & Data:
  - react-hook-form@7.55.0

Notifications:
  - sonner@2.0.3 (toast notifications)

Charts:
  - recharts (analytics visualization)
```

**State Management:**
- React Context API
- 15+ specialized contexts
- Custom hooks for business logic
- No Redux or external state library

**Routing Strategy:**
```typescript
BrowserRouter (not RouterProvider)
- Client-side routing
- Dynamic route parameters
- Protected routes (VIP, Admin)
- 404 fallback handling
```

### Backend

**Platform:** Supabase Edge Functions  
**Runtime:** Deno  
**Framework:** Hono (Express-like web framework)

**Server Configuration:**
```yaml
Base Route: /make-server-a278ea32/*
Port: Managed by Supabase
CORS: Open (all origins)
Authentication: Bearer token
Logging: Hono logger + console.log
```

**Server Imports:**
```typescript
import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'npm:@supabase/supabase-js@2'
```

### Database

**Type:** Key-Value Store (Supabase KV)  
**No SQL Available:** Pure key-value operations only

**Operations:**
```typescript
kv.get(key)                  // Single get
kv.set(key, value)           // Single set
kv.del(key)                  // Single delete
kv.mget([keys])              // Multi get
kv.mset({ key: val })        // Multi set
kv.mdel([keys])              // Multi delete
kv.getByPrefix('prefix_')    // Query by prefix
```

**Data Structure:**
- No relations
- No joins
- No transactions
- Denormalized data
- Prefix-based querying

### Storage

**Platform:** Supabase Storage  
**Bucket:** `make-a278ea32-episodes`  
**Access:** Private (signed URLs required)  
**URL Expiry:** 1 year (must regenerate)

**File Upload:**
```typescript
POST /make-server-a278ea32/upload
Content-Type: multipart/form-data
Body: { file: File, path: string }
Returns: { url: string, path: string }
```

### Authentication

**Provider:** Supabase Auth  
**Methods:**
- Email/password (primary)
- OAuth providers (Google, Facebook, GitHub - requires setup)

**User Roles:**
```typescript
type UserRole = 'guest' | 'registered' | 'vip' | 'admin';
```

**Session Management:**
```typescript
// Frontend - Supabase client
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signOut()
await supabase.auth.getSession()

// Backend - Token validation
const token = request.headers.get('Authorization')?.split(' ')[1]
const { data: { user } } = await supabase.auth.getUser(token)
```

---

## 🔐 Authentication & Authorization

### User Roles & Permissions

**Guest (Unauthenticated):**
- Browse public episodes (Spotify, YouTube)
- View episode details (public only)
- Cannot interact (like, comment)
- Cannot access VIP content
- Cannot see admin features

**Registered User:**
- All guest permissions
- Create account (email verification disabled)
- Auto-activated 7-day VIP trial
- Like, comment, share episodes
- Access VIP content during trial
- View own profile & orders

**VIP Subscriber (Paid):**
- All registered permissions
- Unlimited VIP content access
- No expiration (while subscription active)
- Special VIP badge
- Priority features
- AED20/month billing

**Admin:**
- All VIP permissions
- Access admin dashboard
- CRUD episodes (create, read, update, delete)
- Manage users (view, edit, delete, make admin)
- Manage VIP subscriptions (grant, revoke)
- View analytics dashboard
- Manage store products
- Schedule live sessions
- Social media automation

### Admin Identification

**Admin Check Logic:**
```typescript
function isAdmin(user) {
  return (
    user.user_metadata?.role === 'admin' ||
    user.email === 'admin@oriri.com' ||
    user.user_metadata?.isAdmin === true
  );
}
```

**Making a User Admin:**
```typescript
// Method 1: API call
POST /make-server-a278ea32/make-admin
Headers: { Authorization: `Bearer ${accessToken}` }

// Method 2: Supabase Admin API
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: {
    role: 'admin',
    isAdmin: true
  }
})
```

---

## 💎 VIP Subscription System

### Subscription Model

**Pricing:**
- **Price:** AED 20.00 per month
- **Currency:** AED (UAE Dirham)
- **Trial Period:** 7 days free
- **Billing Cycle:** Monthly
- **Auto-Renewal:** Yes (default)

**VIP Tier Configuration:**
```typescript
{
  tierId: 'default',
  displayName: 'VIP Membership',
  price: 20.00,
  currency: 'AED',
  billingCycle: 'monthly',
  trialDays: 7,
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

### VIP Status States

```typescript
type VipStatus = 'trial' | 'active' | 'cancelled' | 'expired';

interface VipUserStatus {
  userId: string;
  status: VipStatus;
  subscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string;          // 7 days from signup
  isTrialing: boolean;
  autoRenew: boolean;
  cancelledAt: string | null;
  metadata: {
    signupDate: string;
    trialStarted: string;
  };
}
```

### Access Control

**Content Access Levels:**
```typescript
type AccessLevel = 'public' | 'vip';

function canAccessContent(episode, user) {
  if (episode.accessLevel === 'public') {
    return true; // Public episodes - always accessible
  }
  
  if (episode.accessLevel === 'vip') {
    if (!user) return false; // Not logged in
    
    const vipStatus = user.vipStatus;
    
    // Check if active VIP or trialing
    return vipStatus?.status === 'active' || vipStatus?.isTrialing;
  }
  
  return false;
}
```

**VIP Gating Component:**
```typescript
<VipGateComponent 
  episodeId={id} 
  accessLevel="vip"
>
  <EpisodeContent /> {/* Rendered only if user has access */}
</VipGateComponent>
```

### VIP API Endpoints

```typescript
// User endpoints
GET  /make-server-a278ea32/vip/status       // Get VIP status (auth required)
GET  /make-server-a278ea32/vip/tiers        // Get available tiers (public)
POST /make-server-a278ea32/vip/subscribe    // Subscribe (auth required)
POST /make-server-a278ea32/vip/cancel       // Cancel subscription (auth required)

// Admin endpoints
POST /make-server-a278ea32/vip/admin/grant  // Grant VIP (admin)
POST /make-server-a278ea32/vip/admin/revoke // Revoke VIP (admin)
GET  /make-server-a278ea32/vip/admin/users  // List VIP users (admin)
GET  /make-server-a278ea32/vip/admin/stats  // VIP statistics (admin)
```

---

## 📡 Content Sources & Integration

### 1. Spotify RSS Feed

**Integration Type:** Server-side RSS proxy (avoids CORS)

**Configuration:**
```yaml
Show ID: SPOTIFY_SHOW_ID (env variable)
Feed URL: Spotify RSS feed URL
Access Level: public
Platform: spotify
```

**Implementation:**
```typescript
// Server route
GET /make-server-a278ea32/spotify-rss-proxy

// Fetches Spotify RSS feed
// Parses XML to JSON
// Returns episode array
```

**Episode Structure:**
```typescript
{
  id: string;              // Spotify episode ID
  title: string;
  description: string;
  audioUrl: string;        // MP3 URL from RSS
  imageUrl: string;        // Episode artwork
  duration: number;        // Seconds
  publishedDate: string;   // ISO 8601
  platform: 'spotify';
  accessLevel: 'public';
  platformUrl: string;     // Spotify web player URL
}
```

### 2. YouTube API Integration

**Integration Type:** YouTube Data API v3

**Configuration:**
```yaml
API Key: YOUTUBE_API_KEY (env variable)
Channel ID: YOUTUBE_CHANNEL_ID (env variable)
Playlist ID: YOUTUBE_PLAYLIST_ID (env variable)
Access Level: public
Platform: youtube
Quota: 10,000 units/day
```

**API Endpoints Used:**
```typescript
// Get videos from playlist
GET https://www.googleapis.com/youtube/v3/playlistItems
  ?part=snippet,contentDetails
  &playlistId=${YOUTUBE_PLAYLIST_ID}
  &key=${YOUTUBE_API_KEY}
  &maxResults=50

// Get video details
GET https://www.googleapis.com/youtube/v3/videos
  ?part=contentDetails,statistics
  &id=${videoIds}
  &key=${YOUTUBE_API_KEY}
```

**Episode Structure:**
```typescript
{
  id: string;              // YouTube video ID
  title: string;
  description: string;
  audioUrl: string;        // YouTube video URL
  imageUrl: string;        // Thumbnail (maxresdefault)
  duration: number;        // Parsed from ISO 8601 duration
  publishedDate: string;   // ISO 8601
  platform: 'youtube';
  accessLevel: 'public';
  views: number;           // View count
  likes: number;           // Like count
  platformUrl: string;     // youtube.com/watch?v=...
}
```

### 3. Admin-Uploaded Content

**Integration Type:** Direct upload to Supabase Storage

**Configuration:**
```yaml
Storage Bucket: make-a278ea32-episodes
Bucket Type: Private (signed URLs)
Access Level: vip (VIP-only content)
Platform: admin
Max File Size: Limited by Supabase plan
```

**Upload Flow:**
```
1. Admin selects audio file in dashboard
2. File uploaded via /upload endpoint
3. Stored in Supabase Storage
4. Metadata saved to KV store
5. Signed URL generated (1-year expiry)
6. Episode appears in feed with VIP gate
```

**Episode Structure:**
```typescript
{
  id: string;              // Generated episode ID
  title: string;
  description: string;
  audioUrl: string;        // Signed URL from Supabase Storage
  imageUrl: string;        // Episode artwork URL
  duration: number;        // Extracted from audio file
  publishedDate: string;   // ISO 8601
  platform: 'admin';
  accessLevel: 'vip';      // VIP-only
  uploadedBy: string;      // Admin user ID
}
```

---

## 🎨 Design System

### Color Palette

```css
/* Dark Mode Theme (Permanent) */
--background: #030213;              /* Dark blue-black background */
--foreground: #ffffff;              /* White text */
--primary: #6366f1;                 /* Indigo */
--primary-foreground: #ffffff;
--secondary: #1e293b;               /* Dark slate */
--secondary-foreground: #ffffff;
--accent: #ec4899;                  /* Pink accent */
--accent-foreground: #ffffff;
--muted: rgba(255,255,255,0.1);    /* Subtle backgrounds */
--muted-foreground: rgba(255,255,255,0.7);
--border: rgba(255,255,255,0.1);
--input: rgba(255,255,255,0.1);
--ring: #6366f1;
```

### Typography

```css
Font Family: 'Inter', system-ui, -apple-system, sans-serif
Font Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

Headings:
  h1: 2.25rem (36px), font-weight: 700
  h2: 1.875rem (30px), font-weight: 700
  h3: 1.5rem (24px), font-weight: 600
  h4: 1.25rem (20px), font-weight: 600
  
Body:
  base: 1rem (16px), font-weight: 400
  small: 0.875rem (14px)
  xs: 0.75rem (12px)
```

### Glassmorphism Effects

```css
/* Standard glass card */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

/* Glass modal */
.glass-modal {
  background: rgba(3, 2, 19, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Responsive Breakpoints

```css
/* Tailwind v4 breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large */
2xl: 1536px /* 2X large */

/* Mobile-first approach */
/* Base styles = mobile */
/* md: = tablet and up */
/* lg: = desktop and up */
```

### Component Spacing

```css
/* Consistent spacing scale */
spacing-1: 0.25rem (4px)
spacing-2: 0.5rem (8px)
spacing-3: 0.75rem (12px)
spacing-4: 1rem (16px)
spacing-6: 1.5rem (24px)
spacing-8: 2rem (32px)
spacing-12: 3rem (48px)
spacing-16: 4rem (64px)
```

---

## 🔌 API Endpoints Reference

### Base Configuration

```typescript
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a278ea32`;

// Headers for authenticated requests
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
};

// Headers for public requests
const publicHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`
};
```

### Complete Endpoint List

#### **Health & System**
```http
GET  /health              # Server health check
POST /init-storage        # Initialize storage bucket (admin)
```

#### **Authentication & Users**
```http
GET  /user-info           # Get current user info (auth)
POST /make-admin          # Make current user admin (auth)
```

#### **Episodes**
```http
GET  /episodes            # Get all episodes
GET  /episodes/:id        # Get episode by ID
POST /episodes            # Create episode (admin)
PUT  /episodes/:id        # Update episode (admin)
DELETE /episodes/:id      # Delete episode (admin)
```

#### **External Content**
```http
GET  /spotify-rss-proxy   # Proxy Spotify RSS feed (CORS bypass)
GET  /youtube-episodes    # Fetch YouTube episodes
GET  /apple-episodes      # Fetch Apple Podcasts episodes
POST /sync-all            # Sync all platforms (admin)
```

#### **VIP System**
```http
# User endpoints
GET  /vip/status          # Get VIP status (auth)
GET  /vip/tiers           # Get available tiers (public)
POST /vip/subscribe       # Subscribe to VIP (auth)
POST /vip/cancel          # Cancel subscription (auth)

# Admin endpoints
POST /vip/admin/grant     # Grant VIP to user (admin)
POST /vip/admin/revoke    # Revoke VIP from user (admin)
GET  /vip/admin/users     # List all VIP users (admin)
GET  /vip/admin/stats     # VIP statistics (admin)
```

#### **Live Sessions**
```http
GET  /live-sessions       # Get sessions (?type=upcoming|ongoing|archived)
POST /live-sessions       # Create session (admin)
PUT  /live-sessions/:id   # Update session (admin/host)
DELETE /live-sessions/:id # Delete session (admin/host)
```

#### **Live Chat**
```http
GET  /chat/:sessionId                    # Get chat messages
POST /chat/:sessionId                    # Send message (auth)
POST /chat/:sessionId/:messageId/react   # React to message (auth)
```

#### **Interactions**
```http
POST /episode-like        # Like/unlike episode (auth)
POST /episode-comment     # Comment on episode (auth)
POST /episode-share       # Track share (public)
POST /episode-view        # Track view (public)
GET  /episode-analytics/:id # Get analytics (admin)
```

#### **Tipping**
```http
POST /tips                # Send tip (auth)
GET  /tips/:sessionId     # Get tips for session
```

#### **Reminders**
```http
GET  /reminders           # Get user reminders (auth)
POST /reminders           # Set/remove reminder (auth)
```

#### **Store**
```http
GET  /products            # Get all products
GET  /products/:id        # Get product by ID
POST /products            # Create product (admin)
PUT  /products/:id        # Update product (admin)
DELETE /products/:id      # Delete product (admin)

POST /orders              # Create order (auth)
GET  /orders              # Get user orders (auth)
GET  /orders/:id          # Get order by ID (auth)
```

#### **File Upload**
```http
POST /upload              # Upload file (admin)
                          # Content-Type: multipart/form-data
                          # Body: { file: File, path: string }
                          # Returns: { url: string, path: string }
```

---

## 🗄️ Database Schema (KV Store)

### Key Naming Conventions

```typescript
// Episodes
episode_{episodeId}                    → Episode metadata
episode_spotify_{spotifyEpisodeId}     → Spotify episodes
episode_youtube_{youtubeVideoId}       → YouTube episodes
episode_admin_{adminEpisodeId}         → Admin-uploaded episodes

// VIP System
vip_tier_{tierId}                      → VIP tier configuration
vip_user_{userId}                      → User VIP status
vip_subscription_{subscriptionId}      → Subscription records
vip_trial_{userId}                     → Trial period tracking

// User Data
user_profile_{userId}                  → User profiles
user_preferences_{userId}              → User settings

// Interactions
episode_like_{userId}_{episodeId}      → Like tracking
episode_comment_{commentId}            → Comments
episode_share_{shareId}                → Share tracking
episode_view_{userId}_{episodeId}      → View history
episode_analytics_{episodeId}          → Episode metrics

// Live Sessions
live_session_{sessionId}               → Live session data
chat_message_{sessionId}_{messageId}   → Chat messages
tip_{tipId}                            → Tips/donations
reminder_{userId}_{sessionId}          → Session reminders

// Store
product_{productId}                    → Products
order_{orderId}                        → Orders
cart_{userId}                          → Shopping carts

// Admin & Config
admin_settings                         → Admin configuration
platform_config_{platform}             → Platform API configs
```

### Example Data Structures

**Episode:**
```typescript
{
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  publishedDate: string;
  platform: 'spotify' | 'youtube' | 'admin';
  accessLevel: 'public' | 'vip';
  platformEpisodeId?: string;
  platformUrl?: string;
  views?: number;
  likes?: number;
  guest?: string;
  category?: string;
  transcript?: string;
  createdAt: string;
  updatedAt?: string;
}
```

**VIP User Status:**
```typescript
{
  userId: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  subscriptionId: string;
  tierId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string;
  isTrialing: boolean;
  autoRenew: boolean;
  cancelledAt: string | null;
  metadata: {
    signupDate: string;
    trialStarted: string;
    lastPaymentDate?: string;
  };
}
```

**Live Session:**
```typescript
{
  id: string;
  title: string;
  description: string;
  scheduledTime: string;
  duration: string;
  hostId: string;
  hostName: string;
  hostImage: string;
  thumbnail: string;
  isLive: boolean;
  viewerCount: number;
  streamPlatform?: string;
  streamUrl?: string;
  createdAt: string;
  updatedAt?: string;
}
```

---

## 📦 Environment Variables

### Already Configured (Do Not Recreate)

```yaml
# Supabase
SUPABASE_URL:              Supabase project URL
SUPABASE_ANON_KEY:         Public anon key (frontend safe)
SUPABASE_SERVICE_ROLE_KEY: Service role key (backend only)
SUPABASE_DB_URL:           Database connection string

# YouTube
YOUTUBE_API_KEY:           YouTube Data API v3 key
YOUTUBE_CHANNEL_ID:        Renee & Amanda's channel ID
YOUTUBE_PLAYLIST_ID:       Playlist to fetch episodes from

# Spotify
SPOTIFY_SHOW_ID:           Spotify podcast show ID
SPOTIFY_CLIENT_ID:         Spotify API client ID
SPOTIFY_CLIENT_SECRET:     Spotify API client secret

# Apple Podcasts
APPLE_PODCASTS_SHOW_ID:    Apple Podcasts show ID
APPLE_PODCASTS_FEED_URL:   Apple Podcasts RSS feed URL

# Analytics
GA_MEASUREMENT_ID:         Google Analytics ID (G-78GWK70520)
```

### Accessing Environment Variables

**Frontend (via info.tsx):**
```typescript
import { projectId, publicAnonKey } from './utils/supabase/info';

// Usage
const url = `https://${projectId}.supabase.co/functions/v1/...`;
const headers = { 'Authorization': `Bearer ${publicAnonKey}` };
```

**Backend (Deno):**
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const youtubeKey = Deno.env.get('YOUTUBE_API_KEY');
```

---

## 🚀 Deployment Configuration

### Production Hosting

**Frontend:**
- Host: External cPanel server (wardah.tasjeel.ae)
- Domain: www.oriri.me
- Deployment: Manual file upload
- SSL: Enabled (HTTPS)

**Backend:**
- Platform: Supabase Edge Functions
- Auto-deploy: Yes (on file changes in /supabase/functions/server/)
- Region: Managed by Supabase

### Build Configuration

**Vite (Implicit):**
```yaml
Entry: /main.tsx
Output: Optimized bundles with hashing
Tree Shaking: Enabled
Minification: Enabled
Source Maps: Production disabled
```

**Tailwind CSS:**
```yaml
Version: 4.0
Config File: None (using defaults)
Import: @import "tailwindcss"; in globals.css
Purge: Automatic in production
```

**TypeScript:**
```yaml
Strict Mode: Enabled
Target: ES2020
Module: ESNext
JSX: react-jsx
```

### Deployment Checklist

Before deploying to production:
- [ ] Test all features in preview
- [ ] Check mobile responsive design
- [ ] Verify no console errors
- [ ] Test authentication flows
- [ ] Verify VIP gating works
- [ ] Test audio playback
- [ ] Check API integrations
- [ ] Backup existing production files
- [ ] Deploy to cPanel
- [ ] Clear CDN/browser cache
- [ ] Test live site at www.oriri.me
- [ ] Monitor for errors
- [ ] Verify Google Analytics tracking

---

## 🔧 Development Tools & Scripts

### Service Worker Management

**Register Service Worker:**
```typescript
// Auto-registered in main.tsx via serviceWorker.ts
import { serviceWorkerManager } from './utils/serviceWorker';
```

**Unregister (for development):**
```typescript
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) reg.unregister();
});
```

**Check Service Worker Status:**
```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('Service Worker ready:', registration.scope);
  });
}
```

### PWA Health Check

```typescript
import { pwaHealthCheck } from './utils/pwaHealthCheck';

// Run full diagnostic
const status = await pwaHealthCheck.runFullDiagnostic();
console.log('PWA Health:', status);
```

### Debug Utils

```typescript
import DebugUtils from './utils/debugUtils';

// Set log level
DebugUtils.setLogLevel('debug'); // 'debug' | 'info' | 'warn' | 'error'

// Log messages
DebugUtils.debug('Debug message', data);
DebugUtils.info('Info message', data);
DebugUtils.warn('Warning message', data);
DebugUtils.error('Error message', error);
```

### VIP Test Console

```typescript
// Auto-loaded in App.tsx
// Access via browser console:
window.vipTest.checkStatus();
window.vipTest.grantTrial();
window.vipTest.grantVIP();
window.vipTest.revokeVIP();
```

---

## ⚙️ Performance Optimization

### Code Splitting

```typescript
// Lazy load routes
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>
```

### Image Optimization

```typescript
// Always use ImageWithFallback
import { ImageWithFallback } from './src/app/components/figma/ImageWithFallback';

<ImageWithFallback 
  src={imageUrl} 
  alt={title}
  fallbackSrc="/placeholder.png"
/>
```

### API Response Caching

```typescript
// Cache episode data
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cachedData = localStorage.getItem('episodes_cache');
const cacheTime = localStorage.getItem('episodes_cache_time');

if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
  return JSON.parse(cachedData);
}
```

### Bundle Size Optimization

```typescript
// Import only what you need
import { Play, Pause } from 'lucide-react'; // ✅ Good
import * as Icons from 'lucide-react';      // ❌ Bad

// Use dynamic imports for heavy components
const ChartComponent = lazy(() => import('./ChartComponent'));
```

---

## 🐛 Debugging & Troubleshooting

### Common Issues

**1. CORS Errors**
- ✅ Solution: Use server-side proxy (`/spotify-rss-proxy`)
- ❌ Never call external APIs directly from frontend

**2. VIP Content Not Showing**
- Check user VIP status in KV store
- Verify trial hasn't expired
- Check VIP gate component is wrapping content
- Verify episode accessLevel is set correctly

**3. Audio Not Playing**
- Ensure HTTPS (HTTP audio may not work)
- Check audio URL is accessible
- Verify no CORS issues
- Test in different browsers

**4. Images Not Loading**
- Use ImageWithFallback component
- Check image URLs are valid
- Regenerate signed URLs if expired
- Verify Supabase Storage bucket access

**5. Backend Errors**
- Check console logs in Supabase Functions dashboard
- Verify environment variables are set
- Test with Postman/curl
- Check authentication headers

### Logging Strategy

**Frontend:**
```typescript
// Use DebugUtils for consistent logging
DebugUtils.info('Episode loaded', { id, title });
DebugUtils.error('Failed to load episode', error);

// Console prefix for easy filtering
console.log('[HomeScreen] Rendering episodes');
console.error('[API] Request failed:', error);
```

**Backend:**
```typescript
// Hono logger automatically logs requests
// Add custom logging
console.log('📝 Creating episode:', episodeData);
console.error('❌ Failed to create episode:', error);

// Use emoji for visual grep
// 📝 = Info
// ✅ = Success
// ❌ = Error
// ⚠️ = Warning
// 🔍 = Debug
```

---

## 📊 Analytics & Tracking

### Google Analytics

**Configuration:**
```html
<!-- In /index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-78GWK70520"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-78GWK70520');
</script>
```

**Custom Event Tracking:**
```typescript
// Track custom events
gtag('event', 'episode_play', {
  episode_id: episodeId,
  episode_title: title,
  platform: platform
});

gtag('event', 'vip_subscribe', {
  tier_id: tierId,
  price: price,
  trial: isTrial
});
```

### Internal Analytics

**Episode Metrics:**
```typescript
POST /make-server-a278ea32/episode-view
Body: { episodeId, userId?, timestamp }

POST /make-server-a278ea32/episode-like
Body: { episodeId, userId, action: 'like' | 'unlike' }

POST /make-server-a278ea32/episode-share
Body: { episodeId, platform, userId? }
```

**User Journey Tracking:**
```typescript
import { trackUserJourney } from './utils/userJourneyTracking';

trackUserJourney('page_view', {
  page: 'home',
  referrer: document.referrer
});

trackUserJourney('vip_gate_shown', {
  episodeId: id,
  userStatus: user?.vipStatus
});
```

---

## 🔒 Security Considerations

### Critical Security Rules

1. **NEVER expose SUPABASE_SERVICE_ROLE_KEY to frontend**
   - Only use in backend
   - Never log or return in API responses

2. **Always validate user authentication for protected routes**
   ```typescript
   const token = request.headers.get('Authorization')?.split(' ')[1];
   const { data: { user } } = await supabase.auth.getUser(token);
   if (!user) return c.json({ error: 'Unauthorized' }, 401);
   ```

3. **Validate admin permissions before admin operations**
   ```typescript
   const isAdmin = user.user_metadata?.role === 'admin' || 
                   user.email === 'admin@oriri.com';
   if (!isAdmin) return c.json({ error: 'Forbidden' }, 403);
   ```

4. **Sanitize user input**
   - Validate all user-provided data
   - Escape HTML in comments/descriptions
   - Limit file upload sizes

5. **Use signed URLs for private content**
   - All Supabase Storage files use signed URLs
   - Regenerate before 1-year expiry
   - Never expose storage bucket directly

---

## 📝 Code Conventions

### Naming Conventions

**Files:**
- Components: PascalCase (e.g., `EpisodeCard.tsx`)
- Utilities: camelCase (e.g., `audioService.ts`)
- Contexts: PascalCase with Context suffix (e.g., `VipSubscriptionContext.tsx`)
- Hooks: camelCase with use prefix (e.g., `useAuth.tsx`)

**Variables:**
```typescript
const episodeId = '123';           // camelCase for variables
const CACHE_DURATION = 5000;       // SCREAMING_SNAKE_CASE for constants
type UserRole = 'admin';           // PascalCase for types
interface Episode { ... }          // PascalCase for interfaces
```

**Functions:**
```typescript
function fetchEpisodes() { }       // camelCase for functions
const handleClick = () => { };     // camelCase for handlers
```

### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

// 2. Types/Interfaces
interface EpisodeCardProps {
  episode: Episode;
  onPlay: () => void;
}

// 3. Component
export function EpisodeCard({ episode, onPlay }: EpisodeCardProps) {
  // 4. State
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 6. Handlers
  const handleClick = () => {
    setIsPlaying(true);
    onPlay();
  };
  
  // 7. Render
  return (
    <div className="...">
      <Button onClick={handleClick}>Play</Button>
    </div>
  );
}
```

### TypeScript Guidelines

```typescript
// ✅ Use explicit types for function parameters and returns
function fetchEpisode(id: string): Promise<Episode> { }

// ✅ Use interfaces for object shapes
interface User {
  id: string;
  email: string;
  vipStatus?: VipStatus;
}

// ✅ Use type unions for fixed sets
type Platform = 'spotify' | 'youtube' | 'admin';

// ❌ Avoid 'any' type
const data: any = response.data;  // Bad
const data: Episode = response.data;  // Good

// ✅ Use optional chaining
const userName = user?.profile?.name ?? 'Guest';
```

---

## 🎯 Next Steps for New Developers

1. **Read Documentation (1-2 hours)**
   - This Technical Specifications doc
   - Complete Project Blueprint
   - Quick Start Guide

2. **Explore Codebase (2-3 hours)**
   - Start with `/App.tsx`
   - Follow component tree
   - Check `/contexts/` for state
   - Review `/supabase/functions/server/index.tsx`

3. **Test Features (1-2 hours)**
   - Create test account
   - Test VIP trial flow
   - Try admin dashboard (make yourself admin)
   - Play audio
   - Test mobile responsive

4. **Make Small Change (1 hour)**
   - Pick a simple task
   - Modify a component
   - Test in preview
   - Review changes

5. **Deploy to Production (1 hour)**
   - Practice deployment process
   - Back up files
   - Upload to cPanel
   - Verify live site

**Total Onboarding Time: ~6-10 hours**

---

*Last Updated: April 2, 2026*  
*Version: 1.0*  
*For: Claude Code Handoff*
