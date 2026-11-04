# Oriri Podcast App - Complete File Manifest
## Organized Index of All Project Files

---

## 📄 Documentation Files (Root Level)

### **🎯 PRIMARY HANDOFF DOCUMENTS (READ THESE FIRST)**
- **`COMPLETE_PROJECT_BLUEPRINT.md`** ⭐ - Comprehensive technical documentation for Claude Code
- **`CLAUDE_CODE_QUICK_START.md`** ⭐ - Quick reference guide and getting started
- **`FILE_MANIFEST.md`** ⭐ - This file - complete file index

### Diagnostic & Audit Reports
- `FULL_APP_DIAGNOSTIC_REPORT.md` - Complete application audit
- `ADMIN_DASHBOARD_FULL_DIAGNOSIS_REPORT.md` - Admin dashboard analysis
- `ADMIN_DASHBOARD_AUDIT_MOCK_VS_REAL.md` - Admin data verification
- `ADMIN_DASHBOARD_STATUS.md` - Admin feature status
- `VIP_SYSTEM_COMPREHENSIVE_DIAGNOSIS.md` - VIP system documentation
- `ANALYTICS_DIAGNOSIS_REPORT.md` - Analytics implementation details
- `STORE_FEATURE_COMPLETE_DIAGNOSIS.md` - E-commerce store documentation
- `PHASE1_DIAGNOSIS_REPORT.md` - Phase 1 development report
- `PHASE2_FULL_DIAGNOSIS_REPORT.md` - Phase 2 development report
- `community-diagnostic-report.md` - Community features analysis

### Implementation Guides
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - How to deploy to production
- `ADMIN_MANAGEMENT_UI_GUIDE.md` - Admin UI usage guide
- `IMPLEMENTATION_USER_ANALYTICS_COMPLETE.md` - Analytics setup
- `PHASE3_IMPLEMENTATION_GUIDE.md` - Phase 3 implementation

### Status & Checklist Reports
- `COMPREHENSIVE_LAUNCH_READINESS_REPORT.md` - Pre-launch verification
- `PRODUCTION_READINESS_SUMMARY.md` - Production readiness status
- `LAUNCH_CHECKLIST.md` - Launch task checklist
- `QUICK_DEPLOYMENT_CHECKLIST.md` - Fast deployment guide
- `QUICK_REFERENCE_CARD.md` - Quick reference
- `SYSTEM_STATUS_AFTER_ROLLBACK.md` - System status documentation
- `VERIFY_PRODUCTION_SETUP.md` - Production verification
- `VERIFY_USER_ANALYTICS.md` - Analytics verification

### Feature Implementation Records
- `VIP_PHASE_1A_COMPLETE.md` - VIP Phase 1A completion
- `VIP_PHASE_1B_COMPLETE.md` - VIP Phase 1B completion
- `VIP_PHASE_1C_COMPLETE.md` - VIP Phase 1C completion
- `VIP_PHASE_1D_COMPLETE.md` - VIP Phase 1D completion
- `VIP_PHASE_1D_TEST_REPORT.md` - VIP testing report
- `VIP_PHASE_1E_COMPLETE.md` - VIP Phase 1E completion
- `VIP_TAB_REVIEW.md` - VIP tab analysis
- `VIP_TAB_SIMPLIFIED.md` - VIP tab simplification
- `VIP_UPGRADE_REVIEW.md` - VIP upgrade flow review
- `VIP_BUTTONS_COMPLETE.md` - VIP button implementation
- `VIP_BUTTONS_FIXED.md` - VIP button fixes
- `VIP_FULLSCREEN_COMPLETE.md` - VIP fullscreen implementation
- `PHASE1_BUG_FIX_VERIFICATION.md` - Bug fix verification
- `PHASE1_CHANGES.md` - Phase 1 changes log
- `PHASE2_IMPLEMENTATION_COMPLETE.md` - Phase 2 completion
- `PHASE3_STEP3_COMPLETE.md` - Phase 3 step 3 completion
- `PHASE3_SUMMARY.md` - Phase 3 summary
- `OPTION_C_COMPLETE.md` - Option C implementation
- `MOCK_DATA_CONVERSION_COMPLETE.md` - Mock data conversion
- `CHECKPOINT_ENHANCEMENT_FIX_1.md` - Enhancement checkpoint

