FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for NEXT_PUBLIC environment variables
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_BUILD_TIME
ARG NAILIT_ENVIRONMENT=production

# Set environment variables from build arguments (these will be embedded in the Next.js bundle)
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_BUILD_TIME=$NEXT_PUBLIC_BUILD_TIME
ENV NAILIT_ENVIRONMENT=$NAILIT_ENVIRONMENT

# Debug: Show what environment variables are set
RUN echo "🔍 Debug: Environment variables during build:" && \
    echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}" && \
    echo "NEXT_PUBLIC_BUILD_TIME=${NEXT_PUBLIC_BUILD_TIME}" && \
    echo "NAILIT_ENVIRONMENT=${NAILIT_ENVIRONMENT}" && \
    echo "All environment variables:" && \
    env | sort && \
    echo "NEXT_PUBLIC variables specifically:" && \
    env | grep NEXT_PUBLIC || echo "No NEXT_PUBLIC vars found" && \
    echo "Checking if variables are set:" && \
    test -n "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" && echo "✅ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set" || echo "❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is NOT set" && \
    test -n "$NEXT_PUBLIC_BUILD_TIME" && echo "✅ NEXT_PUBLIC_BUILD_TIME is set" || echo "❌ NEXT_PUBLIC_BUILD_TIME is NOT set"

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application with environment variables available
RUN echo "🚀 Starting Next.js build process..." && \
    echo "Environment variables visible to Next.js build:" && \
    env | grep NEXT_PUBLIC || echo "No NEXT_PUBLIC vars visible to build" && \
    DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    NEXTAUTH_SECRET="dummy-secret-for-build" \
    NEXTAUTH_URL="http://localhost:3000" \
    NODE_ENV="production" \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
    NEXT_PUBLIC_BUILD_TIME="$NEXT_PUBLIC_BUILD_TIME" \
    npm run build && \
    echo "✅ Next.js build completed"

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"] 