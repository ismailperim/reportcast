import fs from 'fs/promises';
import type {
  TTSProvider,
  TTSProviderConfig,
  TTSOptions,
} from '../../types/tts-provider.js';

export interface OpenedAIConfig extends TTSProviderConfig {
  baseURL?: string; // TTS server URL (default: http://localhost:8000)
}

/**
 * OpenedAI Speech Provider
 * 
 * OpenAI-compatible TTS API using Piper (and optionally XTTS-v2)
 * GitHub: https://github.com/matatonic/openedai-speech
 * 
 * Features:
 * - OpenAI API compatible (drop-in replacement)
 * - Piper backend (fast, free, 900+ voices)
 * - Optional XTTS-v2 (voice cloning, requires GPU)
 * - Docker-ready (<1GB with Piper only)
 * 
 * Setup:
 * ```bash
 * # Start TTS server
 * docker-compose up tts-server
 * 
 * # Or standalone
 * docker run -p 8000:8000 ghcr.io/matatonic/openedai-speech:latest
 * ```
 * 
 * Usage:
 * ```bash
 * npm run dev process inputs/report.pdf --tts-provider openedai
 * ```
 */
export class OpenedAITTSProvider implements TTSProvider {
  name = 'openedai';
  private baseURL: string;

  constructor(config: OpenedAIConfig = {}) {
    this.baseURL = config.baseURL || process.env.TTS_SERVER_URL || 'http://localhost:8000';
  }

  async textToSpeech(
    text: string,
    outputPath: string,
    options: TTSOptions = {}
  ): Promise<void> {
    const { voice = 'alloy', speed = 1.0, format = 'mp3' } = options;

    // OpenAI-compatible API endpoint
    const url = `${this.baseURL}/v1/audio/speech`;

    console.log(`[TTS] Sending request to ${url}`);
    console.log(`[TTS] Text length: ${text.length} chars, Voice: ${voice}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1', // Use tts-1 (lighter model)
          voice, // Piper voice name (e.g., en_US-lessac-medium)
          input: text,
          // Removed speed and response_format for minimal payload
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `OpenedAI TTS API error (${response.status}): ${error}\n` +
          `Make sure TTS server is running: ${this.baseURL}`
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`TTS request timeout after 60s (${this.baseURL})`);
      }
      throw error;
    }
  }

  async listVoices(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`);
      
      if (!response.ok) {
        throw new Error(`Failed to list voices: ${response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ id: string }> };
      return data.data.map((model) => model.id);
    } catch (error) {
      // Fallback to common Piper voices if server unreachable
      console.warn(`Failed to fetch voices from ${this.baseURL}:`, error);
      return [
        'alloy',
        'echo',
        'fable',
        'onyx',
        'nova',
        'shimmer',
        // Piper voices (if server configured)
        'en_US-lessac-medium',
        'en_US-amy-medium',
        'en_US-ryan-medium',
      ];
    }
  }

  /**
   * Check if TTS server is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
