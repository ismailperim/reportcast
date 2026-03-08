import { db } from '../db/index.js';
import { prompts, ttsVoices } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  name: string;
}

/**
 * Get prompt template from database
 * @param tone - professional, casual, storytelling
 * @param language - tr, en, auto
 * @returns Prompt template with system and user prompts
 */
export async function getPromptTemplate(
  tone: string,
  language: string = 'auto'
): Promise<PromptTemplate> {
  // Normalize language code
  const lang = language === 'auto' ? 'tr' : language;

  // Try to find exact match (tone + language)
  const [exactMatch] = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.tone, tone),
        eq(prompts.language, lang),
        eq(prompts.isActive, true)
      )
    )
    .limit(1);

  if (exactMatch) {
    return {
      systemPrompt: exactMatch.systemPrompt,
      userPrompt: exactMatch.userPromptTemplate,
      name: exactMatch.name,
    };
  }

  // Fallback: Try language-agnostic prompt for this tone
  const [fallbackTone] = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.tone, tone),
        eq(prompts.isActive, true)
      )
    )
    .limit(1);

  if (fallbackTone) {
    return {
      systemPrompt: fallbackTone.systemPrompt,
      userPrompt: fallbackTone.userPromptTemplate,
      name: fallbackTone.name,
    };
  }

  // Last resort: Get default prompt
  const [defaultPrompt] = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.isDefault, true),
        eq(prompts.isActive, true)
      )
    )
    .limit(1);

  if (!defaultPrompt) {
    throw new Error('No active prompts found in database');
  }

  return {
    systemPrompt: defaultPrompt.systemPrompt,
    userPrompt: defaultPrompt.userPromptTemplate,
    name: defaultPrompt.name,
  };
}

/**
 * Detect language from text (simple heuristic)
 * @param text - Text to analyze
 * @returns Language code (tr or en)
 */
export async function detectLanguage(text: string): Promise<string> {
  // Simple Turkish character detection
  const turkishChars = /[ğĞıİöÖüÜşŞçÇ]/;
  const sampleText = text.slice(0, 500); // First 500 chars

  if (turkishChars.test(sampleText)) {
    return 'tr';
  }

  return 'en';
}

/**
 * Select appropriate TTS voice for language
 * @param language - Language code
 * @returns Voice ID
 */
export async function selectVoiceForLanguage(language: string): Promise<string> {
  // Get default voice for this language
  const [voice] = await db
    .select()
    .from(ttsVoices)
    .where(
      and(
        eq(ttsVoices.language, language),
        eq(ttsVoices.isDefault, true),
        eq(ttsVoices.isActive, true)
      )
    )
    .limit(1);

  if (voice) {
    return voice.voiceId;
  }

  // Fallback: Get any active voice for this language
  const [fallback] = await db
    .select()
    .from(ttsVoices)
    .where(
      and(
        eq(ttsVoices.language, language),
        eq(ttsVoices.isActive, true)
      )
    )
    .limit(1);

  if (fallback) {
    return fallback.voiceId;
  }

  // Default fallback
  return language === 'tr' ? 'turkish' : 'nova';
}

/**
 * Render prompt template with text
 * @param template - User prompt template
 * @param text - Text to insert
 * @returns Rendered prompt
 */
export function renderPrompt(template: string, text: string): string {
  return template.replaceAll('{text}', text);
}
