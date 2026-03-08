import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export interface ReportJobData {
  reportId: string;
  userId: string;
  filePath: string;
  tier: string;
  aiProvider: 'openai' | 'anthropic';
  ttsProvider: 'openedai' | 'openai' | 'elevenlabs';
  language: string; // "auto", "tr", "en", etc.
  tone: 'professional' | 'casual' | 'storytelling';
}

export const reportQueue = new Queue<ReportJobData>('report-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

// Queue event listeners
reportQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

reportQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

reportQueue.on('active', (job) => {
  console.log(`Job ${job.id} started processing`);
});

reportQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

reportQueue.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

console.log('✅ Report queue initialized');
