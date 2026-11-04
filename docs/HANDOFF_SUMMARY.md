# Oriri Podcast App - Handoff Summary
## Complete Transfer to Claude Code

**Date:** April 2, 2026  
**From:** AI Assistant (Figma Make)  
**To:** Claude Code  
**Status:** ✅ Ready for Transfer

---

## 📦 What's Being Handed Off

**Application:** Oriri - Tea for Two Podcast Platform  
**Production URL:** https://www.oriri.me  
**Status:** Live and Production-Ready  
**Current State:** Fully functional with all features operational

---

## 📚 Documentation Package

I've prepared **4 comprehensive documents** for you:

### 1. **COMPLETE_PROJECT_BLUEPRINT.md** ⭐ (PRIMARY DOCUMENT)
**Size:** ~25,000 words | **Read Time:** 45-60 minutes

**Contents:**
- Complete technical architecture
- Full project structure
- Backend implementation details
- Authentication & user management
- VIP subscription system (complete specs)
- Content sources & API integrations
- All features documented
- Component architecture
- State management patterns
- Database schema (KV store)
- Complete API endpoint reference
- Deployment architecture
- Known issues & troubleshooting
- Development workflow

**Purpose:** Your master reference for understanding the entire system

---

### 2. **CLAUDE_CODE_QUICK_START.md** ⭐ (START HERE)
**Size:** ~3,500 words | **Read Time:** 10-15 minutes

**Contents:**
- 30-second overview
- Critical information (protected files, secrets)
- Key concepts (VIP flow, content sources, roles)
- Common tasks (making admin, adding episodes, deploying)
- Troubleshooting guide
- Quick database reference
- Development checklist

**Purpose:** Get started immediately with essential information

---

### 3. **FILE_MANIFEST.md** (REFERENCE)
**Size:** ~5,000 words | **Read Time:** 20 minutes

**Contents:**
- Complete file index (250+ files)
- File descriptions
- Directory organization
- Quick file finder
- Protected files list
- File statistics

**Purpose:** Navigate the codebase efficiently

---

### 4. **TECHNICAL_SPECIFICATIONS.md** (DEEP DIVE)
**Size:** ~12,000 words | **Read Time:** 30-40 minutes

**Contents:**
- System overview & architecture
- Technology stack details
- Authentication & authorization specs
- VIP subscription system (technical details)
- Content source integration specs
- Design system (colors, typography, glassmorphism)
- Complete API endpoint documentation
- Database schema (detailed)
- Environment variables reference
- Performance optimization
- Security considerations
- Code conventions

**Purpose:** Technical deep-dive for implementation work

---

## 🎯 Recommended Reading Order

### For Quick Start (30 minutes):
1. **CLAUDE_CODE_QUICK_START.md** (15 min) - Get the essentials
2. Scan **FILE_MANIFEST.md** (5 min) - Understand file structure
3. Skim **COMPLETE_PROJECT_BLUEPRINT.md** TOC (10 min) - Know what's available

### For Full Understanding (2-3 hours):
1. **CLAUDE_CODE_QUICK_START.md** (15 min)
2. **COMPLETE_PROJECT_BLUEPRINT.md** (60 min) - Read thoroughly
3. **TECHNICAL_SPECIFICATIONS.md** (45 min) - Technical details
4. **FILE_MANIFEST.md** (20 min) - File navigation
5. Explore actual codebase (30 min) - Hands-on

---

## 🔑 Critical Information

### 🚨 MUST KNOW Before Starting

1. **Production is Separate**
   - Figma Make ≠ www.oriri.me
   - Manual deployment required
   - Always test in preview first

2. **Protected Files (NEVER MODIFY)**
   ```
   /src/app/components/figma/ImageWithFallback.tsx
   /supabase/functions/server/kv_store.tsx
   /utils/supabase/info.tsx
   ```

3. **All Secrets Configured**
   - Don't recreate environment variables
   - They're already in Supabase
   - Just use them in your code

