# Claude Code Quick Start Guide
## Oriri Podcast App - Essential Reference

**Read this first, then refer to COMPLETE_PROJECT_BLUEPRINT.md for details**

---

## 🚨 Critical Information

### Production URL
- **Live Site:** https://www.oriri.me
- **Hosting:** External cPanel server (wardah.tasjeel.ae)
- **⚠️ Important:** Changes in Figma Make DO NOT auto-deploy. Manual deployment required.

### Protected Files (DO NOT MODIFY)
```
/src/app/components/figma/ImageWithFallback.tsx
/supabase/functions/server/kv_store.tsx
/utils/supabase/info.tsx
```

### Environment Secrets (Already Configured)
All secrets are stored in Supabase. No setup needed:
- Supabase credentials (URL, keys)
- YouTube API key
- Spotify credentials
- Google Analytics ID (G-78GWK70520)

---

## 📋 30-Second Overview

**What is Oriri?**
- Mobile-first podcast PWA for Renee & Amanda
- Content from 3 sources: Spotify RSS, YouTube API, Admin uploads
- VIP subscription system: 7-day trial → AED20/month
- Role-based access: Guest, Registered, VIP, Admin
- Full admin dashboard for content management

**Tech Stack:**
- Frontend: React 18 + TypeScript + Tailwind v4
- Backend: Supabase Edge Functions (Hono server)
- Database: Supabase KV Store (key-value)
- Auth: Supabase Auth
- Hosting: External cPanel (production), Figma Make (development)

---

## 🗂️ File Structure Essentials

### Most Important Files

**Entry Points:**
```
/index.html          → HTML shell with GA tracking
/main.tsx            → React entry point
/App.tsx             → Main app component
```

**Core Components:**
```
/components/AppLayout.tsx              → Main layout
/components/HomeScreen.tsx             → Homepage
/components/EpisodeDetailScreen.tsx    → Episode view
/components/AdminDashboard.tsx         → Admin panel
```

**Backend:**
```
/supabase/functions/server/index.tsx   → All server routes
/supabase/functions/server/vipRoutes.ts → VIP subscription logic
```

**State Management:**
```
/contexts/SimplePodcastContext.tsx     → Episodes & content
/contexts/VipSubscriptionContext.tsx   → VIP status
/contexts/AdminContext.tsx             → Admin operations
```

**API Integration:**
```
/utils/simplePodcastApi.ts             → Main API client
/utils/podcastApis/spotifyApi.ts       → Spotify RSS
/utils/podcastApis/youtubeApi.ts       → YouTube API
```

---

## 🔑 Key Concepts

### 1. VIP Subscription Flow

**User Journey:**
```
1. User signs up (registered role)
2. Auto-activates 7-day free trial
3. Trial ends → prompt to subscribe (AED20/month)
4. Subscription grants unlimited VIP access
```

**VIP Content Access:**
```typescript
// Episode with accessLevel: 'vip' requires:
- User logged in AND
- (VIP active OR trial active)
```

### 2. Content Sources

**Spotify RSS (Public):**
- Server-side proxy at `/spotify-rss-proxy`
- Avoids CORS issues
- Access level: `public`

**YouTube (Public):**
- YouTube Data API v3
- Fetches from playlist
- Access level: `public`

**Admin Upload (VIP Only):**
- Stored in Supabase Storage
- Signed URLs for playback
- Access level: `vip`

### 3. User Roles

```typescript
Guest         → Browse public content only
Registered    → Public + 7-day VIP trial
VIP           → Full access (paid subscription)
Admin         → Full system access + management
```

### 4. Backend Architecture

**Base URL:**
```
https://{projectId}.supabase.co/functions/v1/make-server-a278ea32
```

**Authentication:**
```typescript
// Protected routes
Headers: { 'Authorization': `Bearer ${accessToken}` }

// Public routes
Headers: { 'Authorization': `Bearer ${publicAnonKey}` }
```

**Key Routes:**
```
GET  /health              → Server status
GET  /vip/status          → Check VIP status
POST /vip/subscribe       → Subscribe to VIP
GET  /spotify-rss-proxy   → Spotify RSS feed (CORS fix)
POST /upload              → Upload files (admin)
GET  /live-sessions       → Live session schedule
```

---

## 🔧 Common Tasks

### Making a User Admin

**Method 1: API Call**
```typescript
POST /make-server-a278ea32/make-admin
Headers: { 'Authorization': `Bearer ${userAccessToken}` }
```

**Method 2: Supabase Dashboard**
```typescript
// Update user metadata
{
  role: 'admin',
  isAdmin: true
}
```

