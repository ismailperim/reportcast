import { Router } from 'express';
import multer from 'multer';
import { PDFParser } from '../../../worker/src/parsers/pdf-parser.js';
import { db } from '../db/index.js';
import { reports } from '../db/schema.js';
import { reportQueue } from '../queue/index.js';
import { authenticateUser } from '../middleware/auth.js';
import { isFeatureEnabled } from '../config/deployment.js';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = '/app/uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Tier pricing (cents)
const TIER_PRICING = {
  short: 99,    // 1-5 pages: $0.99
  medium: 299,  // 6-15 pages: $2.99
  long: 499,    // 16-50 pages: $4.99
  enterprise: null, // 51+ pages: custom pricing
};

function detectTier(pageCount: number): keyof typeof TIER_PRICING {
  if (pageCount <= 5) return 'short';
  if (pageCount <= 15) return 'medium';
  if (pageCount <= 50) return 'long';
  return 'enterprise';
}

/**
 * POST /api/upload
 * 
 * Upload PDF and get pricing estimate
 */
router.post('/', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;
    const filePath = req.file.path;
    const filename = req.file.originalname;
    const fileSize = req.file.size;

    // Extract PDF metadata
    const pdfParser = new PDFParser();
    const metadata = await pdfParser.getMetadata(filePath);
    const pageCount = metadata.pages;

    // Detect tier and pricing (only in SaaS mode)
    let tier = 'unlimited';
    let priceCents = 0;

    if (isFeatureEnabled('pricing')) {
      // SaaS mode: Apply pricing tiers
      tier = detectTier(pageCount);
      priceCents = TIER_PRICING[tier] || 0;

      // Check if enterprise tier (requires manual pricing)
      if (tier === 'enterprise') {
        return res.status(400).json({
          error: 'Document too large for automated processing',
          pageCount,
          message: 'Please contact sales for enterprise pricing',
          contactEmail: 'sales@reportcast.com',
        });
      }
    } else {
      // On-premise mode: No pricing, unlimited pages
      tier = 'unlimited';
      priceCents = 0;
    }

    // Create report record
    const [report] = await db.insert(reports).values({
      userId,
      filename,
      fileSize,
      pageCount,
      tier,
      priceCents: priceCents!,
      status: 'pending',
    }).returning();

    const response: any = {
      reportId: report.id,
      filename,
      pageCount,
      tier,
      status: 'pending',
    };

    if (isFeatureEnabled('pricing')) {
      response.priceCents = priceCents;
      response.priceFormatted = `$${(priceCents / 100).toFixed(2)}`;
      response.currency = 'USD';
      response.message = 'Ready for processing. Confirm payment to start.';
    } else {
      response.message = 'Ready for processing. Confirm to start (free).';
    }

    res.json(response);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/upload/:reportId/confirm
 * 
 * Confirm payment and start processing
 */
router.post('/:reportId/confirm', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { 
      language = 'auto', 
      tone = 'professional',
      aiProvider = 'openai',
      aiModel = 'gpt-4-turbo',
      ttsProvider = 'openedai',
      ttsVoice = 'auto', // auto-select based on language
    } = req.body;
    const userId = req.user!.id;

    // Get report
    const [report] = await db.select().from(reports).where({ id: reportId }).limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ error: 'Report already processed or processing' });
    }

    // Premium model/voice check (SaaS only)
    if (isFeatureEnabled('premiumModels')) {
      const { aiModels, ttsVoices: ttsVoicesTable } = await import('../db/schema.js');
      const { eq, and } = await import('drizzle-orm');

      // Check AI model
      const [selectedModel] = await db
        .select()
        .from(aiModels)
        .where(and(
          eq(aiModels.modelId, aiModel),
          eq(aiModels.isActive, true)
        ))
        .limit(1);

      if (!selectedModel) {
        return res.status(400).json({ error: 'Selected AI model not available' });
      }

      if (selectedModel.isPremium) {
        // TODO: Check user's plan (free/paid)
        // For now, reject premium models in SaaS free tier
        const userPlan = req.user!.plan;
        if (userPlan === 'free') {
          return res.status(403).json({
            error: 'Premium model requires paid plan',
            model: selectedModel.displayName,
            upgrade: 'Upgrade to Team or Business plan',
          });
        }
      }

      // Check TTS voice (if not auto)
      if (ttsVoice !== 'auto') {
        const [selectedVoice] = await db
          .select()
          .from(ttsVoicesTable)
          .where(and(
            eq(ttsVoicesTable.voiceId, ttsVoice),
            eq(ttsVoicesTable.isActive, true)
          ))
          .limit(1);

        if (!selectedVoice) {
          return res.status(400).json({ error: 'Selected TTS voice not available' });
        }

        if (selectedVoice.isPremium && req.user!.plan === 'free') {
          return res.status(403).json({
            error: 'Premium voice requires paid plan',
            voice: selectedVoice.displayName,
            upgrade: 'Upgrade to Team or Business plan',
          });
        }
      }
    }

    // Process payment (SaaS only)
    if (isFeatureEnabled('payments') && report.priceCents > 0) {
      // TODO: Process Stripe payment
      // For now, skip in development
      console.log(`💳 Payment required: $${report.priceCents / 100}`);
    }

    // Update status and store provider/model choices
    await db.update(reports).set({ 
      status: 'processing',
      aiProvider,
      ttsProvider,
      voice: ttsVoice,
      tone,
    }).where({ id: reportId });

    // Add to queue
    await reportQueue.add('process-report', {
      reportId: report.id,
      userId: report.userId,
      filePath: `/app/uploads/${report.filename}`,
      tier: report.tier,
      aiProvider,
      aiModel,
      ttsProvider,
      ttsVoice,
      language,
      tone,
    });

    res.json({
      reportId: report.id,
      status: 'processing',
      message: 'Processing started. Check status endpoint for updates.',
    });

  } catch (error) {
    console.error('Confirm error:', error);
    res.status(500).json({ 
      error: 'Confirmation failed',
      message: (error as Error).message,
    });
  }
});

export default router;
