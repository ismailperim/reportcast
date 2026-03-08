# ReportCast Worker

Core processing engine that transforms reports into podcasts.

## Features

- 📄 **PDF to Text** - Extract content from any PDF
- 🤖 **AI Script Generation** - Multiple providers (OpenAI, Anthropic)
- 🎙️ **Text-to-Speech** - Multiple providers (OpenAI TTS, ElevenLabs)
- 🔌 **Pluggable Architecture** - Easy to add new providers

## Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Add your API keys to .env
```

## Usage

```bash
# Basic usage (OpenAI for both AI and TTS)
pnpm dev process inputs/sample.pdf

# Custom output path
pnpm dev process inputs/report.pdf --output outputs/my-podcast.mp3

# Use Anthropic for AI
pnpm dev process inputs/report.pdf --ai-provider anthropic

# Use ElevenLabs for TTS
pnpm dev process inputs/report.pdf --tts-provider elevenlabs --voice Rachel

# Use OpenedAI (free, self-hosted)
# First: docker-compose up tts-server
pnpm dev process inputs/report.pdf --tts-provider openedai --voice en_US-lessac-medium

# Casual tone
pnpm dev process inputs/report.pdf --tone casual

# Mix and match
pnpm dev process inputs/report.pdf \
  --ai-provider anthropic \
  --tts-provider elevenlabs \
  --voice Rachel \
  --tone storytelling \
  --output outputs/story.mp3
```

## Supported Providers

### AI Providers

| Provider | Model | Notes |
|----------|-------|-------|
| OpenAI | `gpt-4-turbo` | Fast, reliable |
| Anthropic | `claude-sonnet-4` | High quality scripts |

### TTS Providers

| Provider | Voices | Notes |
|----------|--------|-------|
| **OpenedAI** ⭐ | 900+ voices, 40+ languages | **FREE, self-hosted (Docker), Piper backend** |
| OpenAI TTS | alloy, echo, fable, onyx, nova, shimmer | Cloud API, $0.045 per 3-min |
| ElevenLabs | Rachel, + custom | Premium, $0.30 per 3-min |

## Architecture

```
src/
├── types/               # Provider interfaces
│   ├── ai-provider.ts
│   └── tts-provider.ts
├── providers/           # Provider implementations
│   ├── ai/
│   │   ├── openai.ts
│   │   └── anthropic.ts
│   └── tts/
│       ├── openai-tts.ts
│       └── elevenlabs.ts
├── parsers/             # Input parsers
│   └── pdf-parser.ts
├── processor.ts         # Main orchestrator
├── provider-factory.ts  # Factory pattern
└── index.ts            # CLI entry point
```

## Adding New Providers

### Add AI Provider

1. Create `src/providers/ai/my-provider.ts`
2. Implement `AIProvider` interface
3. Add to `ProviderFactory`
4. Update `AIProviderType` in types

### Add TTS Provider

1. Create `src/providers/tts/my-provider.ts`
2. Implement `TTSProvider` interface
3. Add to `ProviderFactory`
4. Update `TTSProviderType` in types

## Test PDFs

Put test PDFs in `inputs/` directory. Example sources:

- Company post-mortems
- Business reports
- Academic papers
- Meeting notes

## License

MIT