### Production & Rollback Reports
- `PRODUCTION_SETUP_IMPLEMENTATION_COMPLETE.md` - Production setup
- `PRODUCTION_SETUP_QUICK_GUIDE.md` - Quick production guide
- `PRODUCTION_SETUP_SUMMARY.md` - Production setup summary
- `INCIDENT_REPORT_PRODUCTION_SETUP_ROLLBACK.md` - Rollback incident
- `GAP_ANALYSIS_PRODUCTION_ENVIRONMENT.md` - Production gap analysis
- `GAP_ANALYSIS_USER_ANALYTICS.md` - Analytics gap analysis

### Miscellaneous
- `EXECUTIVE_SUMMARY.md` - Project executive summary
- `ADMIN_SECURITY_FIX_SUMMARY.md` - Security fixes
- `Attributions.md` - Third-party attributions

---

## 🎯 Core Application Files

### Entry Points
- **`/App.tsx`** - Main application component with provider tree
- **`/main.tsx`** - React application entry point
- **`/index.html`** - HTML shell with Google Analytics

### Global Styles
- **`/styles/globals.css`** - Global Tailwind CSS styles and theme tokens

### Type Definitions
- **`/types/podcast.ts`** - TypeScript interfaces for podcasts and episodes

---

## 🧩 Components (`/components/`)

### Core Application Components

#### **Layout & Structure**
- `AppLayout.tsx` - Main application layout wrapper
- `AppRouter.tsx` - React Router configuration
- `AppModals.tsx` - Global modal management
- `OptimizedProviders.tsx` - Context providers wrapper
- `Header.tsx` - Top header bar
- `SideMenu.tsx` - Desktop sidebar navigation
- `BottomTabBar.tsx` - Mobile bottom navigation

#### **Screens**
- `HomeScreen.tsx` - Main homepage with episode feed
- `EpisodeDetailScreen.tsx` - Individual episode detail view
- `EpisodeDetailWrapper.tsx` - Episode detail wrapper component
- `UnifiedEpisodeDetailScreen.tsx` - Unified episode view
- `SearchScreen.tsx` - Search functionality
- `ProfileScreen.tsx` - User profile screen
- `SettingsScreen.tsx` - App settings
- `StoreScreen.tsx` - E-commerce store
- `CommunityScreen.tsx` - Community features
- `LiveSessionsScreen.tsx` - Live streaming sessions
- `LoginScreen.tsx` - Login screen
- `CheckoutScreen.tsx` - Store checkout
- `OrderConfirmationScreen.tsx` - Order confirmation
- `ProductDetailScreen.tsx` - Product detail view

#### **Authentication & Onboarding**
- `AuthModal.tsx` - Login/signup modal
- `OnboardingFlow.tsx` - New user onboarding
- `UserFlowCoordinator.tsx` - User journey coordination

#### **Error Handling & Status**
- `ErrorBoundary.tsx` - React error boundary
- `SplashScreen.tsx` - App splash screen
- `SplashWrapper.tsx` - Splash screen wrapper
- `PWAStatus.tsx` - PWA installation status

#### **Audio & Media**
- `AudioPlayer.tsx` - Main audio player
- `MiniPlayer.tsx` - Mini player bar
- `EpisodeCard.tsx` - Episode card component

#### **Admin Components**
- `AdminDashboard.tsx` - Main admin dashboard
- `AdminSetup.tsx` - Admin initial setup
- `AdminSetupModal.tsx` - Admin setup modal
- `AdminProtectedRoute.tsx` - Admin route protection
- `UserManagement.tsx` - User management interface
- `RoleDemo.tsx` - Role demonstration component

#### **Notifications & Modals**
- `NotificationPanel.tsx` - Notification display
- `CartModal.tsx` - Shopping cart modal
- `SubscriptionPrompt.tsx` - VIP subscription prompt

#### **Testing & Debug**
- `APIDebugPanel.tsx` - API debugging panel
- `CommunityDebugPanel.tsx` - Community debug tools
- `VipDebugPanel.tsx` - VIP system debug tools
- `TestRSSScreen.tsx` - RSS feed testing
- `TestSpotifyScreen.tsx` - Spotify testing
- `SimpleRSSEpisodesScreen.tsx` - Simple RSS viewer

