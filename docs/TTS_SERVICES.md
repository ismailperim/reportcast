# TTS Services Architecture

ReportCast supports multiple TTS providers through a unified interface.

## Architecture

```
┌──────────────┐
│    Worker    │ (Node.js + ffmpeg)
└──────┬───────┘
       │
       ├─────────────┬─────────────┐
       │             │             │
   ┌───▼────┐   ┌───▼──────┐  ┌──▼──────┐
   │ Cloud  │   │  Piper   │  │OpenedAI │
   │  APIs  │   │   GPL    │  │ Speech  │
   └────────┘   └──────────┘  └─────────┘
       │             │             │
   ┌───▼────┐    (HTTP)        (Legacy)
   │OpenAI  │    900+ voices
   │Eleven  │    100+ langs
   └────────┘    FREE ⭐
```

## Provider Options

### 1. Piper-GPL (Default ⭐ Recommended)

**What:** Pure Piper TTS with HTTP API  
**GitHub:** https://github.com/OHF-Voice/piper1-gpl  
**Cost:** FREE (self-hosted, GPL license)  
**Setup:** Docker (custom image)

**Features:**
- ✅ 900+ voices across 100+ languages
- ✅ CPU-only inference (no GPU needed)
- ✅ Very lightweight (~200MB RAM)
- ✅ Fast real-time synthesis
- ✅ Simple HTTP POST API
- ✅ Pre-loaded voices: Turkish, English (US/UK), German, French, Spanish, Russian
- ✅ WAV output (ffmpeg converts to MP3)

**Included Voices (19):**
- Turkish: `tr_TR-dfki-medium`, `tr_TR-fettah-medium`
- English US: `en_US-lessac-medium/high`, `en_US-amy-medium`, `en_US-ryan-high`, `en_US-libritts-high`
- English UK: `en_GB-alan-medium`, `en_GB-alba-medium`, `en_GB-southern_english_female-medium`
- German: `de_DE-thorsten-medium`, `de_DE-karlsson-low`
- French: `fr_FR-upmc-medium`, `fr_FR-siwis-medium`
- Spanish: `es_ES-sharvard-medium`, `es_ES-carlfm-x_low`, `es_MX-ald-medium`
- Russian: `ru_RU-ruslan-medium`, `ru_RU-dmitri-medium`

**Start service:**
```bash
docker compose up tts-server
# Service runs on http://localhost:5000
```

**API Usage:**
```bash
curl -X POST http://localhost:5000 \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "en_US-lessac-medium"}' \
  -o output.wav
```

**Docker Build:**
```dockerfile
# See Dockerfile.piper-http
FROM python:3.11-slim
RUN pip install 'numpy<2.0' piper-tts[http]
RUN python3 -m piper.download_voices tr_TR-dfki-medium
# ... (downloads 7 language packs)
CMD ["python3", "-m", "piper.http_server", "--host", "0.0.0.0"]
```

**Why Piper-GPL?**
- Fully open-source (GPL)
- Actively maintained by OHF-Voice
- No API costs
- Works on any CPU
- Perfect for on-premise deployments

---

### 2. OpenedAI Speech (Deprecated)

**Status:** ⚠️ Replaced by Piper-GPL in v0.4.0

**Why deprecated:**
- OpenedAI-Speech wrapper no longer needed
- Pure Piper-GPL is simpler and lighter
- Same Piper backend, less complexity

**Migration:** Use `piper` provider instead of `openedai`
```bash
# Old
--tts-provider openedai --voice turkish

# New
--tts-provider piper --voice tr_TR-dfki-medium
```

**Note:** OpenedAI-Speech is still a great project if you need OpenAI API compatibility or XTTS-v2 voice cloning (GPU required).

---

### 3. OpenAI TTS (Cloud, Paid)

**What:** Official OpenAI TTS API  
**Cost:** $15/1M characters (~$0.045 per 3-min podcast)  
**Setup:** API key only

**Features:**
- ✅ High quality
- ✅ 6 voices
- ✅ Fast generation (<5s)
- ✅ No infrastructure needed

**Use in Worker:**
```bash
npm run dev process inputs/report.pdf --tts-provider openai --voice nova
```

---

### 3. ElevenLabs (Cloud, Premium)

**What:** Premium TTS with voice cloning  
**Cost:** $99/1M characters (~$0.30 per 3-min podcast)  
**Setup:** API key only

