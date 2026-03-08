import OpenAI from 'openai';
import fs from 'fs/promises';
import type {
  TTSProvider,
  TTSProviderConfig,
  TTSOptions,
} from '../../types/tts-provider.js';

export class OpenAITTSProvider implements TTSProvider {
  name = 'openai-tts';
  private client: OpenAI;

  constructor(config: TTSProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async textToSpeech(
    text: string,
    outputPath: string,
    options: TTSOptions = {}
  ): Promise<void> {
    const { voice = 'alloy', speed = 1.0, format = 'mp3' } = options;

    // OpenAI TTS supports: alloy, echo, fable, onyx, nova, shimmer
    const response = await this.client.audio.speech.create({
      model: 'tts-1-hd', // or tts-1 for faster/cheaper
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed,
      response_format: format as 'mp3' | 'opus' | 'aac' | 'flac',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
  }

  async listVoices(): Promise<string[]> {
    return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  }
}
