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

### 2. OpenedAI Speech (Legacy)

**What:** OpenAI-compatible API with Piper backend  
**GitHub:** https://github.com/matatonic/openedai-speech  
**Cost:** FREE (self-hosted)  
**Setup:** Docker Compose

**Features:**
- ✅ OpenAI API compatible (drop-in replacement)
- ✅ Piper backend (900+ voices, 40+ languages)
- ✅ Optional XTTS-v2 (voice cloning, requires GPU)
- ✅ Minimal Docker image (<1GB with Piper only)
- ✅ No API key needed
- ✅ **Turkish support** (`tr_TR-dfki-medium`)

**Start service:**
```bash
docker-compose up tts-server
```

**Use in Worker:**
```bash
# Turkish voice (recommended for Turkish reports)
npm run dev process inputs/report.pdf --tts-provider openedai --voice turkish

# English voices
npm run dev process inputs/report.pdf --tts-provider openedai --voice alloy
```

**Available Voices:**
- **Turkish:** `turkish`, `tr_TR-dfki-medium` (native Turkish model)
- **English:** `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **More Piper voices:** `en_US-lessac-medium`, `en_US-amy-medium`, etc.
- Full list: http://localhost:8000/v1/models

**Adding More Languages:**

To add more Piper voices (e.g., Spanish, French, German):

1. Download voice model from [Hugging Face](https://huggingface.co/rhasspy/piper-voices):
   ```bash
   docker exec reportcast-tts curl -LO \
     https://huggingface.co/rhasspy/piper-voices/resolve/main/<lang>/<locale>/<model>.onnx
   
   docker exec reportcast-tts curl -LO \
     https://huggingface.co/rhasspy/piper-voices/resolve/main/<lang>/<locale>/<model>.onnx.json
   ```

2. Add to `/app/config/voice_to_speaker.yaml` inside the container:
   ```yaml
   tts-1:
     your-voice-name:
       model: voices/<model>.onnx
       speaker: # default speaker
   ```

3. Restart container:
   ```bash
   docker compose restart tts-server
   ```

---

### 2. OpenAI TTS (Cloud, Paid)

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

| Provider | Cost (3-min) | Quality | Speed | Setup | Voice Cloning |
|----------|--------------|---------|-------|-------|---------------|
| **OpenedAI** ⭐ | **$0.00** | Good | Fast | Docker | ❌ (yes with GPU) |
| OpenAI TTS | $0.045 | Good | Fast | API Key | ❌ |
| ElevenLabs | $0.30 | Premium | Fast | API Key | ✅ |

---

## Docker Compose Setup

### Minimal (Piper only)

```yaml
services:
  tts-server:
    image: ghcr.io/matatonic/openedai-speech:latest
    ports:
      - "8000:8000"
    volumes:
      - tts_voices:/app/voices
    command: >
      --xtts_device none
      -P 8000
      -H 0.0.0.0
```

**Size:** ~1GB  
**GPU:** Not needed  
**Voices:** Piper (900+)

### Full (Piper + XTTS with voice cloning)

```yaml
services:
  tts-server:
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

**Size:** ~8GB  
**GPU:** Required (CUDA)  
**Voices:** Piper + XTTS (voice cloning)

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
# Start all services
docker-compose up -d

# Worker connects to tts-server:8000 internally
```

### Option 2: Separate Hosts
```bash
# TTS server on dedicated host
docker run -p 8000:8000 ghcr.io/matatonic/openedai-speech:latest

# Worker environment
export TTS_SERVER_URL=http://tts-host:8000
```

### Option 3: Cloud APIs Only
```bash
# No Docker needed, just API keys
export OPENAI_API_KEY=sk-...
export ELEVENLABS_API_KEY=...
```

---

## Cost Analysis

**1000 podcasts/month @ 3 minutes each:**

| Provider | Monthly Cost | Infrastructure | Notes |
|----------|--------------|----------------|-------|
| OpenedAI | $0 | $20-50/mo VPS | Free tier default |
| OpenAI TTS | $45 | $0 | Mid-tier option |
| ElevenLabs | $300 | $0 | Premium tier |

**Break-even:** OpenedAI self-hosted pays for itself after ~100 podcasts vs ElevenLabs.

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
