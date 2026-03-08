/**
 * TTS Provider Interface
 * Implement this to add new TTS providers (ElevenLabs, OpenAI, Piper, etc.)
 */

export interface TTSProviderConfig {
  apiKey?: string;
}

export interface TTSOptions {
  voice?: string;
  speed?: number; // 0.5 - 2.0
  format?: 'mp3' | 'wav' | 'opus';
}

export interface TTSProvider {
  name: string;
  
  /**
   * Convert text to speech and save to file
   */
  textToSpeech(
    text: string,
    outputPath: string,
    options?: TTSOptions
  ): Promise<void>;
  
  /**
   * List available voices
   */
  listVoices?(): Promise<string[]>;
}

export type TTSProviderType = 'openai' | 'elevenlabs' | 'openedai';
