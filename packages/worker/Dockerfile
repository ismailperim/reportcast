FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY VERSION ./
COPY packages/worker/package.json ./packages/worker/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/worker ./packages/worker
COPY packages/api/src/db ./packages/api/src/db
COPY packages/api/src/storage ./packages/api/src/storage
COPY packages/api/src/services ./packages/api/src/services

# Create directories for uploads and outputs
RUN mkdir -p /app/uploads /app/outputs

WORKDIR /app/packages/worker

# Development mode: Run with tsx (no build)
CMD ["../../node_modules/.bin/tsx", "src/queue-worker.ts"]
