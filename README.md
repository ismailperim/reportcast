# ReportCast

> Transform reports into podcasts with AI

Nobody reads your reports. But they'll listen.

## Features

- 📄 **PDF Parser** - Extract text from any document
- 🤖 **AI Script Generator** - Multiple AI providers (OpenAI, Anthropic)
- 🎙️ **Multi-Provider TTS** - Cloud (OpenAI, ElevenLabs) or Self-hosted (Piper)
- 🌍 **Multi-Language** - Turkish, English + 40+ languages (Piper)
- 🐳 **Docker Services** - Full stack with PostgreSQL, Redis, TTS
- 🔌 **Pluggable Architecture** - Easy to add new providers
- 💾 **S3-Compatible Storage** - MinIO, AWS S3, DigitalOcean Spaces, Cloudflare R2, Backblaze B2
- 🔗 **Public Sharing** - Anonymous share links with listen stats
- 📊 **Listen Analytics** - Track plays, geography, referrers
- 🏢 **Deployment Modes** - On-Premise (free, unlimited) or SaaS (paid, managed)
- 💳 **Flexible Pricing** - Pay-per-use credit system (1 credit = 3 pages)
- ⚙️ **Admin Panel** - Manage AI models, TTS voices, settings

## Architecture

```
reportcast/
├── packages/
│   ├── worker/    # Core processing engine ✅
│   ├── api/       # REST API ✅
│   └── web/       # Frontend (In Progress)
├── docker-compose.yml  # Full stack deployment
└── docs/          # Documentation
```

### TTS Options

| Provider | Cost | Setup | Use Case |
|----------|------|-------|----------|
| **OpenedAI** ⭐ | FREE | Docker | Self-hosted, OSS |
| OpenAI TTS | $0.045/podcast | API Key | Cloud, convenient |
| ElevenLabs | $0.30/podcast | API Key | Premium quality |

## Getting Started

### Option 1: Full Stack (API + Worker + Queue)

```bash
# Clone repository
git clone https://github.com/ismailperim/reportcast.git
cd reportcast

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start all services (PostgreSQL, Redis, TTS, API, Worker)
docker-compose up -d

# Run migrations
docker exec reportcast-api npm run db:migrate

# API is now available at http://localhost:3000
```

### Option 2: Standalone Worker (CLI)

```bash
# Install dependencies
cd packages/worker
npm install

# Configure API keys
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run worker directly
npm run dev process ./inputs/sample.pdf

# With Turkish voice
npm run dev process ./inputs/rapor.pdf --tts-provider openedai --voice turkish
```

### Option 3: Development Mode

```bash
# Start infrastructure only (DB, Redis, TTS)
docker-compose up postgres redis tts-server -d

# Run API locally
cd packages/api
npm install
npm run dev

# Run Worker locally
cd packages/worker
npm install
npm run dev:queue
```

See [TTS_SERVICES.md](TTS_SERVICES.md) for detailed TTS setup.

## Supported Providers

### AI Providers
- ✅ OpenAI (GPT-4 Turbo)
- ✅ Anthropic (Claude Sonnet 4)

### TTS Providers
| Provider | Type | Cost | Languages | Voices |
|----------|------|------|-----------|--------|
| **OpenedAI** ⭐ | Self-hosted | FREE | 🇹🇷 🇬🇧 + 40 more | 900+ |
| OpenAI TTS | Cloud API | $0.045/podcast | 50+ | 6 |
| ElevenLabs | Cloud API | $0.30/podcast | 25+ | Custom |

**Turkish Support:** Native Turkish TTS available with OpenedAI (Piper `tr_TR-dfki-medium` model)

See [TTS_SERVICES.md](TTS_SERVICES.md) for comparison and setup.

## Versioning

**Current version:** `0.2.0`

ReportCast follows [Semantic Versioning](https://semver.org/):
- Git workflow: GitFlow (main, develop, feature/*, release/*)
- Docker images: Tagged with version + `latest`
- Auto-migration: Database migrations run on API startup

**Quick release:**
```bash
./scripts/release.sh patch  # or minor, major
git push origin main --tags
```

---

## Roadmap

### Phase 1: Worker POC ✅
- [x] PDF parser
- [x] Multi-provider AI (OpenAI, Anthropic)
- [x] Multi-provider TTS (OpenAI, ElevenLabs, OpenedAI)
- [x] Docker services (self-hosted TTS)
- [x] Turkish language support
- [x] Full pipeline test

### Phase 2: Queue & API ✅
- [x] Queue system (BullMQ + Redis)
- [x] PostgreSQL + Drizzle ORM
- [x] REST API (upload, status, download)
- [x] Worker queue integration
- [x] JWT authentication
- [x] Auto-migration system
- [x] Versioning strategy
- [x] GitHub Actions CI/CD

### Phase 3: Frontend & SaaS
- [ ] React frontend
- [ ] User dashboard
- [ ] Stripe payments (Free/Team/Business tiers)
- [ ] Real-time progress updates
- [ ] Email notifications
- [x] Open source release (MIT license)

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Get started in 5 minutes
- [API Documentation](docs/API.md) - REST API reference
- [Pricing Guide](docs/PRICING.md) - Credit system & packages
- [TTS Services Guide](docs/TTS_SERVICES.md) - TTS provider setup
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Test Plan](docs/TEST_PLAN.md) - Testing & validation
- [Changelog](CHANGELOG.md) - Version history

## License

MIT © İsmail Perim
