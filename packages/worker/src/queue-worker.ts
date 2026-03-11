import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from 'dotenv';
import { ReportProcessor } from './processor.js';
import { ProviderFactory } from './provider-factory.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { reports } from '../../api/src/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { S3Storage } from '../../api/src/storage/s3-storage.js';
import { getPromptTemplate, detectLanguage, selectVoiceForLanguage, renderPrompt } from '../../api/src/services/prompt-service.js';
import { PDFParser } from './parsers/pdf-parser.js';

// Load environment variables
config();

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'reportcast',
  password: process.env.DB_PASSWORD || 'reportcast_dev_password',
  database: process.env.DB_NAME || 'reportcast',
});

const db = drizzle(pool);

// Initialize S3 storage (optional)
let storage: S3Storage | null = null;

if (process.env.S3_PROVIDER) {
  storage = new S3Storage({
    provider: (process.env.S3_PROVIDER as any),
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'reportcast',
    region: process.env.S3_REGION || 'us-east-1',
    publicUrl: process.env.S3_PUBLIC_URL,
  });

  // Initialize storage (create bucket if needed)
  storage.initialize().catch(err => {
    console.error('Failed to initialize S3 storage:', err);
  });
  
  console.log('✅ S3 storage enabled');
} else {
  console.log('💾 Using local disk storage');
}

interface ReportJobData {
  reportId: string;
  userId: string;
  filePath: string;
  tier: string;
  aiProvider: 'openai' | 'anthropic';
  aiModel?: string; // Model ID (gpt-4-turbo, claude-sonnet-4, etc.)
  ttsProvider: 'piper' | 'openedai' | 'openai' | 'elevenlabs';
  ttsVoice?: string; // Voice ID or 'auto'
  language: string;
  tone: 'professional' | 'casual' | 'storytelling';
}

