import OpenAI from 'openai';
import type {
  AIProvider,
  AIProviderConfig,
  ScriptGenerationOptions,
} from '../../types/ai-provider.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4-turbo';
  }

  async generateScript(
    text: string,
    options: ScriptGenerationOptions = {}
  ): Promise<string> {
    const { 
      tone = 'professional', 
      maxDuration = 3, 
      style = 'summary',
      systemPrompt: customSystemPrompt,
      userPromptTemplate: customUserPrompt,
    } = options;

    // Use custom prompts if provided, otherwise use default
    const systemPrompt = customSystemPrompt || this.buildSystemPrompt(tone, maxDuration, style);
    
    let userPrompt = `Convert this report into a podcast script:\n\n${text}`;
    if (customUserPrompt) {
      // Replace {text} placeholder with actual text
      userPrompt = customUserPrompt.replaceAll('{text}', text);
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
  }

  private buildSystemPrompt(
    tone: string,
    maxDuration: number,
    style: string
  ): string {
    return `You are a professional podcast scriptwriter. Convert reports into engaging audio scripts.

Rules:
- Tone: ${tone}
- Target duration: ${maxDuration} minutes (~${maxDuration * 150} words)
- Style: ${style}
- Use natural, conversational language
- Add smooth transitions between topics
- No "Welcome to the podcast" or host introductions
- Focus on key insights and takeaways
- Make it sound like a human is naturally explaining the topic

Output only the script text, ready to be read aloud.`;
  }
}