4. **CORS Solution**
   - Never call external APIs from frontend
   - Always use server-side proxy
   - Example: `/spotify-rss-proxy` route

5. **VIP System is Core**
   - 7-day free trial (auto-activated)
   - AED20/month subscription
   - Content gating is critical
   - Understand before modifying

---

## 📊 Project Statistics

**Codebase Size:**
- Total Files: 250+
- Components: ~120
- Utilities: ~35
- Contexts: ~15
- Hooks: ~12
- Backend Routes: 30+
- Documentation Files: ~60

**Lines of Code (estimated):**
- Frontend: ~25,000 lines
- Backend: ~2,000 lines
- Total: ~27,000 lines

**Features:**
- User authentication & roles ✅
- VIP subscription system ✅
- Multi-source podcast integration ✅
- Audio player ✅
- Episode interactions ✅
- Live streaming sessions ✅
- E-commerce store ✅
- Admin dashboard ✅
- Analytics tracking ✅
- PWA capabilities ✅

---

## 🎨 Design & UX

**Design System:**
- Mobile-first responsive
- Dark mode (permanent)
- Glassmorphism effects
- Inter font family
- Lucide React icons

**Color Palette:**
- Background: #030213 (dark blue-black)
- Primary: #6366f1 (indigo)
- Accent: #ec4899 (pink)
- Glass effects with backdrop-blur

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

---

## 🏗️ Architecture Summary

### Three-Tier Architecture

```
┌─────────────────────────┐
│   Frontend (React)      │
│   - Mobile-first PWA    │
│   - Dark mode           │
│   - Tailwind CSS        │
└──────────┬──────────────┘
           │
           ↓
┌─────────────────────────┐
│   Backend (Hono)        │
│   - Supabase Functions  │
│   - API orchestration   │
│   - Auth middleware     │
└──────────┬──────────────┘
           │
           ↓
┌─────────────────────────┐
│   Database (KV Store)   │
│   - Key-value pairs     │
│   - No SQL available    │
│   - Prefix queries      │
└─────────────────────────┘
```

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- React Router 6
- Tailwind CSS v4
- Motion (animations)
- Lucide React (icons)

**Backend:**
- Supabase Edge Functions
- Hono web framework
- Deno runtime

**Database:**
- Supabase KV Store
- Supabase Auth
- Supabase Storage

**External APIs:**
- YouTube Data API v3
- Spotify RSS
- Google Analytics

---

## 🔐 Authentication & Roles

### User Roles

**Guest:**
- Browse public content
- No account required

**Registered:**
- Create account
- 7-day VIP trial (automatic)
- Like, comment, share

**VIP Subscriber:**
- All registered features
- Unlimited VIP content
- AED20/month

**Admin:**
- Full system access
- Content management
- User management
- Analytics dashboard

### Making a User Admin

```typescript
// Method 1: API
POST /make-server-a278ea32/make-admin
Headers: { Authorization: `Bearer ${accessToken}` }

// Method 2: Supabase
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: { role: 'admin', isAdmin: true }
})
```

---

## 📡 Content Sources

### 1. Spotify RSS Feed (Public)
- Server-side proxy (CORS fix)
- Route: `/spotify-rss-proxy`
- Access: Public
- Updates: Real-time from RSS feed

### 2. YouTube API (Public)
- YouTube Data API v3
- Playlist-based fetching
- Access: Public
- Quota: 10,000 units/day

### 3. Admin Upload (VIP Only)
- Supabase Storage
- Private bucket with signed URLs
- Access: VIP subscribers only
- Admin-curated content

---

## 💎 VIP Subscription System

### Key Details

**Pricing:**
- AED 20.00 per month
- 7-day free trial (auto-activated)
- Auto-renewal enabled

