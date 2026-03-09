import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  createPaymentIntent, 
  handleStripeWebhook, 
  getStripePublishableKey 
} from '../services/stripe-service.js';
import { isFeatureEnabled } from '../config/deployment.js';
import { db } from '../db/index.js';
import { reports } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/payments/config
 * 
 * Get Stripe publishable key (public endpoint)
 */
router.get('/config', (req, res) => {
  const publishableKey = getStripePublishableKey();

  if (!publishableKey) {
    return res.status(200).json({
      enabled: false,
      message: 'Payments disabled in on-premise mode',
    });
  }

  res.json({
    enabled: true,
    publishableKey,
  });
});

/**
 * POST /api/payments/create-intent
 * 
 * Create payment intent for report processing
 */
router.post('/create-intent', authenticate, async (req, res) => {
  try {
    if (!isFeatureEnabled('payments')) {
      return res.status(400).json({ 
        error: 'Payments disabled in on-premise mode' 
      });
    }

    const { reportId } = req.body;
    const userId = req.user!.id;

    if (!reportId) {
      return res.status(400).json({ error: 'Missing reportId' });
    }

    // Get report
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (report.priceCents === 0) {
      return res.status(400).json({ 
        error: 'This report is free, no payment required' 
      });
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      userId,
      reportId,
      amountCents: report.priceCents,
      type: 'report',
      metadata: {
        filename: report.filename,
        tier: report.tier,
        pageCount: String(report.pageCount),
      },
    });

    res.json({
      clientSecret,
      paymentIntentId,
      amount: report.priceCents,
      currency: 'usd',
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/payments/webhook
 * 
 * Stripe webhook endpoint (raw body required)
 */
router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      // req.body should be raw Buffer (configured in index.ts)
      const body = req.body;

      await handleStripeWebhook(body, signature);

      res.json({ received: true });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ 
        error: 'Webhook processing failed',
        message: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/payments/buy-credits
 * 
 * Purchase credit package
 */
router.post('/buy-credits', authenticate, async (req, res) => {
  try {
    if (!isFeatureEnabled('payments')) {
      return res.status(400).json({ 
        error: 'Payments disabled in on-premise mode' 
      });
    }

    const { packageId } = req.body;
    const userId = req.user!.id;

    if (!packageId) {
      return res.status(400).json({ error: 'Package ID required' });
    }

    // Get pricing config
    const { getPricingConfig } = await import('../services/pricing-service.js');
    const pricing = await getPricingConfig();

    // Find package
    const pkg = pricing.packages.find(p => p.id === packageId);

    if (!pkg) {
      return res.status(400).json({ 
        error: 'Invalid package',
        availablePackages: pricing.packages.map(p => p.id),
      });
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } = await createPaymentIntent({
      userId,
      amountCents: pkg.priceCents,
      type: 'credits',
      creditsAdded: pkg.credits,
      metadata: {
        packageId: pkg.id,
        packageName: pkg.name,
        credits: String(pkg.credits),
        pages: String(pkg.pages),
      },
    });

    res.json({
      clientSecret,
      paymentIntentId,
      package: {
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        pages: pkg.pages,
        price: pkg.priceCents / 100,
        priceCents: pkg.priceCents,
        priceFormatted: pkg.priceFormatted,
      },
      currency: 'usd',
    });

  } catch (error) {
    console.error('Buy credits error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      message: (error as Error).message,
    });
  }
});

export default router;
