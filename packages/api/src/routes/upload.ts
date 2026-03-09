import { Router } from 'express';
import multer from 'multer';
import { PDFParser } from '../../../worker/src/parsers/pdf-parser.js';
import { db } from '../db/index.js';
import { reports, users } from '../db/schema.js';
import { reportQueue } from '../queue/index.js';
import { authenticateUser } from '../middleware/auth.js';
import { isFeatureEnabled } from '../config/deployment.js';
import { getPricingConfig, calculateRequiredCredits } from '../services/pricing-service.js';
import { eq } from 'drizzle-orm';
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

// Max pages for automated processing
const MAX_PAGES_AUTO = 200;

/**
 * POST /api/upload
 * 
 * Upload PDF and check credit requirements
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

    // Check page limit
    if (isFeatureEnabled('pricing') && pageCount > MAX_PAGES_AUTO) {
      return res.status(400).json({
        error: 'Document too large for automated processing',
        pageCount,
        maxPages: MAX_PAGES_AUTO,
        message: 'Please contact sales for large document processing',
        contactEmail: 'sales@reportcast.com',
      });
    }

    // Calculate required credits (MVP: Pay-per-use model)
    let requiredCredits = 0;
    let tier = 'unlimited';

    if (isFeatureEnabled('pricing')) {
      const pricing = await getPricingConfig();
      requiredCredits = calculateRequiredCredits(pageCount, pricing.creditsPerPage);
      tier = 'pay-per-use';
    }

    // Create report record
    const [report] = await db.insert(reports).values({
      userId,
      filename,
      fileSize,
      pageCount,
      tier,
      priceCents: 0, // MVP: Credits only, no direct pricing
      status: 'pending',
    }).returning();

    const response: any = {
      reportId: report.id,
      filename,
      pageCount,
      status: 'pending',
    };

    if (isFeatureEnabled('pricing')) {
      const userCredits = req.user!.creditsRemaining;
      const hasEnoughCredits = userCredits >= requiredCredits;

      response.creditsRequired = requiredCredits;
      response.creditsAvailable = userCredits;
      response.hasEnoughCredits = hasEnoughCredits;
      
      if (hasEnoughCredits) {
        response.message = `Ready to process. Will consume ${requiredCredits} credits.`;
      } else {
        response.message = `Insufficient credits. You need ${requiredCredits} credits but have ${userCredits}.`;
        response.creditDeficit = requiredCredits - userCredits;
        
        // Recommend package
        const pricing = await getPricingConfig();
        const recommendedPackage = pricing.packages.find(pkg => 
          pkg.credits >= (requiredCredits - userCredits)
        );
        
        if (recommendedPackage) {
          response.recommendedPackage = {
            id: recommendedPackage.id,
            name: recommendedPackage.name,
            credits: recommendedPackage.credits,
            price: recommendedPackage.priceCents / 100,
            priceCents: recommendedPackage.priceCents,
            priceFormatted: recommendedPackage.priceFormatted,
          };
        }
      }
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
 * Confirm and start processing (deducts credits)
 */
router.post('/:reportId/confirm', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { language = 'auto', tone = 'professional', aiProvider = 'openai', aiModel = 'gpt-4-turbo', ttsProvider = 'openedai', ttsVoice = 'auto' } = req.body;
    const userId = req.user!.id;

    // Get report
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ error: 'Report already processed or processing' });
    }

    // Credit check (SaaS mode only)
    if (isFeatureEnabled('pricing')) {
      const pricing = await getPricingConfig();
      const requiredCredits = calculateRequiredCredits(report.pageCount, pricing.creditsPerPage);

      // Get fresh user credits
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.creditsRemaining < requiredCredits) {
        return res.status(402).json({
          error: 'Insufficient credits',
          creditsRequired: requiredCredits,
          creditsAvailable: user.creditsRemaining,
          message: 'Please purchase credits to continue',
        });
      }

      // Deduct credits
      await db
        .update(users)
        .set({ 
          creditsRemaining: user.creditsRemaining - requiredCredits,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      console.log(`✅ Deducted ${requiredCredits} credits from user ${userId} (had ${user.creditsRemaining}, now ${user.creditsRemaining - requiredCredits})`);
    }

    // Premium model/voice check (SaaS only)
    if (isFeatureEnabled('premiumModels')) {
      const { aiModels, ttsVoices } = await import('../db/schema.js');
      const { and } = await import('drizzle-orm');

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

      if (selectedModel.isPremium && req.user!.plan === 'free') {
        return res.status(403).json({
          error: 'Premium model requires paid plan',
          model: selectedModel.displayName,
          upgrade: 'Upgrade to Team or Business plan',
        });
      }

      // Check TTS voice (if not auto)
      if (ttsVoice !== 'auto') {
        const [selectedVoice] = await db
          .select()
          .from(ttsVoices)
          .where(and(
            eq(ttsVoices.voiceId, ttsVoice),
            eq(ttsVoices.isActive, true)
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

    // Update status and store provider/model choices
    await db.update(reports).set({ 
      status: 'processing',
      aiProvider,
      ttsProvider,
      voice: ttsVoice,
      tone,
    }).where(eq(reports.id, reportId));

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
