import { Router } from 'express';
import { db } from '../db/index.js';
import { aiModels, ttsVoices, settings } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getDeploymentConfig, isFeatureEnabled } from '../config/deployment.js';

export const configRouter = Router();

/**
 * GET /api/config
 * 
 * Get public configuration (deployment mode, features, available models)
 */
configRouter.get('/', async (req, res) => {
  try {
    const deploymentConfig = getDeploymentConfig();

    // Get public settings
    const publicSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.isPublic, true));

    // Convert to key-value map
    const settingsMap: Record<string, string> = {};
    publicSettings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      deployment: {
        mode: deploymentConfig.mode,
        features: deploymentConfig.features,
      },
      settings: settingsMap,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

/**
 * GET /api/config/ai-models
 * 
 * Get available AI models (only active, respecting premium in SaaS mode)
 */
configRouter.get('/ai-models', async (req, res) => {
  try {
    let models = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.isActive, true));

    // Filter by available API keys
    const availableProviders = new Set<string>();
    if (process.env.OPENAI_API_KEY) availableProviders.add('openai');
    if (process.env.ANTHROPIC_API_KEY) availableProviders.add('anthropic');

    models = models.filter(m => availableProviders.has(m.provider));

    // In SaaS mode, filter premium models unless user is authenticated & paid
    if (isFeatureEnabled('premiumModels')) {
      // TODO: Check user subscription status
      // For now, show all models with isPremium flag
    }

    res.json({ models });
  } catch (error) {
    console.error('Get AI models error:', error);
    res.status(500).json({ error: 'Failed to get AI models' });
  }
});

/**
 * GET /api/config/tts-voices
 * 
 * Get available TTS voices (only active, respecting premium in SaaS mode)
 */
configRouter.get('/tts-voices', async (req, res) => {
  try {
    let voices = await db
      .select({
        id: ttsVoices.id,
        provider: ttsVoices.provider,
        voiceId: ttsVoices.voiceId,
        displayName: ttsVoices.displayName,
        description: ttsVoices.description,
        language: ttsVoices.language,
        isPremium: ttsVoices.isPremium,
        isDefault: ttsVoices.isDefault,
      })
      .from(ttsVoices)
      .where(eq(ttsVoices.isActive, true));

    // Filter by available API keys/services AND enablement flags
    const availableProviders = new Set<string>();
    
    // Piper (self-hosted) is always available
    availableProviders.add('piper');
    
    // Legacy: OpenedAI (if still in use)
    availableProviders.add('openedai');
    
    // OpenAI TTS - requires both API key AND enablement flag
    if (process.env.OPENAI_API_KEY && process.env.ENABLE_OPENAI_TTS === 'true') {
      availableProviders.add('openai');
    }
    
    // ElevenLabs TTS - requires both API key AND enablement flag
    if (process.env.ELEVENLABS_API_KEY && process.env.ENABLE_ELEVENLABS_TTS === 'true') {
      availableProviders.add('elevenlabs');
    }

    voices = voices.filter(v => availableProviders.has(v.provider));

    // In SaaS mode, filter premium voices unless user is authenticated & paid
    if (isFeatureEnabled('premiumModels')) {
      // TODO: Check user subscription status
    }

    res.json({ voices });
  } catch (error) {
    console.error('Get TTS voices error:', error);
    res.status(500).json({ error: 'Failed to get TTS voices' });
  }
});

export default configRouter;
