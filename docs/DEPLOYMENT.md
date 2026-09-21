# Deployment Strategy & Cost Optimization

This document outlines the zero-cost to low-cost hosting architecture for **Memecoinsniper**.

---

## 1. Target Hosting Topology

```
┌───────────────────────────────┐
│     Next.js Web Cockpit       │  ───►  Vercel Free Tier (Serverless / Edge)
└───────────────────────────────┘

┌───────────────────────────────┐
│    PostgreSQL Database        │  ───►  Supabase Free Tier (500MB DB / 50k MAU)
└───────────────────────────────┘

┌───────────────────────────────┐
│   Telegram Notification Bot   │  ───►  Telegram Bot API (100% Free)
└───────────────────────────────┘

┌───────────────────────────────┐
│  Node.js Real-Time Worker     │  ───►  Local Dev / Low-cost Persistent VPS
└───────────────────────────────┘
```

---

## 2. Infrastructure Analysis & Free-Tier Reality

### A. Frontend (`packages/web`)
- **Host:** Vercel (Hobby / Free plan).
- **Behavior:** Static assets and server-rendered Next.js cockpit routes.
- **Cost:** $0/mo.

### B. Database (`packages/engine/supabase`)
- **Host:** Supabase Free Tier.
- **Behavior:** 500MB PostgreSQL storage, built-in REST & Realtime engine.
- **Cost:** $0/mo.

### C. Persistent Blockchain Monitoring Worker (`packages/engine`)
> [!IMPORTANT]
> The real-time hunting engine maintains persistent WebSocket connections and low-latency poll loops. Serverless platforms that sleep after inactivity (such as free Heroku/Render spinning dynos) are unsuitable because they drop WebSocket state and miss rapid new memecoin launches.

### Realistic Worker Hosting Options:

#### Option 1: Local Operator Machine (Recommended for Zero-Cost Start)
- Run `pnpm dev:engine` on your local laptop/desktop whenever you are active and hunting memecoins.
- **Cost:** $0/mo.

#### Option 2: Low-Cost Persistent Cloud VPS
- Deploy the lightweight Node.js engine using `pm2` or systemd on an affordable persistent VPS:
  - **Hetzner Cloud** (CX22: ~€3.50/mo)
  - **DigitalOcean / Vultr / Linode** (~$4–$5/mo)
- **Deployment Command on VPS:**
  ```bash
  # Install PM2
  npm install -g pm2

  # Start engine with auto-restart on crashes
  pm2 start dist/index.js --name "memesniper-engine"
  pm2 startup
  pm2 save
  ```
- **Cost:** ~$3.50–$5/mo.

---

## 3. Production Environment Checklist

1. Set `NODE_ENV=production`.
2. Secure Supabase keys: Provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Set `NEXT_PUBLIC_ENGINE_API_URL` on Vercel to point to your persistent VPS IP/domain.
4. Verify Telegram notifications by testing alert dispatch with `TELEGRAM_ALERTS_ENABLED=true`.