**Trial Flow:**
```
User Signs Up
    ↓
7-Day Trial Activated (automatic)
    ↓
Trial Ends
    ↓
Prompt to Subscribe (AED20/month)
    ↓
VIP Access Continues (if subscribed)
```

**Access Control:**
```typescript
// Public episodes - always accessible
episode.accessLevel === 'public'

// VIP episodes - requires VIP status
episode.accessLevel === 'vip' && 
  (user.vipStatus?.status === 'active' || user.vipStatus?.isTrialing)
```

---

## 🚀 Deployment Process

### Frontend (Manual)

**Current Setup:**
- Host: External cPanel (wardah.tasjeel.ae)
- Domain: www.oriri.me
- Process: Manual file upload

**Steps:**
1. Test in Figma Make preview
2. Export modified files
3. Log into cPanel
4. **Back up existing files**
5. Upload new files
6. Clear browser cache
7. Test at www.oriri.me

### Backend (Automatic)

**Current Setup:**
- Platform: Supabase Edge Functions
- Process: Auto-deploys on file changes

**No manual deployment needed for backend**

---

## 🐛 Common Issues & Solutions

### Issue: Changes not appearing on www.oriri.me
**Solution:** Remember to manually deploy to production server

### Issue: CORS errors when fetching external content
**Solution:** Use server-side proxy routes

### Issue: VIP content showing for non-VIP users
**Solution:** Check VIP gate component is wrapping content

### Issue: Images not loading
**Solution:** Use ImageWithFallback component

### Issue: Admin dashboard not accessible
**Solution:** Make user admin via API or Supabase

---

## 📞 Getting Started Checklist

For your first task, complete these steps:

- [ ] Read CLAUDE_CODE_QUICK_START.md
- [ ] Scan FILE_MANIFEST.md to understand structure
- [ ] Explore /App.tsx and component tree
- [ ] Check /supabase/functions/server/index.tsx
- [ ] Review /contexts/ for state management
- [ ] Test the app in preview mode
- [ ] Try creating a test account
- [ ] Make yourself admin
- [ ] Access admin dashboard
- [ ] Try adding an episode
- [ ] Test audio playback
- [ ] Verify VIP gating works
- [ ] Check mobile responsive design
- [ ] Review deployment process

**Estimated Time:** 2-3 hours for thorough exploration

---

## 💡 Tips for Success

### 1. Start Small
- Don't modify core systems immediately
- Make small, testable changes first
- Understand before refactoring

### 2. Test Thoroughly
- Always test in preview before deploying
- Check mobile responsive design
- Verify authentication flows
- Test VIP gating

### 3. Use Existing Patterns
- Follow established code conventions
- Reuse existing components
- Maintain consistency

### 4. Document Changes
- Comment complex logic
- Update documentation if needed
- Keep change log

### 5. Ask Questions
- Clarify user requirements
- Understand business logic
- Confirm deployment needs

---

## 🎓 Learning Path

### Week 1: Orientation
- Read all documentation
- Explore codebase
- Test all features
- Make small UI changes

### Week 2: Feature Development
- Understand VIP system deeply
- Work on feature enhancements
- Practice deployment process

### Week 3: Advanced Development
- Backend modifications
- API integrations
- Performance optimization

### Week 4: Mastery
- Complex feature development
- System architecture changes
- Production deployment

---

## 📂 Essential Files to Know

### Entry Points
- `/index.html` - HTML shell
- `/main.tsx` - React entry
- `/App.tsx` - Main app component

### Core Logic
- `/contexts/SimplePodcastContext.tsx` - Episode management
- `/contexts/VipSubscriptionContext.tsx` - VIP system
- `/supabase/functions/server/index.tsx` - All API routes

### Key Components
- `/components/HomeScreen.tsx` - Homepage
- `/components/EpisodeDetailScreen.tsx` - Episode view
- `/components/AdminDashboard.tsx` - Admin panel
- `/components/vip/VipGateComponent.tsx` - Content gating

