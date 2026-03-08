import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  AIProviderConfig,
  ScriptGenerationOptions,
} from '../../types/ai-provider.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || 'claude-sonnet-4';
  }

  async generateScript(
    text: string,
    options: ScriptGenerationOptions = {}
  ): Promise<string> {
    const { tone = 'professional', maxDuration = 3, style = 'summary' } = options;

    const systemPrompt = this.buildSystemPrompt(tone, maxDuration, style);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Convert this report into a podcast script:\n\n${text}`,
        },
      ],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : '';
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
