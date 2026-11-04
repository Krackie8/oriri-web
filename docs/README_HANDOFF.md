# 🎧 Oriri Podcast App - Handoff Documentation
## Complete Transfer Package for Claude Code

**Status:** ✅ Ready for Transfer  
**Date:** April 2, 2026  
**Production Site:** https://www.oriri.me

---

## 🎯 START HERE

Welcome to the Oriri podcast app handoff package! This is your central navigation hub for all documentation.

---

## 📚 Documentation Structure

### **🚀 STEP 1: Quick Start (15 minutes)**
📄 **[CLAUDE_CODE_QUICK_START.md](./CLAUDE_CODE_QUICK_START.md)**
- Essential information to get started immediately
- Critical warnings and protected files
- Common tasks and troubleshooting
- Quick reference for daily development

**👉 Read this first if you need to start coding right away**

---

### **📖 STEP 2: Complete Understanding (60 minutes)**
📄 **[COMPLETE_PROJECT_BLUEPRINT.md](./COMPLETE_PROJECT_BLUEPRINT.md)**
- Comprehensive technical documentation
- Complete architecture overview
- All features documented in detail
- Backend implementation
- API endpoints
- Database schema
- Deployment guide

**👉 Your master reference for understanding the entire system**

---

### **🔍 STEP 3: File Navigation (20 minutes)**
📄 **[FILE_MANIFEST.md](./FILE_MANIFEST.md)**
- Complete index of all 250+ files
- Organized by category
- File descriptions and purposes
- Quick file finder
- Protected files list

**👉 Use this to navigate the codebase efficiently**

---

### **⚙️ STEP 4: Technical Deep Dive (45 minutes)**
📄 **[TECHNICAL_SPECIFICATIONS.md](./TECHNICAL_SPECIFICATIONS.md)**
- Detailed technical specifications
- API documentation
- Database schema details
- Design system (colors, typography, effects)
- Performance optimization
- Security considerations
- Code conventions

**👉 For implementation work and technical decisions**

---

### **📋 STEP 5: Handoff Summary (10 minutes)**
📄 **[HANDOFF_SUMMARY.md](./HANDOFF_SUMMARY.md)**
- Overview of what's being handed off
- Project statistics
- Critical information summary
- Getting started checklist
- Success criteria

**👉 Quick overview of the entire handoff**

---

## ⏱️ Time Investment Guide

### Minimum (Get Started Fast) - 30 minutes
1. CLAUDE_CODE_QUICK_START.md (15 min)
2. Scan FILE_MANIFEST.md (5 min)
3. Skim COMPLETE_PROJECT_BLUEPRINT.md TOC (10 min)

### Recommended (Full Understanding) - 2-3 hours
1. CLAUDE_CODE_QUICK_START.md (15 min)
2. COMPLETE_PROJECT_BLUEPRINT.md (60 min)
3. TECHNICAL_SPECIFICATIONS.md (45 min)
4. FILE_MANIFEST.md (20 min)
5. Explore codebase hands-on (30 min)

### Comprehensive (Mastery) - 6-10 hours
- Read all documentation thoroughly
- Explore entire codebase
- Test all features
- Make test changes
- Practice deployment

---

## 🎯 Quick Navigation

### By Task Type

**Need to understand the architecture?**
→ COMPLETE_PROJECT_BLUEPRINT.md → Section: "Technical Architecture"

**Need to find a specific file?**
→ FILE_MANIFEST.md → Search by category

**Need to know how VIP subscription works?**
→ COMPLETE_PROJECT_BLUEPRINT.md → Section: "VIP Subscription System"  
→ TECHNICAL_SPECIFICATIONS.md → Section: "VIP Subscription System"

**Need to make a user admin?**
→ CLAUDE_CODE_QUICK_START.md → Section: "Common Tasks"

**Need API endpoint reference?**
→ COMPLETE_PROJECT_BLUEPRINT.md → Section: "API Endpoints"  
→ TECHNICAL_SPECIFICATIONS.md → Section: "API Endpoints Reference"

**Need to deploy to production?**
→ CLAUDE_CODE_QUICK_START.md → Section: "Deploying to Production"  
→ COMPLETE_PROJECT_BLUEPRINT.md → Section: "Deployment Architecture"

