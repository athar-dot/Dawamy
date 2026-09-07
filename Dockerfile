# ==============================================================================
# Multi-stage Production Dockerfile for Dawamy Application Container
# Architecture: Node.js + Express (Backend) + React / Vite / Tailwind (Frontend)
# Database: Isolated in separate PostgreSQL Container via Docker Compose
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compile Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package manifests
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install all dependencies including devDependencies for build
RUN npm install

# Copy Prisma schema and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and assets
COPY src ./src
COPY server ./server
COPY server.ts ./
COPY index.html ./
COPY public ./public

# Build Vite frontend assets and bundle Express backend to dist/server.cjs
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Lightweight Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies for health checks & migrations
RUN apk add --no-cache curl tzdata

# Create non-root system user for container security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 dawamy && \
    mkdir -p /app/data && \
    chown -R dawamy:nodejs /app

# Copy production manifests
COPY package*.json ./

# Install only production dependencies (including prisma for migrations)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy Prisma schema and generated Prisma engine client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled backend and frontend bundles from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && \
    chown dawamy:nodejs ./docker-entrypoint.sh

# Set user permissions to non-root
USER dawamy

# Expose only Application port 3000 (PostgreSQL is in another container)
EXPOSE 3000

# Health check to ensure Express and Vite static server are healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Automatically runs prisma migrations deploy then executes command
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.cjs"]
