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
      .select()
      .from(ttsVoices)
      .where(eq(ttsVoices.isActive, true));

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
