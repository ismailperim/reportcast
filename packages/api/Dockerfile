FROM node:22-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY VERSION ./
COPY packages/api/package.json ./packages/api/
COPY packages/worker/package.json ./packages/worker/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/api/src ./packages/api/src
COPY packages/api/drizzle ./packages/api/drizzle
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/api/drizzle.config.ts ./packages/api/
COPY packages/worker/src/parsers ./packages/worker/src/parsers
COPY packages/worker/src/types ./packages/worker/src/types

# Create directories for uploads and outputs
RUN mkdir -p /app/uploads /app/outputs

EXPOSE 3000

WORKDIR /app/packages/api

# Development mode: Run with tsx (no build)
CMD ["../../node_modules/.bin/tsx", "src/index.ts"]
