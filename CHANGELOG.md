# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### In Progress
- React frontend (Phase 3)
- Stripe payment integration (backend ready)
- Real-time progress updates
- User dashboard
- Email notifications

---

## [0.3.0] - 2026-03-08

### Added
- **Admin Panel API**
  - AI models management (CRUD endpoints)
  - TTS voices management (CRUD endpoints)
  - Prompts management (CRUD endpoints)
  - Settings management (global configuration)
  - Admin authentication middleware
- **Deployment Modes**
  - On-premise mode (free, unlimited, default)
  - SaaS mode (pricing, payments, limits)
  - Feature flags system
  - Environment-based configuration
- **Database-Driven Configuration**
  - AI models table (3 models seeded: GPT-4 Turbo, GPT-4o, Claude Sonnet 4)
  - TTS voices table (8 voices seeded: Piper Turkish, OpenAI voices, ElevenLabs)
  - Prompts table (6 templates: professional/casual/storytelling × TR/EN)
  - Settings table (key-value store)
- **Prompt System**
  - Database-driven prompt templates
  - Tone selection (professional, casual, storytelling)
  - Language detection (Turkish, English)
  - Automatic fallback logic
- **Pricing API**
  - Public pricing endpoint
  - Tier calculator (short/medium/long/enterprise)
  - Plan comparison (Free/Team/Business/Enterprise)
  - Credit pricing
- **Stripe Integration (Backend)**
  - Payment Intent creation
  - Customer management
  - Webhook handler (payment success/failure)
  - Credits purchase flow
  - Multi-currency support (USD default)
- **Public Sharing Enhancements**
  - Share tokens (anonymous access)
  - Listen analytics (IP, user agent, referer tracking)
  - Public listen endpoint (`/listen/:token`)
  - Listen count tracking
- **S3 Storage Abstraction**
  - Multi-provider support (AWS, DigitalOcean, MinIO, Backblaze B2)
  - Local disk fallback
  - Presigned URL generation
- **Documentation**
  - Organized docs/ folder
  - API documentation updated
  - Pricing documentation
  - Test plan documentation

### Changed
- Replaced `bcrypt` with `bcryptjs` (Alpine Linux compatibility)
- Auto-migration system (SQL-based, no drizzle-kit dependency)
- Healthcheck disabled temporarily (Alpine curl issue)
- MinIO disabled (CPU compatibility issue, local storage used)

### Fixed
- Docker build issues (native modules)
- TypeScript strict mode compatibility
- Import/export consistency across routes

---

## [0.2.0] - 2026-03-07

### Added
- **Full-stack Docker Compose setup**
  - PostgreSQL database
  - Redis (BullMQ backend)
  - TTS server (OpenedAI)
  - REST API server
  - Background worker
- **Database schema** (Drizzle ORM)
  - Users table (auth, plans, credits)
  - Reports table (PDF metadata, status, costs)
  - Payments table (Stripe integration ready)
  - API keys table (programmatic access)
- **REST API** (Express + TypeScript)
  - Auth endpoints: register, login, JWT tokens
  - Upload endpoint: multipart PDF upload, auto tier detection
  - Reports endpoints: list, get, download, delete
  - Health check endpoint with version info
- **BullMQ Queue System**
  - Redis-backed async processing
  - 3 retry attempts with exponential backoff
  - Job retention (100 completed, 50 failed)
- **Worker Integration**
  - Queue consumer
  - PDF → AI → TTS pipeline
  - Database status updates
  - Error handling and reporting
- **Authentication**
  - JWT-based auth
  - bcrypt password hashing (10 rounds)
  - Protected routes middleware
- **Pricing Logic**
  - Auto tier detection by page count
  - Short (1-5 pages): $0.99
  - Medium (6-15 pages): $2.99
  - Long (16-50 pages): $4.99
  - Enterprise (51+ pages): custom pricing
- **Auto-migration system**
  - Database migrations run on API startup
  - Connection retry logic (10 attempts)
  - Crash on failure (safe deployment)
- **Versioning system**
  - VERSION file for tracking
  - GitHub Actions CI/CD workflows
  - Docker image tagging strategy
  - Git branching workflow (GitFlow)
- **Documentation**
  - API.md: Complete REST API documentation
  - QUICKSTART.md: 5-minute setup guide
  - .claude/VERSIONING.md: Version management strategy
  - .claude/PRICING.md: Pricing and business model

### Changed
- Restructured Docker Compose (all services in one file)
- Updated README with Phase 2 architecture
- Improved error messages across API
- Enhanced health check response

### Fixed
- Docker volume persistence for TTS config
- Database connection timeout handling
- Migration race condition on startup

### Technical
- Node.js 22 + TypeScript 5.6
- Express 4.21 + CORS
- Drizzle ORM 0.38 + PostgreSQL 16
- BullMQ 5.29 + Redis 7
- Multer 1.4 (file uploads)
- JWT + bcrypt (auth)

---

## [0.1.0] - 2026-03-06

### Added
- **Worker POC** (Phase 1)
  - PDF parser (pdf-parse)
  - Multi-provider AI (OpenAI GPT-4, Anthropic Claude)
  - Multi-provider TTS (OpenAI TTS, ElevenLabs, OpenedAI)
  - CLI interface with argument parsing
  - TypeScript strict mode
- **Turkish Language Support**
  - Piper tr_TR-dfki-medium model
  - Auto-configured in OpenedAI container
  - Native Turkish TTS quality validated
- **Self-hosted TTS**
  - OpenedAI Speech (Piper backend)
  - Docker Compose service
  - OpenAI-compatible API
  - Zero cost TTS option
- **Architecture**
  - Factory pattern for providers
  - Interface-based design
  - Type-safe provider contracts
  - Monorepo structure (pnpm workspaces)
- **Documentation**
  - README.md
  - TTS_SERVICES.md (TTS setup guide)
  - QUICK_START.md
  - .claude/ folder (development notes)
  - .env.example template

### Technical
- Node.js 22
- TypeScript 5.6
- pdf-parse 1.1
- OpenAI SDK 4.73
- Anthropic SDK 0.32
- Docker Compose

---

## [0.0.1] - 2026-03-06

### Added
- Initial repository setup
- Project structure
- Basic documentation

---

## Format

### Types of Changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes
- `Technical` for technical details/dependencies

---

[Unreleased]: https://github.com/ismailperim/reportcast/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ismailperim/reportcast/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ismailperim/reportcast/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/ismailperim/reportcast/releases/tag/v0.0.1
