# syntax=docker/dockerfile:1
# Cobentt web (Next.js 15) — single image, runs `next start` with migrations opt-in.
#
# Build-time args bake the NEXT_PUBLIC_* values into the JS bundle (they are public).
# Everything secret is runtime-only.
#
#   docker build \
#     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
#     --build-arg NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_... \
#     -t cobentt/web .
#
# Run:
#   docker run -p 3000:3000 \
#     -e DATABASE_URL=postgres://... \
#     -e CLERK_SECRET_KEY=sk_test_... \
#     -e INTERNAL_API_SECRET=... \
#     -e REDIS_URL=redis://redis:6379 \
#     -e RUN_MIGRATIONS=true \
#     -e INNGEST_DEV=true \
#     cobentt/web

FROM node:20-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json .npmrc ./
COPY patches ./patches
COPY prisma ./prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists \
  && npm ci --legacy-peer-deps

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
ARG NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY
ENV NEXT_TELEMETRY_DISABLED=1 \
  NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
  NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID \
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID \
  NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY=$NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY \
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dummy \
  DIRECT_URL=postgresql://postgres:postgres@localhost:5432/dummy \
  CLERK_SECRET_KEY=sk_test_buildphase_placeholder_dummy_dummy \
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in \
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up \
  API_KEY_ENCRYPTION_SECRET=build-phase-placeholder-not-a-real-secret-32 \
  INNGEST_EVENT_KEY=dummy-build-phase \
  INNGEST_SIGNING_KEY=signkey-build-phase-dummy-dummy-dummy \
  E2B_API_KEY=dummy-build-phase
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists \
  && useradd --no-create-home --shell /usr/sbin/nologin cobentt
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/patches ./patches
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
  && chown -R cobentt:cobentt /app
USER cobentt
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/ || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
