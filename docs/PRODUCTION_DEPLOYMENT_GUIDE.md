# 🚀 **PRODUCTION DEPLOYMENT GUIDE**
## Deploy Oriri Podcast App to Production

**Last Updated:** February 23, 2026  
**App Status:** ✅ Ready for Production  
**Deployment Type:** React SPA + Supabase Backend

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **Before You Start:**
- [x] Domain purchased ✅
- [x] Hosting purchased ✅
- [ ] Supabase project confirmed (should already exist)
- [ ] Admin account ready (khairulsyafiq@hotmail.com)
- [ ] Content ready (optional: VIP episodes, store products)
- [ ] Legal pages prepared (Terms, Privacy - can add later)

---

## 🏗️ **DEPLOYMENT ARCHITECTURE**

```
Your Setup:
┌─────────────────────────────────────────┐
│                                         │
│  Frontend (React + Vite)                │
│  Hosted on: Your Hosting Provider       │
│  Domain: your-domain.com                │
│                                         │
└──────────────┬──────────────────────────┘
               │
               │ API Calls
               ↓
┌─────────────────────────────────────────┐
│                                         │
│  Backend (Supabase Edge Functions)      │
│  Hosted on: Supabase Cloud              │
│  URL: <project-id>.supabase.co          │
│                                         │
└─────────────────────────────────────────┘
               │
               │ Database Queries
               ↓
┌─────────────────────────────────────────┐
│                                         │
│  Database (Supabase KV Store)           │
│  Storage (Supabase Storage - optional)  │
│  Auth (Supabase Auth)                   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎯 **DEPLOYMENT OPTIONS**

You have several hosting options. Choose based on what you purchased:

### **Option A: Vercel (Recommended - Free Tier Available)**
- ✅ Best for React apps
- ✅ Automatic builds from Git
- ✅ Custom domain support
- ✅ Free SSL certificate
- ✅ CDN included
- ✅ Zero configuration

### **Option B: Netlify (Recommended - Free Tier Available)**
- ✅ Similar to Vercel
- ✅ Drag-and-drop deployment
- ✅ Custom domain support
- ✅ Free SSL certificate
- ✅ Easy rollbacks

### **Option C: Traditional Hosting (cPanel, Shared Hosting)**
- ✅ You already own it
- ⚠️ Requires manual build upload
- ⚠️ May need SSL certificate setup
- ⚠️ Less automated than Vercel/Netlify

### **Option D: AWS S3 + CloudFront**
- ✅ Scalable
- ✅ Pay-as-you-go
- ⚠️ More complex setup
- ⚠️ Requires AWS knowledge

### **Option E: DigitalOcean / Linode / VPS**
- ✅ Full control
- ⚠️ Requires server management
- ⚠️ Need to configure Nginx/Apache

---

## 📦 **STEP 1: BUILD YOUR APP**

### **1.1 Update Production Environment Variables**

First, let's check what environment variables you need:

**Required for Frontend:**
```bash
# These are injected at build time in Figma Make
# Already configured in your Supabase secrets:
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ YOUTUBE_API_KEY
✅ YOUTUBE_CHANNEL_ID
✅ YOUTUBE_PLAYLIST_ID
✅ SPOTIFY_CLIENT_ID
✅ SPOTIFY_CLIENT_SECRET
✅ SPOTIFY_SHOW_ID
✅ APPLE_PODCASTS_SHOW_ID
✅ APPLE_PODCASTS_FEED_URL
```

**Note:** Since you're using Figma Make, environment variables are managed through Supabase and injected into your code via `/utils/supabase/info.tsx`. You don't need to manually set them during build.

### **1.2 Build the Frontend**

If you're building locally (before uploading to hosting):

```bash
# Navigate to your project directory
cd /path/to/oriri-app

# Install dependencies (if not already installed)
npm install

# Build for production
npm run build