#### **Utility Components**
- `ShareDropdown.tsx` - Share dropdown menu
- `ListenOnMenu.tsx` - Listen on platform menu
- `YouTubeSourceSelector.tsx` - YouTube source picker
- `PlatformConfigModal.tsx` - Platform configuration
- `ProfileOrdersSection.tsx` - User orders section

---

### Admin Components (`/components/admin/`)

- `AdminManagement.tsx` - Admin user management
- `EpisodeManagement.tsx` - Episode CRUD operations
- `EpisodeForm.tsx` - Episode creation/edit form
- `VipManagement.tsx` - VIP subscriber management
- `StoreManagement.tsx` - Product management
- `AdminOrderManagement.tsx` - Order management
- `LiveSessionManagement.tsx` - Live session scheduling
- `SimpleLiveSessionManagement.tsx` - Simplified live sessions
- `LiveSessionScheduler.tsx` - Session scheduler UI
- `CommunityManagement.tsx` - Community moderation
- `ContentGenerator.tsx` - AI content generation
- `PlatformConfig.tsx` - External platform configuration
- `SocialMediaDashboard.tsx` - Social media automation
- `EpisodeAnalyticsDashboard.tsx` - Episode analytics overview
- `EpisodeAnalyticsOverview.tsx` - Analytics summary
- `EpisodeDetailAnalytics.tsx` - Detailed episode metrics

---

### VIP Components (`/components/vip/`)

- `VipGateComponent.tsx` - Content access gate
- `VipUserExperience.tsx` - VIP user wrapper
- `SubscriptionModal.tsx` - Subscription purchase flow
- `VipBenefitsDisplay.tsx` - VIP benefits showcase

---

### Interaction Components (`/components/interactions/`)

- `EpisodeInteractionBar.tsx` - Like/comment/share bar
- `ShareModal.tsx` - Share options modal
- `CommentsModal.tsx` - Episode comments modal
- `PostCommentsModal.tsx` - Community post comments
- `TipModal.tsx` - Creator tipping modal

---

### Live Session Components (`/components/live/`)

- `EnhancedTipModal.tsx` - Enhanced tipping modal
- `LiveTipAnimations.tsx` - Tip animation effects
- `LiveTipDashboard.tsx` - Live tip dashboard
- `LiveTipTicker.tsx` - Live tip ticker display

---

### Comment Components (`/components/comments/`)

- `EpisodeCommentsSection.tsx` - Episode comments section

---

### Skeleton Loaders (`/components/skeletons/`)

- `EpisodeSkeleton.tsx` - Episode card skeleton
- `HomeScreenSkeleton.tsx` - Home screen skeleton

---

### UI Components (`/components/ui/`)

**Form Elements:**
- `button.tsx` - Button component
- `input.tsx` - Input field
- `input-otp.tsx` - OTP input
- `textarea.tsx` - Text area
- `checkbox.tsx` - Checkbox
- `radio-group.tsx` - Radio button group
- `select.tsx` - Select dropdown
- `slider.tsx` - Slider input
- `switch.tsx` - Toggle switch
- `label.tsx` - Form label
- `form.tsx` - Form wrapper

**Layout & Navigation:**
- `card.tsx` - Card component
- `dialog.tsx` - Modal dialog
- `drawer.tsx` - Side drawer
- `sheet.tsx` - Bottom sheet
- `sidebar.tsx` - Sidebar component
- `tabs.tsx` - Tab navigation
- `accordion.tsx` - Accordion/collapsible
- `collapsible.tsx` - Collapsible section
- `separator.tsx` - Visual separator
- `scroll-area.tsx` - Scrollable area
- `resizable.tsx` - Resizable panels

**Feedback & Status:**
- `alert.tsx` - Alert message
- `alert-dialog.tsx` - Alert modal
- `toast.tsx` - Toast notifications
- `sonner.tsx` - Sonner toast integration
- `skeleton.tsx` - Skeleton loader
- `skeleton-loaders.tsx` - Multiple skeleton types
- `loading-overlay.tsx` - Loading overlay
- `progress.tsx` - Progress bar
- `badge.tsx` - Badge component
- `empty-state.tsx` - Empty state display
- `error-state.tsx` - Error state display