**Need to understand the database?**
→ COMPLETE_PROJECT_BLUEPRINT.md → Section: "Database Schema (KV Store)"  
→ TECHNICAL_SPECIFICATIONS.md → Section: "Database Schema (KV Store)"

**Need to debug an issue?**
→ CLAUDE_CODE_QUICK_START.md → Section: "Troubleshooting"  
→ TECHNICAL_SPECIFICATIONS.md → Section: "Debugging & Troubleshooting"

**Need to understand content sources?**
→ COMPLETE_PROJECT_BLUEPRINT.md → Section: "Content Sources & API Integrations"  
→ TECHNICAL_SPECIFICATIONS.md → Section: "Content Sources & Integration"

---

## 🚨 Critical Information

### Must Know Before Starting

1. **Production is Separate**
   - Changes in Figma Make ≠ www.oriri.me
   - Manual deployment required

2. **Protected Files (NEVER MODIFY)**
   ```
   /src/app/components/figma/ImageWithFallback.tsx
   /supabase/functions/server/kv_store.tsx
   /utils/supabase/info.tsx
   ```

3. **All Environment Variables Already Configured**
   - Don't recreate them
   - Just use them in code

4. **CORS Solution**
   - Use server-side proxy for external APIs
   - Never call directly from frontend

5. **VIP System is Critical**
   - 7-day free trial (automatic)
   - AED20/month subscription
   - Content gating must work correctly

---

## 📊 Project Statistics

- **Total Files:** 250+
- **Lines of Code:** ~27,000
- **Components:** ~120
- **Documentation:** ~50,000 words
- **Features:** 10+ major features
- **Status:** ✅ Production-ready

---

## 🎨 Tech Stack at a Glance

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS v4 (dark mode)
- React Router 6
- Motion animations
- Lucide React icons

**Backend:**
- Supabase Edge Functions
- Hono web framework
- Deno runtime

**Database:**
- Supabase KV Store (key-value)
- Supabase Auth
- Supabase Storage

**APIs:**
- YouTube Data API v3
- Spotify RSS
- Google Analytics (G-78GWK70520)

---

## 🔑 User Roles

| Role | Access | Features |
|------|--------|----------|
| **Guest** | Public content | Browse, view |
| **Registered** | Public + Trial | 7-day VIP trial, interactions |
| **VIP** | All content | Unlimited access, AED20/month |
| **Admin** | Everything | Full management access |

---

## 📡 Content Sources

1. **Spotify RSS** (Public)
   - Server-side proxy
   - Real-time updates
   - Public access

2. **YouTube API** (Public)
   - YouTube Data API v3
   - Playlist-based
   - Public access

3. **Admin Upload** (VIP Only)
   - Supabase Storage
   - Private signed URLs
   - VIP-exclusive

---

## 🗂️ Essential File Locations

**Entry Points:**
- `/index.html` - HTML shell with GA
- `/main.tsx` - React entry point
- `/App.tsx` - Main app component

**Core Components:**
- `/components/HomeScreen.tsx`
- `/components/EpisodeDetailScreen.tsx`
- `/components/AdminDashboard.tsx`

**Backend:**
- `/supabase/functions/server/index.tsx`
- `/supabase/functions/server/vipRoutes.ts`

**State:**
- `/contexts/SimplePodcastContext.tsx`
- `/contexts/VipSubscriptionContext.tsx`

**APIs:**
- `/utils/simplePodcastApi.ts`
- `/utils/podcastApis/spotifyApi.ts`
- `/utils/podcastApis/youtubeApi.ts`

---

## ✅ Pre-Development Checklist

Before starting any development:

- [ ] Read CLAUDE_CODE_QUICK_START.md
- [ ] Understand user requirements
- [ ] Know which files to modify
- [ ] Check if backend changes needed
- [ ] Verify if VIP system affected
- [ ] Test in Figma Make preview
- [ ] Plan deployment strategy
- [ ] Back up before modifying
- [ ] Test mobile responsive
- [ ] Check for console errors
- [ ] Verify no breaking changes

---

## 🚀 Getting Started Steps