# This creates a 'dist' folder with:
# - index.html
# - assets/
#   - *.js (bundled JavaScript)
#   - *.css (bundled CSS)
#   - images, fonts, etc.
```

**Build Output Location:** `/dist` folder

**What Gets Built:**
```
dist/
├── index.html (Main entry point)
├── assets/
│   ├── index-[hash].js (Main bundle)
│   ├── index-[hash].css (Styles)
│   ├── vendor-[hash].js (Dependencies)
│   └── [other assets]
├── manifest.json (PWA manifest)
├── sw.js (Service worker)
└── favicon.ico
```

---

## 🌐 **STEP 2: DEPLOY TO HOSTING**

### **🔷 OPTION A: Deploy to Vercel (Easiest & Recommended)**

#### **Method 1: Git Integration (Best)**

1. **Push your code to GitHub:**
   ```bash
   # If not already a Git repo
   git init
   git add .
   git commit -m "Initial commit for production"
   
   # Create a new GitHub repo and push
   git remote add origin https://github.com/YOUR_USERNAME/oriri-app.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite settings:
     - Framework: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Click "Deploy"

3. **Configure Custom Domain:**
   - Go to Project Settings → Domains
   - Add your domain: `your-domain.com`
   - Follow DNS instructions (add A/CNAME records)
   - Vercel provides SSL automatically

4. **Done!** Your app is live at `your-domain.com`

#### **Method 2: CLI Deployment**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: oriri-app
# - Directory: ./ (current directory)
# - Build command: npm run build
# - Output directory: dist

# Deploy to production
vercel --prod

# Add custom domain
vercel domains add your-domain.com
```

---

### **🔷 OPTION B: Deploy to Netlify**

#### **Method 1: Drag & Drop (Easiest)**

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to https://app.netlify.com
   - Drag the `/dist` folder onto Netlify
   - Netlify uploads and deploys instantly
   - You get a URL like `random-name-123.netlify.app`

3. **Configure Custom Domain:**
   - Go to Site Settings → Domain Management
   - Add custom domain: `your-domain.com`
   - Follow DNS instructions
   - SSL certificate auto-generated

#### **Method 2: Git Integration**

1. **Push to GitHub** (same as Vercel above)

2. **Connect on Netlify:**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Choose GitHub → Select repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

3. **Add custom domain** (same as drag & drop)

---

### **🔷 OPTION C: Deploy to Traditional Hosting (cPanel, Shared Hosting)**

If you bought traditional web hosting (cPanel, shared hosting, etc.):

#### **Step 1: Build Locally**

```bash
npm run build
```

#### **Step 2: Upload Files**

**Via FTP/SFTP:**
1. Connect to your hosting via FTP client (FileZilla, Cyberduck)
   - Host: ftp.your-domain.com
   - Username: Your hosting username
   - Password: Your hosting password
   - Port: 21 (FTP) or 22 (SFTP)

2. Navigate to public web directory:
   - Usually: `/public_html` or `/www` or `/httpdocs`

3. Upload ALL files from `/dist` folder:
   - Upload `index.html`
   - Upload `assets/` folder
   - Upload `manifest.json`
   - Upload `sw.js`
   - Upload `favicon.ico`

**Via cPanel File Manager:**
1. Log in to cPanel
2. Go to File Manager
3. Navigate to `public_html`
4. Click Upload
5. Upload a ZIP of your `/dist` folder
6. Extract the ZIP
7. Move contents to `public_html` root

#### **Step 3: Configure .htaccess (Important for React Router)**

Create a `.htaccess` file in your `public_html` directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
</IfModule>
```

**Why is this needed?**
- React Router uses client-side routing
- Without this, refreshing pages like `/profile` will give 404
- `.htaccess` tells Apache to serve `index.html` for all routes

#### **Step 4: Configure SSL Certificate**

