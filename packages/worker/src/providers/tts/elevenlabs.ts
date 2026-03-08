import fs from 'fs/promises';
import type {
  TTSProvider,
  TTSProviderConfig,
  TTSOptions,
} from '../../types/tts-provider.js';

export class ElevenLabsProvider implements TTSProvider {
  name = 'elevenlabs';
  private apiKey: string;
  private apiUrl = 'https://api.elevenlabs.io/v1';

  constructor(config: TTSProviderConfig) {
    if (!config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.apiKey = config.apiKey;
  }

  async textToSpeech(
    text: string,
    outputPath: string,
    options: TTSOptions = {}
  ): Promise<void> {
    const { voice = 'Rachel', speed = 1.0 } = options;

    // Get voice ID (you'd want to cache this or make it configurable)
    const voiceId = await this.getVoiceId(voice);

    const response = await fetch(
      `${this.apiUrl}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
  }

  async listVoices(): Promise<string[]> {
    const response = await fetch(`${this.apiUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const data = await response.json() as { voices: Array<{ name: string }> };
    return data.voices.map((v) => v.name);
  }

  private async getVoiceId(voiceName: string): Promise<string> {
    const response = await fetch(`${this.apiUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const data = await response.json() as { voices: Array<{ name: string; voice_id: string }> };
    const voice = data.voices.find((v) => v.name === voiceName);

    if (!voice) {
      throw new Error(`Voice "${voiceName}" not found`);
    }

    return voice.voice_id;
  }
}