**Menus & Dropdowns:**
- `dropdown-menu.tsx` - Dropdown menu
- `context-menu.tsx` - Right-click menu
- `menubar.tsx` - Menu bar
- `navigation-menu.tsx` - Navigation menu
- `command.tsx` - Command palette
- `popover.tsx` - Popover
- `hover-card.tsx` - Hover card
- `tooltip.tsx` - Tooltip

**Data Display:**
- `table.tsx` - Table component
- `calendar.tsx` - Calendar picker
- `chart.tsx` - Chart components
- `carousel.tsx` - Carousel slider
- `aspect-ratio.tsx` - Aspect ratio container
- `avatar.tsx` - Avatar image
- `breadcrumb.tsx` - Breadcrumb navigation
- `pagination.tsx` - Pagination controls

**Specialized:**
- `pull-to-refresh.tsx` - Pull to refresh
- `touch-button.tsx` - Touch-optimized button
- `enhanced-image.tsx` - Enhanced image component

**Utilities:**
- `use-mobile.ts` - Mobile detection hook
- `utils.ts` - UI utility functions
- `toggle.tsx` - Toggle button
- `toggle-group.tsx` - Toggle button group

---

### Figma Components (`/components/figma/`)

- **`ImageWithFallback.tsx`** ⚠️ PROTECTED - Do not modify

---

## 🔄 Context Providers (`/contexts/`)

- **`index.ts`** - Context exports
- `SimplePodcastContext.tsx` - Podcast episode management
- `VipSubscriptionContext.tsx` - VIP subscription state
- `EpisodeInteractionContext.tsx` - Episode interactions (likes, comments, shares)
- `EpisodeManagementContext.tsx` - Episode CRUD operations
- `AdminContext.tsx` - Admin functionality
- `StoreContext.tsx` - E-commerce store state
- `CartContext.tsx` - Shopping cart state
- `ModalContext.tsx` - Global modal management
- `NotificationContext.tsx` - Notification system
- `LiveTipContext.tsx` - Live tipping functionality
- `RSSEpisodesContext.tsx` - RSS episode management
- `PodcastPlatformContext.tsx` - Platform configuration
- `CommunityEngagementContext.tsx` - Community features
- `SocialMediaAutomationContext.tsx` - Social media automation
- `EpisodeAnalyticsContext.tsx` - Episode analytics

---

## 🪝 Custom Hooks (`/hooks/`)

**Authentication:**
- `useAuth.tsx` - Authentication state
- `useAuthHandlers.tsx` - Auth action handlers
- `usePermissions.tsx` - Permission checking

**Admin:**
- `useAdmin.tsx` - Admin operations

**Audio & Media:**
- `useAudioPlayer.tsx` - Audio playback control
- `useAudioContext.tsx` - Audio context management
- `useGlobalAudioPlayer.tsx` - Global audio player state
- `useEpisodePlayer.tsx` - Episode-specific player

**User & Profile:**
- `useUserProfile.tsx` - User profile data
- `useCommunityProfile.tsx` - Community profile

**Live & Sessions:**
- `useLiveSessions.tsx` - Live session management
- `useSimpleLiveSessions.tsx` - Simplified live sessions

**Metrics:**
- `useEpisodeMetrics.tsx` - Episode analytics

---

## 🛠️ Utilities (`/utils/`)

### API Services

**Main APIs:**
- `simplePodcastApi.ts` - Primary podcast API client
- `adminApi.ts` - Admin API operations
- `vipApi.ts` - VIP subscription API
- `vipAdminApi.ts` - VIP admin operations
- `frontendPodcastService.ts` - Frontend podcast utilities

### Podcast Platform APIs (`/utils/podcastApis/`)

- **`index.ts`** - Unified API exports
- `spotifyApi.ts` - Spotify RSS integration
- `youtubeApi.ts` - YouTube Data API v3 integration
- `applePodcastsApi.ts` - Apple Podcasts integration

### Content & Media Services

- `audioService.ts` - Audio player service
- `rssParser.ts` - RSS feed parsing
- `spotifyRSSService.ts` - Spotify RSS handler
- `youtubeRSSService.ts` - YouTube RSS handler
- `youtubeAPIServiceSafe.ts` - Safe YouTube API wrapper
- `audioGenerator.ts` - Audio generation utilities
- `transcriptService.ts` - Transcript generation