**If using cPanel:**
1. Go to cPanel → SSL/TLS Status
2. Click "Run AutoSSL" (free Let's Encrypt certificate)
3. Wait for certificate to be issued
4. Enable HTTPS redirect in `.htaccess`:

```apache
# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

#### **Step 5: Test Your Site**

Visit `https://your-domain.com` and verify:
- ✅ Site loads correctly
- ✅ Navigation works (all routes)
- ✅ Images load
- ✅ API calls work
- ✅ Login/signup works

---

### **🔷 OPTION D: Deploy to AWS S3 + CloudFront**

For scalability and AWS infrastructure:

#### **Step 1: Build Your App**

```bash
npm run build
```

#### **Step 2: Create S3 Bucket**

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create S3 bucket
aws s3 mb s3://your-domain.com --region us-east-1

# Enable static website hosting
aws s3 website s3://your-domain.com \
  --index-document index.html \
  --error-document index.html
```

#### **Step 3: Upload Files**

```bash
# Upload dist folder to S3
aws s3 sync dist/ s3://your-domain.com \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "index.html" \
  --exclude "sw.js"

# Upload index.html without caching
aws s3 cp dist/index.html s3://your-domain.com/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

#### **Step 4: Configure CloudFront (CDN)**

1. Go to AWS CloudFront console
2. Create new distribution:
   - Origin: Your S3 bucket
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Alternate Domain Names (CNAMEs): your-domain.com
   - Custom SSL Certificate: Request via ACM (AWS Certificate Manager)
   - Default Root Object: index.html
3. Create custom error responses:
   - 403 → /index.html (for React Router)
   - 404 → /index.html (for React Router)

#### **Step 5: Configure DNS**

Point your domain to CloudFront:
- CNAME: your-domain.com → d123abc.cloudfront.net

---

## 🔐 **STEP 3: CONFIGURE DOMAIN & SSL**

### **3.1 DNS Configuration**

Once you've deployed to your hosting, configure your domain:

**For Vercel/Netlify:**
They provide DNS instructions. Typically:

```
Type: A
Name: @
Value: [IP address provided by hosting]

Type: CNAME
Name: www
Value: [provided by hosting]
```

**For Traditional Hosting:**
Point to your hosting provider's nameservers:

```
Nameserver 1: ns1.your-hosting-provider.com
Nameserver 2: ns2.your-hosting-provider.com
```

**DNS Propagation:**
- Takes 1-48 hours (usually 2-4 hours)
- Check status: https://dnschecker.org

### **3.2 SSL Certificate**

**Automatic (Vercel/Netlify):**
- SSL automatically issued via Let's Encrypt
- HTTPS enabled by default
- No action needed!

**Manual (Traditional Hosting):**
1. Use cPanel AutoSSL (free)
2. Or install Let's Encrypt manually
3. Or purchase SSL certificate

---

## ⚙️ **STEP 4: POST-DEPLOYMENT CONFIGURATION**

### **4.1 Verify Supabase Backend**

Your backend is already hosted on Supabase. Verify it's accessible:

```bash
# Test health endpoint
curl https://[your-project-id].supabase.co/functions/v1/make-server-a278ea32/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "message": "Server is running",
  "timestamp": "2026-02-23T..."
}
```

### **4.2 Configure CORS (if needed)**

Your Supabase backend already has CORS configured for `*` (all origins). If you want to restrict to your domain:

Edit `/supabase/functions/server/index.tsx`:

```typescript
app.use('*', cors({
  origin: ['https://your-domain.com', 'https://www.your-domain.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
```

Then redeploy Supabase function (if using Supabase CLI).

### **4.3 Update Environment Variables (if changed)**

If your domain changed or you need to update any secrets:

1. Go to Supabase Dashboard
2. Navigate to Project Settings → Edge Functions
3. Update environment variables
4. Restart edge functions

### **4.4 Test All Features**

Visit your production site and test:

**Authentication:**
- [ ] Sign up new user
- [ ] Log in existing user
- [ ] Log out
- [ ] Session persistence

**VIP System:**
- [ ] Start free trial
- [ ] View VIP content (if any uploaded)
- [ ] Cancel subscription
- [ ] Check subscription status in profile

**Store:**
- [ ] Browse products
- [ ] Add to cart
- [ ] Checkout (simulated payment)
- [ ] View order confirmation
- [ ] View orders in profile

**Content:**
- [ ] View episodes (Spotify, YouTube, Apple Podcasts)
- [ ] Play audio
- [ ] Like/favorite episodes
- [ ] Leave comments

**Community:**
- [ ] View feed
- [ ] Create post
- [ ] Like/comment on posts
- [ ] View leaderboard

**Admin:**
- [ ] Log in as admin (khairulsyafiq@hotmail.com)
- [ ] Access `/admin` dashboard
- [ ] View all admin tabs
- [ ] Create VIP episode
- [ ] Create store product
- [ ] Manage orders

**Mobile:**
- [ ] Test on iPhone
- [ ] Test on Android
- [ ] Test PWA install
- [ ] Test touch interactions

---

## 🔍 **STEP 5: MONITORING & DEBUGGING**

### **5.1 Enable Analytics**

**Option 1: Vercel Analytics (if using Vercel)**
- Automatically enabled
- View in Vercel dashboard

**Option 2: Google Analytics**

Add to `/index.html` (before `</head>`):

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Option 3: Plausible Analytics (Privacy-focused)**
- Sign up at https://plausible.io
- Add script tag to `index.html`

### **5.2 Error Tracking**

**Option 1: Sentry (Recommended)**

1. Sign up at https://sentry.io
2. Install Sentry:
   ```bash
   npm install @sentry/react
   ```
3. Initialize in your app (we can add this if needed)

**Option 2: LogRocket**
- Session replay + error tracking
- Sign up at https://logrocket.com

### **5.3 Uptime Monitoring**

**Option 1: UptimeRobot (Free)**
- Sign up at https://uptimerobot.com
- Add monitor: https://your-domain.com
- Get alerts if site goes down

**Option 2: Pingdom**
- More advanced monitoring
- Performance tracking

### **5.4 Check Logs**

**Frontend Logs:**
- Browser Console (F12 → Console)
- Check for JavaScript errors

**Backend Logs:**
- Supabase Dashboard → Logs
- Filter by Edge Functions
- Check for API errors

---

## 📱 **STEP 6: PWA SETUP (OPTIONAL BUT RECOMMENDED)**

Your app is already PWA-ready! Additional setup:

### **6.1 Verify PWA Assets**

Ensure these files are in your deployed `/dist` folder:
- ✅ `manifest.json` - PWA manifest
- ✅ `sw.js` - Service worker
- ✅ `favicon.ico` - App icon

### **6.2 Test PWA Installation**

**On Mobile:**
1. Visit your site on mobile browser
2. Look for "Add to Home Screen" prompt
3. Install and test offline functionality

**On Desktop:**
1. Visit your site in Chrome
2. Look for install icon in address bar
3. Click to install as desktop app

### **6.3 Update manifest.json (if needed)**

Edit `/public/manifest.json` with your domain:

```json
{
  "name": "Oriri Podcast",
  "short_name": "Oriri",
  "description": "Exclusive podcast platform by Oriri",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#a855f7",
  "background_color": "#0a0a0a",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ]
}
```

---

## 🎯 **STEP 7: OPTIMIZE FOR PRODUCTION**

### **7.1 Performance Optimization**

**Already Implemented:**
- ✅ Code splitting (React.lazy)
- ✅ Image lazy loading
- ✅ Service worker caching
- ✅ Minified build

**Additional (Optional):**
- [ ] Compress images with TinyPNG
- [ ] Enable Brotli compression (server-level)
- [ ] Use CDN for static assets

### **7.2 SEO Optimization**

Update `/index.html` meta tags:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- SEO Meta Tags -->
  <title>Oriri Podcast - Exclusive Content & Community</title>
  <meta name="description" content="Join Oriri for exclusive podcast episodes, VIP content, community discussions, and premium merchandise. Subscribe now for 7-day free trial!" />
  <meta name="keywords" content="Oriri, podcast, exclusive content, VIP membership, community" />
  <meta name="author" content="Oriri" />
  
  <!-- Open Graph (Social Media) -->
  <meta property="og:title" content="Oriri Podcast - Exclusive Content & Community" />
  <meta property="og:description" content="Join Oriri for exclusive podcast episodes and VIP content" />
  <meta property="og:image" content="https://your-domain.com/og-image.jpg" />
  <meta property="og:url" content="https://your-domain.com" />
  <meta property="og:type" content="website" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Oriri Podcast" />
  <meta name="twitter:description" content="Exclusive podcast content and community" />
  <meta name="twitter:image" content="https://your-domain.com/og-image.jpg" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/favicon.ico" />
</head>
```

### **7.3 Create robots.txt**

Create `/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://your-domain.com/sitemap.xml
```

### **7.4 Create sitemap.xml (Optional)**

Create `/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://your-domain.com/episodes</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://your-domain.com/community</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://your-domain.com/store</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

---

## ✅ **STEP 8: FINAL LAUNCH CHECKLIST**

Before announcing your launch:

### **Technical Checks:**
- [ ] Site loads on production domain
- [ ] All routes work (test navigation)
- [ ] Images load correctly
- [ ] API calls succeed (check browser console)
- [ ] Login/signup works
- [ ] VIP trial works
- [ ] Store checkout works
- [ ] Mobile responsive (test on actual devices)
- [ ] PWA installable
- [ ] SSL certificate active (https://)
- [ ] DNS propagated (site accessible worldwide)

### **Content Checks:**
- [ ] Upload initial VIP episodes (if available)
- [ ] Create initial store products (if available)
- [ ] Write welcome post in community
- [ ] Create first live session (if planned)
- [ ] Add "About" content (if page exists)

### **Admin Checks:**
- [ ] Admin account working (khairulsyafiq@hotmail.com)
- [ ] Admin dashboard accessible at /admin
- [ ] Can create episodes
- [ ] Can manage VIP subscriptions
- [ ] Can create store products
- [ ] Can moderate community posts

### **Legal Checks:**
- [ ] Terms of Service page (can add later)
- [ ] Privacy Policy page (can add later)
- [ ] Cookie notice (can add later)
- [ ] Refund policy (can add later)

### **Marketing Checks:**
- [ ] Social media accounts ready
- [ ] Launch announcement written
- [ ] Email list prepared (if any)
- [ ] Launch date set
- [ ] Beta testers invited (if doing soft launch)

---

## 🚀 **STEP 9: GO LIVE!**

### **Soft Launch (Recommended First):**

**Week 1-2: Private Beta**
```
Invite: 10-20 trusted users
Goals:
  - Test real-world usage
  - Gather feedback
  - Fix critical bugs
  - Refine UX

Actions:
  - Monitor error logs daily
  - Check user behavior
  - Respond to feedback
  - Make quick fixes
```

**Week 3-4: Limited Public**
```
Invite: 50-100 users
Goals:
  - Test scalability
  - Validate VIP conversions
  - Monitor performance
  - Build initial community

Actions:
  - Track key metrics
  - Engage with users
  - Create regular content
  - Encourage VIP trials
```

**Week 5+: Full Public Launch**
```
Invite: Everyone!
Goals:
  - Scale user base
  - Maximize growth
  - Establish brand
  - Generate revenue

Actions:
  - Marketing campaign
  - Content schedule
  - Community events
  - Partnerships/collaborations
```

### **Launch Day Checklist:**

**Morning:**
- [ ] Final site check (all features working)
- [ ] Check Supabase backend health
- [ ] Clear browser cache and test
- [ ] Test from different devices
- [ ] Prepare support channels (email, social)

**Launch:**
- [ ] Post launch announcement on social media
- [ ] Send email to any existing list
- [ ] Update all bios/links to point to new site
- [ ] Monitor traffic and errors
- [ ] Respond to early users

**Evening:**
- [ ] Review analytics (visitors, signups, trials)
- [ ] Check error logs
- [ ] Respond to feedback
- [ ] Plan content for next day

---

## 📊 **STEP 10: POST-LAUNCH MONITORING**

### **Daily Monitoring (First Week):**

**Metrics to Track:**
- [ ] Total visitors
- [ ] New signups
- [ ] VIP trial starts
- [ ] Store orders
- [ ] Community posts
- [ ] Error rate
- [ ] Page load time

**Tools to Use:**
- Vercel/Netlify analytics (traffic)
- Supabase dashboard (backend health)
- Browser console (frontend errors)
- Google Analytics (user behavior)

### **Weekly Monitoring:**

**KPIs to Review:**
- Total users (growth rate)
- Trial → Paid conversion rate
- Store revenue
- Community engagement
- Content consumption (episode plays)
- Churn rate

**Actions:**
- Analyze what's working
- Fix any recurring issues
- Plan content improvements
- Engage with community
- Iterate on features

---

## 🆘 **TROUBLESHOOTING COMMON ISSUES**

### **Issue 1: Site Not Loading**

**Symptoms:** Domain shows error or doesn't load

**Solutions:**
1. Check DNS propagation: https://dnschecker.org
2. Wait 2-4 hours for DNS to propagate
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try incognito/private window
5. Check hosting control panel (site deployed?)

### **Issue 2: API Calls Failing**

**Symptoms:** Login doesn't work, content not loading

**Solutions:**
1. Check browser console for CORS errors
2. Verify Supabase backend is running:
   ```bash
   curl https://[project-id].supabase.co/functions/v1/make-server-a278ea32/health
   ```
3. Check if environment variables are set correctly
4. Verify network requests in DevTools (F12 → Network)

### **Issue 3: Routes Returning 404**

**Symptoms:** Refreshing page shows 404 error

**Solutions:**
1. Verify `.htaccess` file exists (traditional hosting)
2. Check Vercel/Netlify redirect rules
3. Ensure React Router is configured
4. Check hosting supports SPA routing

### **Issue 4: Images Not Loading**

**Symptoms:** Broken image icons

**Solutions:**
1. Check image paths are correct
2. Verify images uploaded to hosting
3. Check browser console for 404 errors
4. Use absolute URLs for external images

### **Issue 5: SSL Certificate Not Working**

**Symptoms:** "Not Secure" warning in browser

**Solutions:**
1. Wait for SSL to provision (can take 1-2 hours)
2. Force HTTPS redirect in `.htaccess`
3. Clear browser SSL cache
4. Contact hosting support if persists

### **Issue 6: Slow Performance**

**Symptoms:** Site loads slowly

**Solutions:**
1. Enable CDN (Cloudflare)
2. Optimize images (compress)
3. Enable caching headers
4. Check hosting resources (CPU, bandwidth)
5. Use Lighthouse (F12 → Lighthouse) to diagnose

---

## 📞 **SUPPORT & RESOURCES**

### **If You Get Stuck:**

**Hosting Support:**
- Contact your hosting provider's support
- They can help with domain, SSL, server issues

**Supabase Support:**
- Supabase Dashboard → Support
- Community forum: https://github.com/supabase/supabase/discussions

**General Web Development:**
- Stack Overflow: https://stackoverflow.com
- MDN Docs: https://developer.mozilla.org

**Deployment Guides:**
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- React Docs: https://react.dev

---

## 🎉 **CONGRATULATIONS!**

You're now ready to deploy your Oriri Podcast App to production!

**Remember:**
- Start with soft launch (test with small group)
- Monitor closely in first week
- Iterate based on feedback
- Engage with your community
- Keep creating great content!

**Your app is production-ready. Time to share it with the world! 🚀**

---

**Deployment Guide Version:** 1.0  
**Last Updated:** February 23, 2026  
**Status:** ✅ Complete and Ready

---

## 📝 **QUICK REFERENCE COMMANDS**

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod

# Upload to hosting via FTP
# (Use FileZilla or similar FTP client)

# Check Supabase backend health
curl https://[project-id].supabase.co/functions/v1/make-server-a278ea32/health

# Clear browser cache
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete
# Safari: Cmd+Option+E
```

---

**Need help with a specific hosting provider?** Let me know which one you purchased and I can provide detailed steps! 🙋‍♂️
