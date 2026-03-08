# ReportCast Quick Start

Get ReportCast running in 5 minutes.

## Prerequisites

- Docker + Docker Compose
- Node.js 22+ (for local development)
- pnpm (optional, for monorepo)

---

## 1. Clone & Configure

```bash
git clone https://github.com/ismailperim/reportcast.git
cd reportcast

# Configure environment
cp .env.example .env
nano .env  # Add your OPENAI_API_KEY
```

---

## 2. Start Services

```bash
# Start all services (PostgreSQL, Redis, TTS, API, Worker)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api worker
```

---

## 3. Run Migrations

```bash
# Create database tables
docker exec reportcast-api npm run db:migrate
```

---

## 4. Test API

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Save the token** from response.

---

### Upload PDF

```bash
# Replace <token> with your JWT token
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@your-report.pdf"
```

**Save the reportId** from response.

---

### Confirm Processing

```bash
curl -X POST http://localhost:3000/api/upload/<reportId>/confirm \
  -H "Authorization: Bearer <token>"
```

---

### Check Status

```bash
# Keep checking until status is "completed"
curl -X GET http://localhost:3000/api/reports/<reportId> \
  -H "Authorization: Bearer <token>"
```

---

### Download Podcast

```bash
curl -X GET http://localhost:3000/api/reports/<reportId>/download \
  -H "Authorization: Bearer <token>" \
  -o podcast.mp3
```

---

## 5. Test Turkish TTS

For Turkish documents, the system auto-detects Turkish text and uses the Turkish voice.

If you want to test the standalone worker:

```bash
cd packages/worker
npm install
npm run dev process inputs/test-turkce.txt \
  --ai-provider openai \
  --tts-provider openedai \
  --voice turkish
```

---

## Troubleshooting

### API won't start

```bash
# Check database health
docker-compose logs postgres

# Restart API
docker-compose restart api
```

---

### Worker not processing

```bash
# Check Redis
docker-compose logs redis

# Check worker logs
docker-compose logs worker

# Restart worker
docker-compose restart worker
```

---

### TTS errors

```bash
# Check TTS server
curl http://localhost:8000/v1/models

# Restart TTS
docker-compose restart tts-server
```

---

### Database connection errors

```bash
# Check if migrations ran
docker exec reportcast-api npm run db:migrate

# Check database connection
docker exec -it reportcast-postgres psql -U reportcast -d reportcast -c "\dt"
```

---

## Development Mode

If you want to run services locally (not in Docker):

### Start infrastructure only

```bash
docker-compose up postgres redis tts-server -d
```

### Run API locally

```bash
cd packages/api
npm install
npm run dev
```

### Run Worker locally

```bash
cd packages/worker
npm install
npm run dev:queue
```

---

## What's Next?

- Read [API.md](API.md) for full API documentation
- Read [API_ADDITIONS.md](API_ADDITIONS.md) for pricing & admin endpoints
- Check [TTS_SERVICES.md](TTS_SERVICES.md) for TTS options
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

---

## Clean Up

```bash
# Stop all services
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v
```

---

## Help

- Issues: https://github.com/ismailperim/reportcast/issues
- Email: ismail@perim.com.tr