**Features:**
- ✅ Premium quality
- ✅ Voice cloning
- ✅ Custom voices
- ✅ Emotional tone

**Use in Worker:**
```bash
npm run dev process inputs/report.pdf --tts-provider elevenlabs --voice Rachel
```

---

## Comparison

| Provider | Cost (1K chars) | Quality | Speed | Setup | Voice Cloning |
|----------|-----------------|---------|-------|-------|---------------|
| **Piper-GPL** ⭐ | **$0.00** | Good | Fast | Docker | ❌ |
| OpenAI TTS | $0.015 | Good | Fast | API Key | ❌ |
| ElevenLabs | $0.30 | Premium | Fast | API Key | ✅ |

---

## Docker Compose Setup

### Minimal (Piper-GPL)

```yaml
services:
  tts-server:
    build:
      context: .
      dockerfile: Dockerfile.piper-http
    image: reportcast-piper-tts:latest
    ports:
      - "5000:5000"
```

**Size:** ~500MB (with 7 language packs)  
**GPU:** Not needed  
**RAM:** ~200MB  
**Voices:** Piper (900+)

### Advanced (OpenedAI + XTTS voice cloning)

⚠️ **Note:** This requires OpenedAI-Speech (deprecated in ReportCast v0.4.0)

If you need voice cloning, use OpenedAI-Speech directly:
```yaml
services:
  tts-openedai:
    image: ghcr.io/matatonic/openedai-speech:latest
    ports:
      - "8000:8000"
    volumes:
      - tts_voices:/app/voices
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      - PRELOAD=xtts
```

**Size:** ~8GB | **GPU:** Required (CUDA) | **Feature:** Voice cloning

For ReportCast integration, use Piper-GPL (no voice cloning, but free & CPU-only)

---

## Custom TTS Service

You can add your own TTS service by implementing the `TTSProvider` interface:

```typescript
// packages/worker/src/providers/tts/my-tts.ts
export class MyTTSProvider implements TTSProvider {
  name = 'my-tts';
  
  async textToSpeech(text: string, outputPath: string): Promise<void> {
    // Your implementation
  }
  
  async listVoices(): Promise<string[]> {
    return ['voice1', 'voice2'];
  }
}
```

Then register in `provider-factory.ts`:

```typescript
case 'my-tts':
  return new MyTTSProvider();
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)
```bash
# Start all services (Piper TTS included)
docker compose up -d

# Worker connects to tts-server:5000 internally
```

### Option 2: Separate Hosts
```bash
# Build and run Piper TTS on dedicated host
docker build -f Dockerfile.piper-http -t piper-tts .
docker run -p 5000:5000 piper-tts

# Worker environment
export TTS_SERVER_URL=http://tts-host:5000
```

### Option 3: Cloud APIs Only
```bash
# No Docker needed, just API keys
export OPENAI_API_KEY=sk-...
export ELEVENLABS_API_KEY=...
```

---

## Cost Analysis

**1000 reports/month @ 3K chars each:**

| Provider | Monthly Cost | Infrastructure | Notes |
|----------|--------------|----------------|-------|
| **Piper-GPL** | **$0** | $0-20/mo VPS (optional) | Free, can run on laptop |
| OpenAI TTS | $45 | $0 | Mid-tier option |
| ElevenLabs | $900 | $0 | Premium tier |

**Break-even:** Piper-GPL self-hosted is always free. Even tiny VPS works (200MB RAM).

---

## Troubleshooting

### TTS server not responding

```bash
# Check if service is running
docker-compose ps

# Check logs
docker-compose logs tts-server

# Test endpoint
curl http://localhost:8000/v1/models
```

### Worker can't connect to TTS server

```bash
# Make sure TTS_SERVER_URL is correct
echo $TTS_SERVER_URL

# If using Docker network, use service name
TTS_SERVER_URL=http://tts-server:8000

# Test from worker container
docker exec reportcast-worker curl http://tts-server:8000/v1/models
```

### Voice not found

```bash
# List available voices
curl http://localhost:8000/v1/models

# Download more Piper voices (inside container)
docker exec reportcast-tts-server \
  wget -P /app/voices \
  https://huggingface.co/rhasspy/piper-voices/resolve/main/...
```

---

## License

- **openedai-speech:** MIT
- **Piper (piper1-gpl):** GPL-3.0
- **XTTS-v2:** Mozilla Public License 2.0

Check individual licenses for commercial use.
