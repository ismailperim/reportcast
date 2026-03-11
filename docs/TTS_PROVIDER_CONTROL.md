# TTS Provider Control

## Overview

ReportCast allows you to selectively enable/disable TTS providers even when API keys are present. This is useful when you want to:

- Use OpenAI API key **only for AI** (transcript generation), not for TTS
- Prevent expensive cloud TTS usage in development
- Use only self-hosted TTS (Piper-GPL) for cost control

## Environment Variables

### `.env` Configuration

```bash
# TTS Provider Enablement
# Set to 'true' to enable, 'false' or empty to disable
ENABLE_OPENAI_TTS=false
ENABLE_ELEVENLABS_TTS=false
```

### Provider Logic

| Provider | Requirement | Always Available? |
|----------|-------------|-------------------|
| **Piper-GPL** (Piper) | Docker service running | ✅ Yes (self-hosted) |
| **OpenAI TTS** | `OPENAI_API_KEY` + `ENABLE_OPENAI_TTS=true` | ❌ No |
| **ElevenLabs** | `ELEVENLABS_API_KEY` + `ENABLE_ELEVENLABS_TTS=true` | ❌ No |

## Use Cases

### 1. Development (Cost Control)
```bash
# Use OpenAI for AI, but self-hosted TTS only
OPENAI_API_KEY=sk-proj-...
ENABLE_OPENAI_TTS=false        # Disable expensive cloud TTS
ENABLE_ELEVENLABS_TTS=false
```

**Result:** Only Turkish Piper voice available (free, self-hosted)

### 2. Production (Premium Quality)
```bash
# Enable all providers for user choice
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=...
ENABLE_OPENAI_TTS=true
ENABLE_ELEVENLABS_TTS=true
```

**Result:** Piper-GPL + OpenAI + ElevenLabs voices available

### 3. On-Premise Only (No Cloud)
```bash
# No cloud services, 100% self-hosted
OPENAI_API_KEY=sk-proj-...     # Still needed for AI
ENABLE_OPENAI_TTS=false        # Disable cloud TTS
ENABLE_ELEVENLABS_TTS=false
```

**Result:** Only Piper-GPL (Piper) available, AI still uses OpenAI

## API Behavior

### GET `/api/config/tts-voices`

**Without enablement (default):**
```json
{
  "voices": [
    {
      "voiceId": "tr_TR-dfki-medium",
      "displayName": "Turkish (Piper)",
      "provider": "piper",
      "language": "tr"
    }
  ]
}
```

**With `ENABLE_OPENAI_TTS=true`:**
```json
{
  "voices": [
    {"voiceId": "alloy", "provider": "openai", "language": "en"},
    {"voiceId": "echo", "provider": "openai", "language": "en"},
    {"voiceId": "fable", "provider": "openai", "language": "en"},
    {"voiceId": "nova", "provider": "openai", "language": "en"},
    {"voiceId": "onyx", "provider": "openai", "language": "en"},
    {"voiceId": "shimmer", "provider": "openai", "language": "en"},
    {"voiceId": "tr_TR-dfki-medium", "provider": "piper", "language": "tr"}
  ]
}
```

## Implementation

### Config Route (`packages/api/src/routes/config.ts`)

```typescript
// Filter by available API keys/services AND enablement flags
const availableProviders = new Set<string>();

// Piper-GPL (self-hosted) is always available
availableProviders.add('piper');

// OpenAI TTS - requires both API key AND enablement flag
if (process.env.OPENAI_API_KEY && process.env.ENABLE_OPENAI_TTS === 'true') {
  availableProviders.add('openai');
}

// ElevenLabs TTS - requires both API key AND enablement flag
if (process.env.ELEVENLABS_API_KEY && process.env.ENABLE_ELEVENLABS_TTS === 'true') {
  availableProviders.add('elevenlabs');
}

voices = voices.filter(v => availableProviders.has(v.provider));
```

## Cost Comparison

| Scenario | AI Provider | TTS Provider | Cost per 10-page Report |
|----------|-------------|--------------|-------------------------|
| **Development** | OpenAI GPT-4o | Piper-GPL (Piper) | ~$0.05 (AI only) |
| **Production (OpenAI)** | OpenAI GPT-4o | OpenAI TTS | ~$0.10 (AI + TTS) |
| **Production (Premium)** | OpenAI GPT-4o | ElevenLabs | ~$0.35 (AI + premium TTS) |
| **On-Premise** | OpenAI GPT-4o | Piper-GPL (Piper) | ~$0.05 (AI only, TTS free) |

## Testing

```bash
# Check current enabled providers
curl http://localhost:3000/api/config/tts-voices | jq '.voices[] | .provider' | sort -u

# Expected output (with default settings):
# "piper"

# Enable OpenAI TTS
echo "ENABLE_OPENAI_TTS=true" >> .env
docker-compose up -d api

# Check again
curl http://localhost:3000/api/config/tts-voices | jq '.voices[] | .provider' | sort -u

# Expected output:
# "openai"
# "piper"
```

## Summary

✅ **AI models** are controlled by API key presence only  
✅ **TTS providers** require both API key AND enablement flag  
✅ **Piper-GPL** is always available (self-hosted, no cost)  
✅ **Default**: Only Piper-GPL enabled (cost-safe)  
✅ **Flexible**: Enable cloud TTS when needed for premium quality
