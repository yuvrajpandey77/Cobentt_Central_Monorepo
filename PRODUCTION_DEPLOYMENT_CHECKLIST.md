# Production Deployment Checklist — Phase 5.10

## Pre-Deployment

### Environment Variables
- [ ] `DATABASE_URL` — PostgreSQL connection string with `?connection_limit=20`
- [ ] `CLERK_SECRET_KEY` — Clerk backend API key
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk frontend key
- [ ] `INNGEST_EVENT_KEY` — Inngest event key
- [ ] `INNGEST_SIGNING_KEY` — Inngest signing key
- [ ] `AI_API_KEY` or `OPENROUTER_API_KEY` — AI provider key
- [ ] `RAZORPAY_KEY_ID` — Razorpay merchant key
- [ ] `RAZORPAY_KEY_SECRET` — Razorpay merchant secret
- [ ] `RAZORPAY_WEBHOOK_SECRET` — Razorpay webhook HMAC secret
- [ ] `E2B_API_KEY` — E2B sandbox key
- [ ] `UPSTASH_REDIS_REST_URL` — Upstash Redis URL
- [ ] `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis token
- [ ] `INTERNAL_API_SECRET` — Internal API secret
- [ ] `NEXT_PUBLIC_APP_URL` — Production URL (e.g. https://cobentt.com)
- [ ] `NODE_ENV=production`

### Database
- [ ] Run `npx prisma migrate deploy` — apply all migrations
- [ ] Verify indexes exist: `Message_conversationId_createdAt_idx`, `BuildJob_projectId_status_idx`, etc.
- [ ] Connection pool configured: `?connection_limit=20&pool_timeout=30`
- [ ] Backup strategy in place (daily automated backups)

### Security
- [ ] All secrets in environment variables (not in code)
- [ ] `.env` not committed to git
- [ ] CSP headers configured (already in next.config.ts)
- [ ] CORS configured for production domain
- [ ] HTTPS enforced (HSTS headers)
- [ ] Clerk webhook IP allowlisting (if available)
- [ ] Razorpay webhook HMAC verification enabled

### Build
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run build` — succeeds
- [ ] `npx prisma generate` — client generated
- [ ] Standalone output mode (already configured)

## Deployment

### Step 1: Database Migration
```bash
npx prisma migrate deploy
```

### Step 2: Build
```bash
npm run build
```

### Step 3: Start
```bash
npm start
```
Or with Docker:
```bash
docker build -t cobentt .
docker run -p 3000:3000 cobentt
```

### Step 4: Verify
```bash
# Health check
curl https://your-domain.com/api/health

# Expected: {"status":"healthy","checks":{"database":{"status":"pass",...},...}}
```

## Post-Deployment

- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Sign-in flow works (Clerk)
- [ ] Chat streaming works
- [ ] Mode generation works
- [ ] Deep research works
- [ ] Sandbox restore works
- [ ] Payment flow works (Razorpay)
- [ ] Webhook processing works
- [ ] Admin dashboard accessible
- [ ] Settings pages load correctly

## Rollback Plan

1. **Database:** Keep migration rollback SQL ready. Do NOT run `prisma migrate reset` in production.
2. **Application:** Keep previous Docker image tagged. Roll back by redeploying previous version.
3. **Database rollback:** If migration is destructive, restore from backup.
4. **Monitoring:** Watch health endpoint and error logs for 30 minutes after deployment.

## Disaster Recovery

- **Database backup:** Daily automated backups with 30-day retention
- **Point-in-time recovery:** Enable PostgreSQL WAL archiving
- **Secrets:** Store in a secrets manager (AWS Secrets Manager, Vercel Encrypted Env, etc.)
- **Uptime monitoring:** Set up health check alerts (e.g. UptimeRobot, Checkly)
- **Error tracking:** Integrate Sentry for production error monitoring

## Monitoring

- **Health endpoint:** `GET /api/health` — check every 60 seconds
- **Structured logs:** JSON format, parseable by log aggregation tools
- **Error rate:** Monitor 5xx responses
- **AI latency:** Track `durationMs` in token usage records
- **Quota alerts:** 90% and 100% usage alerts via webhook system
