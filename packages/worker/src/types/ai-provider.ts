/**
 * AI Provider Interface
 * Implement this to add new AI providers (OpenAI, Anthropic, Gemini, etc.)
 */

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
}

export interface ScriptGenerationOptions {
  tone?: 'professional' | 'casual' | 'storytelling';
  maxDuration?: number; // target duration in minutes
  style?: 'summary' | 'detailed' | 'highlights';
  systemPrompt?: string; // Custom system prompt (overrides default)
  userPromptTemplate?: string; // Custom user prompt template (overrides default)
}

export interface AIProvider {
  name: string;
  
  /**
   * Generate podcast script from text
   */
  generateScript(
    text: string,
    options?: ScriptGenerationOptions
  ): Promise<string>;
}

export type AIProviderType = 'openai' | 'anthropic';
