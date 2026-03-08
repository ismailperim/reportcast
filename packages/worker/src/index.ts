#!/usr/bin/env node

import { config } from 'dotenv';
import { ReportProcessor } from './processor.js';
import { ProviderFactory } from './provider-factory.js';
import type { AIProviderType } from './types/ai-provider.js';
import type { TTSProviderType } from './types/tts-provider.js';

// Load environment variables
config();

interface CLIArgs {
  command: string;
  input?: string;
  output?: string;
  aiProvider?: AIProviderType;
  ttsProvider?: TTSProviderType;
  voice?: string;
  tone?: 'professional' | 'casual' | 'storytelling';
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  const parsed: CLIArgs = {
    command: args[0] || 'help',
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (!arg.startsWith('--') && !parsed.input) {
      parsed.input = arg;
    } else if (arg === '--output' || arg === '-o') {
      parsed.output = next;
      i++;
    } else if (arg === '--ai-provider') {
      parsed.aiProvider = next as AIProviderType;
      i++;
    } else if (arg === '--tts-provider') {
      parsed.ttsProvider = next as TTSProviderType;
      i++;
    } else if (arg === '--voice') {
      parsed.voice = next;
      i++;
    } else if (arg === '--tone') {
      parsed.tone = next as 'professional' | 'casual' | 'storytelling';
      i++;
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`
ReportCast Worker v0.1.0
Transform reports into podcasts

USAGE:
  pnpm dev process <input.pdf> [options]

OPTIONS:
  --output, -o <file>       Output MP3 file (default: outputs/output.mp3)
  --ai-provider <provider>  AI provider: openai, anthropic (default: openai)
  --tts-provider <provider> TTS provider: openai, elevenlabs (default: openai)
  --voice <name>            Voice name (provider-specific)
  --tone <tone>             Tone: professional, casual, storytelling

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY            OpenAI API key
  ANTHROPIC_API_KEY         Anthropic API key
  ELEVENLABS_API_KEY        ElevenLabs API key

EXAMPLES:
  # Basic usage (OpenAI for both)
  pnpm dev process inputs/report.pdf

  # Use Anthropic AI + ElevenLabs TTS
  pnpm dev process inputs/report.pdf --ai-provider anthropic --tts-provider elevenlabs

  # Custom voice and tone
  pnpm dev process inputs/report.pdf --voice nova --tone casual
`);
}

async function main() {
  const args = parseArgs();

  if (args.command === 'help' || !args.input) {
    printHelp();
    process.exit(0);
  }

  if (args.command !== 'process') {
    console.error(`Unknown command: ${args.command}`);
    printHelp();
    process.exit(1);
  }

  // Defaults
  const aiProviderType = args.aiProvider || 'openai';
  const ttsProviderType = args.ttsProvider || 'openai';
  const outputPath = args.output || 'outputs/output.mp3';

  // Get API keys
  const aiApiKey = aiProviderType === 'openai' 
    ? process.env.OPENAI_API_KEY 
    : process.env.ANTHROPIC_API_KEY;

  const ttsApiKey = ttsProviderType === 'openai'
    ? process.env.OPENAI_API_KEY
    : ttsProviderType === 'openedai'
    ? undefined // OpenedAI doesn't need API key (self-hosted)
    : process.env.ELEVENLABS_API_KEY;

  if (!aiApiKey) {
    console.error(`❌ Missing API key for AI provider: ${aiProviderType.toUpperCase()}_API_KEY`);
    process.exit(1);
  }

  if (!ttsApiKey && ttsProviderType !== 'openedai') {
    console.error(`❌ Missing API key for TTS provider: ${ttsProviderType.toUpperCase()}_API_KEY`);
    process.exit(1);
  }

  // Create providers
  const aiProvider = ProviderFactory.createAIProvider(aiProviderType, aiApiKey);
  const ttsProvider = ProviderFactory.createTTSProvider(ttsProviderType, ttsApiKey);

  // Process
  const processor = new ReportProcessor(aiProvider, ttsProvider);

  await processor.process(args.input, outputPath, {
    aiOptions: {
      tone: args.tone || 'professional',
    },
    ttsOptions: {
      voice: args.voice,
    },
    verbose: true,
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
