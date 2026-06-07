# Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL running locally (or a connection string to a hosted instance)

## 1. Install dependencies
```bash
npm install
npm install -D tailwindcss postcss autoprefixer @types/node
npm install @auth/prisma-adapter
```

## 2. Configure environment
```bash
cp .env.example .env
```
Fill in `.env`:
- **DATABASE_URL** — your PostgreSQL connection string
- **NEXTAUTH_SECRET** — run `openssl rand -base64 32`
- **NEXTAUTH_URL** — `http://localhost:3000` for dev

## 3. Google OAuth (for user login)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret into `.env`

## 4. Gmail for Scholar alerts (forwarding inbox)
1. Create a dedicated Gmail account (e.g. `myapp-alerts@gmail.com`)
2. In your personal Gmail, forward Scholar alert emails to that address:
   - In Scholar: Settings → Alerts → edit each alert → change delivery to the new address
   - Or in Gmail: Settings → Filters → forward from `scholaralerts-noreply@google.com`
3. Get a refresh token for the forwarding inbox:
   - Enable Gmail API in Google Cloud Console for your project
   - Add `https://www.googleapis.com/auth/gmail.modify` scope
   - Use the OAuth Playground or run the one-time auth script below
4. Set `SCHOLAR_GMAIL_ADDRESS` and `SCHOLAR_GMAIL_REFRESH_TOKEN` in `.env`

### One-time refresh token script
```bash
npx tsx scripts/get-gmail-token.ts
```
(You'll need to create this script — see Google's OAuth2 token exchange docs, or use the OAuth Playground at oauth.com/playground with your client credentials.)

## 5. Database setup
```bash
npm run db:push        # creates tables
npx tsx prisma/seed.ts # seeds journal records
```

## 6. Run the app
```bash
npm run dev
```
Open http://localhost:3000, sign in with Google.

## 7. Trigger the first poll manually
```bash
npm run poll
```
This fetches RSS feeds and ingests unread Scholar alert emails.

## 8. Automate daily polling
**Option A — cron job on your server:**
```
0 7 * * * cd /path/to/toc-tracker && npm run poll >> /var/log/toc-poll.log 2>&1
```

**Option B — free cron service hitting the webhook:**
- Set `POLL_SECRET` in `.env`
- Use [cron-job.org](https://cron-job.org) to POST to `https://yourapp.com/api/poll`
  with header `Authorization: Bearer <your-poll-secret>` daily at 7am
