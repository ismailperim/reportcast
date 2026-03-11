import { OpenAIProvider } from './providers/ai/openai.js';
import { AnthropicProvider } from './providers/ai/anthropic.js';
import { OpenAITTSProvider } from './providers/tts/openai-tts.js';
import { ElevenLabsProvider } from './providers/tts/elevenlabs.js';
import { OpenedAITTSProvider } from './providers/tts/openedai-tts.js';
import { PiperTTSProvider } from './providers/tts/piper-tts.js';
import type { AIProvider, AIProviderType } from './types/ai-provider.js';
import type { TTSProvider, TTSProviderType } from './types/tts-provider.js';

export class ProviderFactory {
  static createAIProvider(
    type: AIProviderType,
    apiKey: string,
    model?: string
  ): AIProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider({ apiKey, model });
      case 'anthropic':
        return new AnthropicProvider({ apiKey, model });
      default:
        throw new Error(`Unknown AI provider: ${type}`);
    }
  }

  static createTTSProvider(
    type: TTSProviderType,
    apiKey?: string
  ): TTSProvider {
    switch (type) {
      case 'openai':
        if (!apiKey) throw new Error('OpenAI API key required');
        return new OpenAITTSProvider({ apiKey });
      case 'elevenlabs':
        if (!apiKey) throw new Error('ElevenLabs API key required');
        return new ElevenLabsProvider({ apiKey });
      case 'openedai':
        // OpenedAI (Piper backend) doesn't need API key
        // Uses local HTTP server (Docker service)
        return new OpenedAITTSProvider();
      case 'piper':
        // Piper-GPL (Pure Piper) doesn't need API key
        // Uses local HTTP server (Docker service)
        return new PiperTTSProvider();
      default:
        throw new Error(`Unknown TTS provider: ${type}`);
    }
  }
}