### Utilities
- `/utils/simplePodcastApi.ts` - Main API client
- `/utils/podcastApis/spotifyApi.ts` - Spotify integration
- `/utils/podcastApis/youtubeApi.ts` - YouTube integration

---

## 🔒 Security Reminders

1. **Never expose SUPABASE_SERVICE_ROLE_KEY** to frontend
2. **Always validate authentication** for protected routes
3. **Check admin permissions** before admin operations
4. **Use signed URLs** for private content
5. **Sanitize user input** before storing/displaying

---

## 🎯 Your Mission

You are now the maintainer of a **live production application** serving real users at www.oriri.me. Your responsibilities include:

1. **Feature Development** - Add new features per user requests
2. **Bug Fixes** - Resolve issues quickly and efficiently
3. **Maintenance** - Keep the app running smoothly
4. **Optimization** - Improve performance and UX
5. **Documentation** - Keep docs updated

### Success Criteria

- App remains stable and functional
- Users can access content reliably
- VIP system works correctly
- Admin can manage content easily
- Mobile experience is smooth
- No breaking changes to production

---

## ✅ Handoff Verification

Before you start development, verify you understand:

- [ ] The three-tier architecture (Frontend → Server → Database)
- [ ] VIP subscription flow (trial → paid)
- [ ] Content gating mechanism
- [ ] Server-side RSS proxy pattern
- [ ] Authentication & user roles
- [ ] Admin dashboard capabilities
- [ ] Deployment process (manual for frontend)
- [ ] Protected files that can't be modified
- [ ] Environment variables (already configured)
- [ ] Database structure (KV store patterns)

---

## 🎉 Final Notes

**This application is in excellent shape:**
- All core features implemented ✅
- Production-ready and stable ✅
- Comprehensive documentation ✅
- Well-structured codebase ✅
- Clear patterns and conventions ✅

**You're inheriting a solid foundation.** The documentation I've created should give you everything needed to understand, maintain, and extend this system.

**Key to Success:**
1. Read the documentation thoroughly
2. Test before deploying to production
3. Follow existing patterns
4. Ask clarifying questions
5. Deploy carefully

---

## 📬 Questions?

If you encounter issues or need clarification:

1. **First:** Check the documentation
   - COMPLETE_PROJECT_BLUEPRINT.md has detailed info
   - TECHNICAL_SPECIFICATIONS.md has technical details
   - CLAUDE_CODE_QUICK_START.md has quick answers

2. **Second:** Explore the codebase
   - Follow similar patterns
   - Check existing implementations
   - Review context providers

3. **Third:** Ask the user
   - Clarify requirements
   - Understand business logic
   - Confirm deployment needs

---

## 🚀 You're Ready!

Everything is documented, organized, and ready for you to take over. The Oriri podcast app is a well-built, production-ready application with a solid foundation.

**Welcome to the Oriri team, Claude Code! 🎉**

Good luck with your development work. The users at www.oriri.me are counting on you to keep their podcast experience amazing.

---

**Handoff Complete ✅**

*Prepared by: AI Assistant (Figma Make)*  
*Date: April 2, 2026*  
*For: Claude Code*  
*Status: Ready for Transfer*

---

## 📋 Document Checklist

Handoff package includes:

- [x] COMPLETE_PROJECT_BLUEPRINT.md (25,000 words)
- [x] CLAUDE_CODE_QUICK_START.md (3,500 words)
- [x] FILE_MANIFEST.md (5,000 words)
- [x] TECHNICAL_SPECIFICATIONS.md (12,000 words)
- [x] HANDOFF_SUMMARY.md (this document)
- [x] Complete codebase (250+ files)
- [x] Production deployment at www.oriri.me
- [x] All environment variables configured
- [x] Google Analytics integrated
- [x] VIP system operational
- [x] Admin dashboard functional

**Total Documentation: ~50,000 words**

**Everything you need is here. Happy coding! 🎧**
