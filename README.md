# oriri.me

The oriri.me web app (Oriri Podcast, Nourish, Wellness Bestie). Moved out of Figma Make on 2026-11-04; the first commit is the untouched Make export.

## Run it locally

Needs Node 22 and pnpm 10.

```
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # production files in dist/
```

## How changes go live

1. Every change is a pull request. GitHub checks that it builds.
2. Merging to `main` deploys to **staging** (new.oriri.me) automatically.
3. Production (www.oriri.me) is deployed by hand: Actions tab, "Deploy", Run workflow, target `production`.
4. Roll back: re-run the Deploy workflow from the last good commit.

Deploy settings live in GitHub, never in this repo:
- Environment secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` (a cPanel FTP account limited to the site folder)
- Environment variable `FTP_SERVER_DIR` (folder on the server, per environment)

## Backend

Supabase project `lemtlurqzmjdahbhunhz`. The edge function lives in `supabase/functions/server` and is deployed as `make-server-a278ea32` (the site calls it by that name):

```
supabase functions deploy make-server-a278ea32 --project-ref lemtlurqzmjdahbhunhz
```

Its secrets (SMTP, Spotify, YouTube, Apple Podcasts, VAPID, sheet webhook) are set in Supabase, not here. The public anon key in `src/app/utils/supabase/info.tsx` is meant to be public.

## Figma leftovers

`.figma/` and `vite.figma.config.ts` come from Make. The build still uses them (they resolve `figma:asset/...` imports and inject the title, favicon, social image and GA tag from `.figma/make/site.json`). They'll be folded into a plain Vite config in a later cleanup.