### Day 1: Orientation
1. Read CLAUDE_CODE_QUICK_START.md
2. Scan FILE_MANIFEST.md
3. Explore `/App.tsx` and component tree
4. Test the app in preview
5. Create a test account
6. Try VIP trial flow

### Day 2: Deep Dive
1. Read COMPLETE_PROJECT_BLUEPRINT.md
2. Review TECHNICAL_SPECIFICATIONS.md
3. Explore backend code
4. Understand VIP system thoroughly
5. Test admin dashboard
6. Practice making small changes

### Day 3: First Task
1. Pick a simple task
2. Make changes in Figma Make
3. Test thoroughly
4. Review changes
5. Plan deployment
6. Deploy to production (if ready)

---

## 📞 Support Resources

### Documentation Files
- **CLAUDE_CODE_QUICK_START.md** - Quick reference
- **COMPLETE_PROJECT_BLUEPRINT.md** - Master guide
- **TECHNICAL_SPECIFICATIONS.md** - Technical details
- **FILE_MANIFEST.md** - File navigation
- **HANDOFF_SUMMARY.md** - Overview

### Code Exploration
- Start with `/App.tsx`
- Follow component tree
- Check contexts for state
- Review backend routes

### Testing
- Preview in Figma Make
- Test all user flows
- Check mobile design
- Verify VIP gating
- Test audio playback

---

## 💡 Tips for Success

1. **Read Documentation First** - Don't skip the docs
2. **Start Small** - Make small changes initially
3. **Test Thoroughly** - Always test before deploying
4. **Follow Patterns** - Use existing code patterns
5. **Ask Questions** - Clarify requirements
6. **Back Up Files** - Before production deployment
7. **Check Mobile** - Always verify mobile responsive
8. **Monitor Logs** - Watch for errors
9. **Document Changes** - Keep change log
10. **Deploy Carefully** - Manual deployment requires care

---

## 🎯 Success Metrics

You're successful when:

- ✅ App remains stable and functional
- ✅ Users can access content reliably
- ✅ VIP system works correctly
- ✅ Admin can manage content easily
- ✅ Mobile experience is smooth
- ✅ No breaking changes
- ✅ New features work as expected
- ✅ Deployments are successful
- ✅ Performance remains good
- ✅ Users are satisfied

---

## 🎉 You're Ready!

Everything is documented and ready for you. The Oriri podcast app is:

- ✅ **Production-ready** - Live at www.oriri.me
- ✅ **Well-documented** - 50,000 words of documentation
- ✅ **Well-structured** - Clean, organized codebase
- ✅ **Feature-complete** - All major features implemented
- ✅ **Battle-tested** - Serving real users

**Welcome to the team, Claude Code!** 🎧

Start with [CLAUDE_CODE_QUICK_START.md](./CLAUDE_CODE_QUICK_START.md) and you'll be up to speed in no time.

---

## 📑 Documentation Index

All handoff documents:

1. **[README_HANDOFF.md](./README_HANDOFF.md)** (this file) - Navigation hub
2. **[CLAUDE_CODE_QUICK_START.md](./CLAUDE_CODE_QUICK_START.md)** - Quick start guide
3. **[COMPLETE_PROJECT_BLUEPRINT.md](./COMPLETE_PROJECT_BLUEPRINT.md)** - Master reference
4. **[TECHNICAL_SPECIFICATIONS.md](./TECHNICAL_SPECIFICATIONS.md)** - Technical details
5. **[FILE_MANIFEST.md](./FILE_MANIFEST.md)** - File index
6. **[HANDOFF_SUMMARY.md](./HANDOFF_SUMMARY.md)** - Overview

Plus 60+ historical documentation files in root directory.

---

**Total Documentation Package:**
- **Primary Docs:** 5 comprehensive documents
- **Total Words:** ~50,000 words
- **Read Time:** 2-3 hours (recommended path)
- **Quick Start:** 30 minutes (minimum path)

---

**Handoff Status:** ✅ Complete  
**Last Updated:** April 2, 2026  
**Prepared By:** AI Assistant (Figma Make)  
**For:** Claude Code  

**🚀 Ready for Development!**
