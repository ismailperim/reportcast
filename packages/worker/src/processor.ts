import { PDFParser } from './parsers/pdf-parser.js';
import type { AIProvider, ScriptGenerationOptions } from './types/ai-provider.js';
import type { TTSProvider, TTSOptions } from './types/tts-provider.js';

export interface ProcessOptions {
  aiOptions?: ScriptGenerationOptions;
  ttsOptions?: TTSOptions;
  verbose?: boolean;
}

export class ReportProcessor {
  private pdfParser: PDFParser;
  private aiProvider: AIProvider;
  private ttsProvider: TTSProvider;

  constructor(aiProvider: AIProvider, ttsProvider: TTSProvider) {
    this.pdfParser = new PDFParser();
    this.aiProvider = aiProvider;
    this.ttsProvider = ttsProvider;
  }

  async process(
    inputPath: string,
    outputPath: string,
    options: ProcessOptions = {}
  ): Promise<void> {
    const { aiOptions, ttsOptions, verbose = true } = options;

    try {
      // Temporary: Support .txt files for testing
      let text: string;
      if (inputPath.endsWith('.txt')) {
        if (verbose) {
          console.log('📄 Reading text file...');
        }
        const fs = await import('fs/promises');
        text = await fs.readFile(inputPath, 'utf-8');
        if (verbose) {
          console.log(`   └─ Read ${text.length} characters`);
        }
      } else {
        if (verbose) {
          console.log('📄 Extracting text from PDF...');
        }
        text = await this.pdfParser.extractText(inputPath);
        
        if (verbose) {
          const metadata = await this.pdfParser.getMetadata(inputPath);
          console.log(`   └─ Extracted ${text.length} characters from ${metadata.pages} pages`);
        }
      }

      if (verbose) {
        console.log(`\n🤖 Generating script with ${this.aiProvider.name}...`);
      }
      const script = await this.aiProvider.generateScript(text, aiOptions);
      
      if (verbose) {
        console.log(`   └─ Generated ${script.length} characters (~${Math.ceil(script.split(' ').length / 150)} min)`);
      }

      if (verbose) {
        console.log(`\n🎙️  Converting to audio with ${this.ttsProvider.name}...`);
      }
      await this.ttsProvider.textToSpeech(script, outputPath, ttsOptions);

      if (verbose) {
        console.log(`   └─ Saved to ${outputPath}`);
        console.log('\n✅ Done!\n');
      }
    } catch (error) {
      if (verbose) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      }
      throw error;
    }
  }

  /**
   * Get the generated script without TTS (useful for preview)
   */
  async generateScriptOnly(
    inputPath: string,
    options?: ScriptGenerationOptions
  ): Promise<string> {
    const text = await this.pdfParser.extractText(inputPath);
    return this.aiProvider.generateScript(text, options);
  }
}
