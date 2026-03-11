import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  TTSProvider,
  TTSProviderConfig,
  TTSOptions,
} from '../../types/tts-provider.js';

const execAsync = promisify(exec);

export interface PiperConfig extends TTSProviderConfig {
  baseURL?: string; // Piper HTTP server URL (default: http://localhost:5000)
}

/**
 * Piper-GPL TTS Provider
 * 
 * Pure Piper (OHF-Voice fork) with HTTP API
 * GitHub: https://github.com/OHF-Voice/piper1-gpl
 * 
 * Features:
 * - 900+ voices, 100+ languages
 * - Free and open-source (GPL)
 * - Fast CPU inference
 * - Lightweight (~200MB RAM)
 * 
 * Supported Languages (curated):
 * - Turkish (tr_TR)
 * - English (en_US, en_GB)
 * - German (de_DE)
 * - French (fr_FR)
 * - Spanish (es_ES, es_MX)
 * - Russian (ru_RU)
 * 
 * Setup:
 * Build custom Docker image with Piper HTTP server
 * See: Dockerfile.piper-http
 */
export class PiperTTSProvider implements TTSProvider {
  name = 'piper';
  private baseURL: string;

  constructor(config: PiperConfig = {}) {
    this.baseURL = config.baseURL || process.env.TTS_SERVER_URL || 'http://localhost:5000';
  }

  async textToSpeech(
    text: string,
    outputPath: string,
    options: TTSOptions = {}
  ): Promise<void> {
    const { voice = 'en_US-lessac-medium' } = options;

    console.log(`[TTS] Sending request to ${this.baseURL}`);
    console.log(`[TTS] Text length: ${text.length} chars, Voice: ${voice}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      // Step 1: Get WAV from Piper
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Piper TTS API error (${response.status}): ${error}\n` +
          `Make sure TTS server is running: ${this.baseURL}`
        );
      }

      // Step 2: Save WAV temporarily
      const wavBuffer = Buffer.from(await response.arrayBuffer());
      const tempWavPath = outputPath.replace(/\.mp3$/i, '.wav');
      await fs.writeFile(tempWavPath, wavBuffer);

      console.log(`[TTS] WAV saved: ${tempWavPath} (${wavBuffer.length} bytes)`);

      // Step 3: Convert WAV to MP3 with ffmpeg
      console.log(`[TTS] Converting WAV to MP3...`);
      const { stderr } = await execAsync(
        `ffmpeg -i "${tempWavPath}" -codec:a libmp3lame -qscale:a 2 "${outputPath}" -y`
      );

      if (stderr && !stderr.includes('Lame')) {
        console.warn(`[TTS] ffmpeg stderr: ${stderr}`);
      }

      // Step 4: Clean up WAV file
      await fs.unlink(tempWavPath);

      const mp3Stats = await fs.stat(outputPath);
      console.log(`[TTS] MP3 saved: ${outputPath} (${mp3Stats.size} bytes)`);

    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`TTS request timeout after 60s (${this.baseURL})`);
      }
      throw error;
    }
  }

  async listVoices(): Promise<string[]> {
    // Return curated voice list for supported languages
    return [
      // Turkish
      'tr_TR-dfki-medium',
      'tr_TR-fettah-medium',
      
      // English (US)
      'en_US-lessac-medium',
      'en_US-lessac-high',
      'en_US-amy-medium',
      'en_US-ryan-high',
      'en_US-libritts-high',
      
      // English (GB)
      'en_GB-alan-medium',
      'en_GB-alba-medium',
      'en_GB-southern_english_female-medium',
      
      // German
      'de_DE-thorsten-medium',
      'de_DE-karlsson-low',
      
      // French
      'fr_FR-upmc-medium',
      'fr_FR-siwis-medium',
      
      // Spanish (Spain)
      'es_ES-sharvard-medium',
      'es_ES-carlfm-x_low',
      
      // Spanish (Mexico)
      'es_MX-ald-medium',
      
      // Russian
      'ru_RU-ruslan-medium',
      'ru_RU-dmitri-medium',
    ];
  }

  /**
   * Check if TTS server is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