### Adding a New Episode (Admin)

1. Navigate to Admin Dashboard → Episode Management
2. Click "Add Episode"
3. Fill in details:
   - Title, description
   - Upload audio file (or URL)
   - Set access level (public/vip)
   - Add thumbnail
4. Save → Episode appears in feed

### Granting VIP Access Manually

```typescript
POST /make-server-a278ea32/vip/admin/grant
Body: {
  userId: 'user-id',
  tierId: 'default',
  durationDays: 30
}
```

### Deploying to Production

1. Test changes in Figma Make preview
2. Export modified files
3. Log into cPanel (wardah.tasjeel.ae)
4. Navigate to public_html
5. **Back up existing files first!**
6. Upload new files
7. Clear browser cache
8. Test at www.oriri.me

---

## 🐛 Troubleshooting

### Issue: Episode audio not playing
**Possible causes:**
- CORS issue → Use server-side proxy
- Invalid audio URL → Check URL is accessible
- Signed URL expired → Regenerate signed URL

### Issue: VIP content showing for non-VIP users
**Check:**
- Episode `accessLevel` is set to 'vip'
- VIP gate component is wrapping content
- User VIP status in KV store

### Issue: Changes not appearing on www.oriri.me
**Fix:**
- Remember: Figma Make ≠ Production
- Must manually deploy to production server
- Clear browser cache after deployment

### Issue: Images not loading
**Fix:**
- Use `ImageWithFallback` component
- Check image URLs are valid
- For Supabase Storage, regenerate signed URLs

### Issue: Admin dashboard not accessible
**Fix:**
- Make user admin (see "Making a User Admin" above)
- Check user_metadata has `role: 'admin'`
- Verify admin check logic in code

---

## 📊 Database (KV Store)

### Key Patterns

```typescript
// Get single value
const episode = await kv.get('episode_123')

// Get by prefix (all episodes)
const allEpisodes = await kv.getByPrefix('episode_')

// Set value
await kv.set('episode_123', episodeData)

// Delete
await kv.del('episode_123')
```

### Important Prefixes

```
episode_               → All episodes
episode_spotify_       → Spotify episodes
episode_youtube_       → YouTube episodes
episode_admin_         → Admin episodes
vip_user_              → VIP user statuses
vip_subscription_      → Subscriptions
live_session_          → Live sessions
product_               → Store products
order_                 → Customer orders
```

---

## 🎨 Styling Guidelines

### Tailwind Usage
```typescript
// Dark mode (always active)
className="bg-background text-foreground"

// Glassmorphism
className="bg-white/10 backdrop-blur-md"

// Mobile-first responsive
className="w-full md:w-1/2 lg:w-1/3"
```

### Color Palette
```css
--background: #030213       /* Dark blue-black */
--foreground: #ffffff       /* White text */
--primary: #6366f1         /* Indigo */
--accent: #ec4899          /* Pink */
--muted: rgba(255,255,255,0.1) /* Subtle backgrounds */
```

---

## 🚀 Next Steps for Claude Code

1. **Read the Complete Blueprint**
   - File: `/COMPLETE_PROJECT_BLUEPRINT.md`
   - Comprehensive documentation of entire system

2. **Explore the Codebase**
   - Start with `/App.tsx` and follow component tree
   - Check `/supabase/functions/server/index.tsx` for backend
   - Review contexts in `/contexts/`

3. **Test the App**
   - Preview in Figma Make
   - Test all user flows (guest → registered → VIP → admin)
   - Verify mobile responsiveness

4. **Ask Questions**
   - Clarify user requirements before coding
   - Understand business logic constraints
   - Confirm deployment needs

---

## 📞 Getting Help

### Documentation Files
- `COMPLETE_PROJECT_BLUEPRINT.md` - Full technical documentation
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `ADMIN_MANAGEMENT_UI_GUIDE.md` - Admin UI usage
- Various diagnostic reports in root directory

### Key Contacts
- User will provide specific requirements
- No external dependencies or API contacts needed

---

## ✅ Pre-Development Checklist

Before starting any development task:

- [ ] Read user requirements carefully
- [ ] Understand which files need modification
- [ ] Check if backend changes are needed
- [ ] Verify if change affects VIP system
- [ ] Test in Figma Make preview first
- [ ] Plan deployment strategy to production
- [ ] Back up files before modifying
- [ ] Test mobile responsive behavior
- [ ] Check for console errors
- [ ] Verify no breaking changes

---

**You're all set! Start with the user's requirements and refer to the Complete Blueprint for detailed information. Good luck! 🎉**
