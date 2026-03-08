import { Router } from 'express';
import { db } from '../db/index.js';
import { aiModels, ttsVoices, prompts, settings } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ===== AI MODELS =====

// List all AI models
router.get('/models', async (req, res) => {
  try {
    const models = await db
      .select()
      .from(aiModels)
      .orderBy(aiModels.sortOrder, aiModels.displayName);

    res.json({ models });
  } catch (error) {
    console.error('Failed to fetch AI models:', error);
    res.status(500).json({ error: 'Failed to fetch AI models' });
  }
});

// Get single AI model
router.get('/models/:id', async (req, res) => {
  try {
    const [model] = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.id, req.params.id))
      .limit(1);

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ model });
  } catch (error) {
    console.error('Failed to fetch AI model:', error);
    res.status(500).json({ error: 'Failed to fetch AI model' });
  }
});

// Create AI model
router.post('/models', async (req, res) => {
  try {
    const { provider, modelId, displayName, description, costPer1kTokens, isPremium, isActive, isDefault, sortOrder } = req.body;

    if (!provider || !modelId || !displayName) {
      return res.status(400).json({ error: 'Missing required fields: provider, modelId, displayName' });
    }

    const [model] = await db
      .insert(aiModels)
      .values({
        provider,
        modelId,
        displayName,
        description,
        costPer1kTokens,
        isPremium: isPremium ?? false,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    res.status(201).json({ model });
  } catch (error) {
    console.error('Failed to create AI model:', error);
    res.status(500).json({ error: 'Failed to create AI model' });
  }
});

// Update AI model
router.patch('/models/:id', async (req, res) => {
  try {
    const { provider, modelId, displayName, description, costPer1kTokens, isPremium, isActive, isDefault, sortOrder } = req.body;

    const [model] = await db
      .update(aiModels)
      .set({
        ...(provider && { provider }),
        ...(modelId && { modelId }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(costPer1kTokens !== undefined && { costPer1kTokens }),
        ...(isPremium !== undefined && { isPremium }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(aiModels.id, req.params.id))
      .returning();

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ model });
  } catch (error) {
    console.error('Failed to update AI model:', error);
    res.status(500).json({ error: 'Failed to update AI model' });
  }
});

// Delete AI model
router.delete('/models/:id', async (req, res) => {
  try {
    const [model] = await db
      .delete(aiModels)
      .where(eq(aiModels.id, req.params.id))
      .returning();

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ message: 'Model deleted', model });
  } catch (error) {
    console.error('Failed to delete AI model:', error);
    res.status(500).json({ error: 'Failed to delete AI model' });
  }
});

// ===== TTS VOICES =====

// List all TTS voices
router.get('/voices', async (req, res) => {
  try {
    const voices = await db
      .select()
      .from(ttsVoices)
      .orderBy(ttsVoices.sortOrder, ttsVoices.displayName);

    res.json({ voices });
  } catch (error) {
    console.error('Failed to fetch TTS voices:', error);
    res.status(500).json({ error: 'Failed to fetch TTS voices' });
  }
});

// Get single TTS voice
router.get('/voices/:id', async (req, res) => {
  try {
    const [voice] = await db
      .select()
      .from(ttsVoices)
      .where(eq(ttsVoices.id, req.params.id))
      .limit(1);

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    res.json({ voice });
  } catch (error) {
    console.error('Failed to fetch TTS voice:', error);
    res.status(500).json({ error: 'Failed to fetch TTS voice' });
  }
});

// Create TTS voice
router.post('/voices', async (req, res) => {
  try {
    const { provider, voiceId, displayName, description, language, costPer1kChars, isPremium, isActive, isDefault, sortOrder } = req.body;

    if (!provider || !voiceId || !displayName) {
      return res.status(400).json({ error: 'Missing required fields: provider, voiceId, displayName' });
    }

    const [voice] = await db
      .insert(ttsVoices)
      .values({
        provider,
        voiceId,
        displayName,
        description,
        language,
        costPer1kChars,
        isPremium: isPremium ?? false,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    res.status(201).json({ voice });
  } catch (error) {
    console.error('Failed to create TTS voice:', error);
    res.status(500).json({ error: 'Failed to create TTS voice' });
  }
});

// Update TTS voice
router.patch('/voices/:id', async (req, res) => {
  try {
    const { provider, voiceId, displayName, description, language, costPer1kChars, isPremium, isActive, isDefault, sortOrder } = req.body;

    const [voice] = await db
      .update(ttsVoices)
      .set({
        ...(provider && { provider }),
        ...(voiceId && { voiceId }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(language !== undefined && { language }),
        ...(costPer1kChars !== undefined && { costPer1kChars }),
        ...(isPremium !== undefined && { isPremium }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(ttsVoices.id, req.params.id))
      .returning();

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    res.json({ voice });
  } catch (error) {
    console.error('Failed to update TTS voice:', error);
    res.status(500).json({ error: 'Failed to update TTS voice' });
  }
});

// Delete TTS voice
router.delete('/voices/:id', async (req, res) => {
  try {
    const [voice] = await db
      .delete(ttsVoices)
      .where(eq(ttsVoices.id, req.params.id))
      .returning();

    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }

    res.json({ message: 'Voice deleted', voice });
  } catch (error) {
    console.error('Failed to delete TTS voice:', error);
    res.status(500).json({ error: 'Failed to delete TTS voice' });
  }
});

// ===== PROMPTS =====

// List all prompts
router.get('/prompts', async (req, res) => {
  try {
    const allPrompts = await db
      .select()
      .from(prompts)
      .orderBy(prompts.sortOrder, prompts.name);

    res.json({ prompts: allPrompts });
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Get single prompt
router.get('/prompts/:id', async (req, res) => {
  try {
    const [prompt] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, req.params.id))
      .limit(1);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ prompt });
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// Create prompt
router.post('/prompts', async (req, res) => {
  try {
    const { name, tone, language, systemPrompt, userPromptTemplate, isActive, isDefault, sortOrder } = req.body;

    if (!name || !tone || !systemPrompt || !userPromptTemplate) {
      return res.status(400).json({ error: 'Missing required fields: name, tone, systemPrompt, userPromptTemplate' });
    }

    const userId = req.user?.id; // From auth middleware

    const [prompt] = await db
      .insert(prompts)
      .values({
        name,
        tone,
        language,
        systemPrompt,
        userPromptTemplate,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        sortOrder: sortOrder ?? 0,
        updatedBy: userId,
      })
      .returning();

    res.status(201).json({ prompt });
  } catch (error) {
    console.error('Failed to create prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Update prompt
router.patch('/prompts/:id', async (req, res) => {
  try {
    const { name, tone, language, systemPrompt, userPromptTemplate, isActive, isDefault, sortOrder } = req.body;

    const userId = req.user?.id;

    const [prompt] = await db
      .update(prompts)
      .set({
        ...(name && { name }),
        ...(tone && { tone }),
        ...(language !== undefined && { language }),
        ...(systemPrompt && { systemPrompt }),
        ...(userPromptTemplate && { userPromptTemplate }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(prompts.id, req.params.id))
      .returning();

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ prompt });
  } catch (error) {
    console.error('Failed to update prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete prompt
router.delete('/prompts/:id', async (req, res) => {
  try {
    const [prompt] = await db
      .delete(prompts)
      .where(eq(prompts.id, req.params.id))
      .returning();

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ message: 'Prompt deleted', prompt });
  } catch (error) {
    console.error('Failed to delete prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// ===== SETTINGS =====

// List all settings
router.get('/settings', async (req, res) => {
  try {
    const allSettings = await db
      .select()
      .from(settings);

    res.json({ settings: allSettings });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get single setting
router.get('/settings/:key', async (req, res) => {
  try {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, req.params.key))
      .limit(1);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    console.error('Failed to fetch setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update setting
router.patch('/settings/:key', async (req, res) => {
  try {
    const { value, description, isPublic } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'Missing required field: value' });
    }

    const userId = req.user?.id;

    const [setting] = await db
      .update(settings)
      .set({
        value,
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(settings.key, req.params.key))
      .returning();

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    console.error('Failed to update setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
