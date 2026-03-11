import { db } from '../db/index.js';
import { ttsVoices } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Auto-sync TTS voice availability based on environment variables
 * 
 * Strategy:
 * - Piper: ALWAYS active (free, on-premise default)
 * - OpenAI TTS: Active if ENABLE_OPENAI_TTS=true AND OPENAI_API_KEY exists
 * - ElevenLabs: Active if ENABLE_ELEVENLABS_TTS=true AND ELEVENLABS_API_KEY exists
 * 
 * This runs on API startup to ensure voice availability matches deployment config.
 */
export async function syncTTSVoices() {
  console.log('🔄 Syncing TTS voice availability...');

  try {
    // Piper: Always active (free on-premise TTS)
    await db.execute(sql.raw(`UPDATE tts_voices SET is_active = true WHERE provider = 'piper'`));
    console.log('  ✅ Piper voices: ACTIVE (free on-premise)');

    // OpenAI TTS: Check environment
    const openaiEnabled = 
      process.env.ENABLE_OPENAI_TTS === 'true' && 
      !!process.env.OPENAI_API_KEY;
    
    await db.execute(sql.raw(`UPDATE tts_voices SET is_active = ${openaiEnabled} WHERE provider = 'openai'`));
    
    console.log(`  ${openaiEnabled ? '✅' : '⚪'} OpenAI TTS voices: ${openaiEnabled ? 'ACTIVE' : 'DISABLED'}`);
    if (!openaiEnabled && process.env.OPENAI_API_KEY) {
      console.log('     💡 Tip: Set ENABLE_OPENAI_TTS=true to enable premium OpenAI voices');
    }

    // ElevenLabs: Check environment
    const elevenlabsEnabled = 
      process.env.ENABLE_ELEVENLABS_TTS === 'true' && 
      !!process.env.ELEVENLABS_API_KEY;
    
    await db.execute(sql.raw(`UPDATE tts_voices SET is_active = ${elevenlabsEnabled} WHERE provider = 'elevenlabs'`));
    
    console.log(`  ${elevenlabsEnabled ? '✅' : '⚪'} ElevenLabs voices: ${elevenlabsEnabled ? 'ACTIVE' : 'DISABLED'}`);
    if (!elevenlabsEnabled && process.env.ELEVENLABS_API_KEY) {
      console.log('     💡 Tip: Set ENABLE_ELEVENLABS_TTS=true to enable premium ElevenLabs voices');
    }

    console.log('✅ TTS voice sync completed');

  } catch (error) {
    console.error('❌ Failed to sync TTS voices:', error);
    // Don't crash the server, just log the error
  }
}