// Worker
const worker = new Worker<ReportJobData>(
  'report-processing',
  async (job) => {
    const { 
      reportId,
      userId,
      filePath,
      tier,
      aiProvider, 
      aiModel,
      ttsProvider, 
      ttsVoice,
      language, 
      tone 
    } = job.data;

    console.log(`[Job ${job.id}] Processing report ${reportId}`);
    console.log(`[Job ${job.id}] AI: ${aiProvider}/${aiModel || 'default'}, TTS: ${ttsProvider}/${ttsVoice || 'auto'}`);
    console.log(`[Job ${job.id}] Language: ${language}, Tone: ${tone}`);

    const startTime = Date.now();

    try {
      // Update status to processing
      await db
        .update(reports)
        .set({ status: 'processing' })
        .where(eq(reports.id, reportId));

      // Get API keys
      const aiApiKey = aiProvider === 'openai'
        ? process.env.OPENAI_API_KEY!
        : process.env.ANTHROPIC_API_KEY!;

      const ttsApiKey = ttsProvider === 'openai'
        ? process.env.OPENAI_API_KEY
        : ttsProvider === 'elevenlabs'
        ? process.env.ELEVENLABS_API_KEY
        : undefined; // OpenedAI doesn't need API key

      // Extract text from PDF
      const pdfParser = new PDFParser();
      const extractedText = await pdfParser.extractText(filePath);
      console.log(`[Job ${job.id}] Extracted ${extractedText.length} characters`);

      // Detect language if auto
      let detectedLanguage = language;
      if (language === 'auto') {
        detectedLanguage = await detectLanguage(extractedText);
        console.log(`[Job ${job.id}] Detected language: ${detectedLanguage}`);
      }

      // Get prompt template from database
      const promptTemplate = await getPromptTemplate(tone, detectedLanguage);
      console.log(`[Job ${job.id}] Using prompt for ${tone} / ${detectedLanguage}`);

      // Select voice: use provided or auto-select for language
      let selectedVoice: string;
      if (ttsVoice && ttsVoice !== 'auto') {
        selectedVoice = ttsVoice;
        console.log(`[Job ${job.id}] Using provided voice: ${selectedVoice}`);
      } else {
        selectedVoice = await selectVoiceForLanguage(detectedLanguage);
        console.log(`[Job ${job.id}] Auto-selected voice: ${selectedVoice}`);
      }

      // Create AI provider
      const aiProviderInstance = ProviderFactory.createAIProvider(aiProvider, aiApiKey, aiModel);

      // Step 1: Extract text from PDF
      console.log('📄 Extracting text from PDF...');
      const finalExtractedText = await pdfParser.extractText(filePath);
      console.log(`   └─ Extracted ${finalExtractedText.length} characters`);

      // Step 2: Generate script with AI
      console.log(`\n🤖 Generating script with ${aiProviderInstance.name}...`);
      const generatedScript = await aiProviderInstance.generateScript(finalExtractedText, {
        tone,
        systemPrompt: promptTemplate.systemPrompt,
        userPromptTemplate: promptTemplate.userPrompt,
      });
      console.log(`   └─ Generated ${generatedScript.length} characters (~${Math.ceil(generatedScript.split(' ').length / 150)} min)`);

      // Step 3: Save extracted text and generated script BEFORE TTS
      // This ensures we have the data even if TTS fails
      console.log('\n💾 Saving extracted text and generated script to database...');
      await db
        .update(reports)
        .set({
          extractedText: finalExtractedText,
          generatedScript: generatedScript,
        })
        .where(eq(reports.id, reportId));
      console.log('   ✅ Scripts saved to database');

      // Step 4: Generate audio with TTS
      console.log(`\n🎙️  Converting to audio with ${ttsProvider}...`);
      const ttsProviderInstance = ProviderFactory.createTTSProvider(ttsProvider, ttsApiKey);
      const outputPath = `/app/outputs/${reportId}.mp3`;
      
      await ttsProviderInstance.textToSpeech(generatedScript, outputPath, {
        voice: selectedVoice,
      });

      // Get file stats
      const stats = await fs.stat(outputPath);
      const audioSize = stats.size;

      // TODO: Calculate audio duration (need audio metadata library)
      const audioDurationSeconds = Math.ceil(audioSize / 50000); // Rough estimate

      // Calculate costs (rough estimates)
      const fileStats = await fs.stat(filePath);
      const pdfSizeKB = fileStats.size / 1024;
      const aiCostCents = Math.ceil(pdfSizeKB * 0.001); // $0.001 per KB estimate

      const ttsCostCents = (ttsProvider === 'piper' || ttsProvider === 'openedai') ? 0 : 5; // Piper and OpenedAI are free

      const processingTimeMs = Date.now() - startTime;

      let audioUrl: string;
      let s3Key: string | null = null;

      // Upload to S3 or keep local
      if (storage) {
        s3Key = `podcasts/${reportId}.mp3`;
        console.log(`📤 Uploading to S3: ${s3Key}`);
        
        audioUrl = await storage.uploadFile(outputPath, s3Key, {
          contentType: 'audio/mpeg',
          isPublic: false,
          metadata: {
            reportId,
            userId,
            tier,
          },
        });

        console.log(`✅ Uploaded to S3: ${audioUrl}`);

        // Clean up local file
        await fs.unlink(outputPath);
      } else {
        // Keep file locally
        audioUrl = `/api/reports/${reportId}/download`;
        console.log(`💾 Audio saved locally: ${outputPath}`);
      }

      // Update report with results
      await db
        .update(reports)
        .set({
          status: 'completed',
          s3Key,
          audioUrl,
          audioSize,
          audioDurationSeconds,
          extractedText: finalExtractedText,
          generatedScript,
          aiCostCents,
          ttsCostCents,
          processingTimeMs,
          completedAt: new Date(),
        })
        .where(eq(reports.id, reportId));

      console.log(`[Job ${job.id}] ✅ Completed in ${processingTimeMs}ms`);

      return {
        success: true,
        reportId,
        audioUrl: `/api/reports/${reportId}/download`,
        processingTimeMs,
      };

    } catch (error) {
      console.error(`[Job ${job.id}] ❌ Failed:`, error);

      // Update report with error
      await db
        .update(reports)
        .set({
          status: 'failed',
          errorMessage: (error as Error).message,
        })
        .where(eq(reports.id, reportId));

      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
  }
);

// Worker event listeners
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

console.log('🚀 ReportCast Worker started');
console.log(`   Concurrency: ${process.env.WORKER_CONCURRENCY || '2'}`);
console.log(`   Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
console.log(`   Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await worker.close();
  process.exit(0);
});