### Image Handling

- `imageErrorHandler.ts` - Image loading error handling
- `imageUtils.ts` - Image utility functions
- `IMAGE_ERROR_HANDLER_MIGRATION.md` - Image handler docs

### Supabase (`/utils/supabase/`)

- **`client.tsx`** - Supabase client instance
- **`info.tsx`** ⚠️ PROTECTED - Project credentials

### Error & Debug

- `errorTracking.ts` - Error tracking & logging
- `errorMessages.ts` - Error message constants
- `debugUtils.ts` - Debug utilities

### VIP System

- `vipMigration.ts` - VIP data migration
- `vipMigrationValidator.ts` - VIP migration validation
- `vipRollback.ts` - VIP system rollback
- `vipTestConsole.ts` - VIP testing console

### PWA & Service Worker

- `serviceWorker.ts` - Service worker registration
- `pwaHealthCheck.ts` - PWA diagnostic tools

### Miscellaneous

- `paymentSimulation.ts` - Payment flow simulation
- `permissions.ts` - Permission utilities
- `notificationService.ts` - Notification service
- `mobileInteractions.ts` - Mobile interaction helpers
- `recentlyViewed.ts` - Recently viewed tracking
- `userJourneyTracking.ts` - User journey analytics
- `communityStatsGenerator.ts` - Community statistics

---

## 🔙 Backend (`/supabase/functions/server/`)

- **`index.tsx`** - Main Hono server with all routes
- **`kv_store.tsx`** ⚠️ PROTECTED - KV database utilities
- `vipRoutes.ts` - VIP subscription routes
- `vipHelpers.ts` - VIP helper functions
- `podcastOrchestrator.ts` - Multi-platform podcast orchestration

---

## 📱 Public Assets (`/public/`)

- `favicon.ico` - Browser favicon
- `manifest.json` - PWA manifest file
- `sw.js` - Service worker script
- Various app icons (192x192, 512x512, etc.)

---

## 📚 Guidelines (`/guidelines/`)

- `Guidelines.md` - Development guidelines

---

## 📊 File Statistics

**Total Files:** 250+

**By Category:**
- Documentation: ~60 files
- Components: ~120 files
- Utilities: ~35 files
- Contexts: ~15 files
- Hooks: ~12 files
- Backend: ~5 files
- Types: ~1 file

---

## 🔍 Quick File Finder

### Need to modify...

**Authentication?**
→ `/hooks/useAuth.tsx`, `/hooks/useAuthHandlers.tsx`, `/components/AuthModal.tsx`

**VIP System?**
→ `/contexts/VipSubscriptionContext.tsx`, `/supabase/functions/server/vipRoutes.ts`, `/components/vip/`

**Episodes?**
→ `/contexts/SimplePodcastContext.tsx`, `/components/EpisodeDetailScreen.tsx`, `/components/admin/EpisodeManagement.tsx`

**Admin Dashboard?**
→ `/components/AdminDashboard.tsx`, `/components/admin/`

**API Integration?**
→ `/utils/simplePodcastApi.ts`, `/utils/podcastApis/`

**Server Routes?**
→ `/supabase/functions/server/index.tsx`

**Styling?**
→ `/styles/globals.css`, individual component files

**UI Components?**
→ `/components/ui/`

---

## ⚠️ Files to NEVER Modify

These are protected system files:

1. `/src/app/components/figma/ImageWithFallback.tsx`
2. `/supabase/functions/server/kv_store.tsx`
3. `/utils/supabase/info.tsx`

Modifying these will break the application!

---

## 📝 Notes for Claude Code

- **Most Critical Files:** App.tsx, main.tsx, index.html, server/index.tsx
- **Most Modified Files:** HomeScreen.tsx, EpisodeDetailScreen.tsx, AdminDashboard.tsx
- **Largest Context:** SimplePodcastContext.tsx (handles all episode data)
- **Most Complex Logic:** VIP subscription flow, server-side RSS proxy
- **Best Starting Point:** App.tsx → Follow component tree

---

*Last Updated: April 2, 2026*  
*Total Files Documented: 250+*  
*Version: 1.0*
