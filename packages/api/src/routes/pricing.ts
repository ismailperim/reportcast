import { Router } from 'express';
import { isFeatureEnabled } from '../config/deployment.js';

const router = Router();

/**
 * GET /api/pricing
 * 
 * Get pricing information (public endpoint)
 * Returns empty in on-premise mode
 */
router.get('/', (req, res) => {
  if (!isFeatureEnabled('pricing')) {
    return res.json({
      mode: 'on-premise',
      message: 'All features are free in on-premise mode',
      plans: [],
      tiers: {},
    });
  }

  // SaaS mode: Return pricing tiers
  res.json({
    mode: 'saas',
    currency: 'USD',
    tiers: {
      short: {
        name: 'Short Report',
        pages: '1-5',
        price: 0.99,
        priceCents: 99,
        description: 'Perfect for quick summaries and brief documents',
      },
      medium: {
        name: 'Medium Report',
        pages: '6-15',
        price: 2.99,
        priceCents: 299,
        description: 'Ideal for standard reports and articles',
      },
      long: {
        name: 'Long Report',
        pages: '16-50',
        price: 4.99,
        priceCents: 499,
        description: 'Best for comprehensive documents and whitepapers',
      },
      enterprise: {
        name: 'Enterprise',
        pages: '51+',
        price: null,
        priceCents: null,
        description: 'Custom pricing for large documents',
        contactEmail: 'sales@reportcast.com',
      },
    },
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        credits: 5,
        features: [
          '5 free reports',
          'Basic AI models (GPT-4 Turbo)',
          'Free TTS voices (Piper)',
          'Community support',
        ],
      },
      {
        id: 'team',
        name: 'Team',
        price: 29,
        priceAnnual: 290,
        credits: 50,
        features: [
          '50 reports/month',
          'Premium AI models (Claude, GPT-4o)',
          'Premium TTS voices (OpenAI, ElevenLabs)',
          'Priority support',
          'API access',
        ],
      },
      {
        id: 'business',
        name: 'Business',
        price: 99,
        priceAnnual: 990,
        credits: 200,
        features: [
          '200 reports/month',
          'All AI models',
          'All TTS voices',
          'Dedicated support',
          'Custom branding',
          'SSO integration',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        credits: null,
        features: [
          'Unlimited reports',
          'On-premise deployment option',
          'Custom AI models',
          'White-label solution',
          'SLA guarantee',
          'Dedicated account manager',
        ],
        contactEmail: 'sales@reportcast.com',
      },
    ],
    creditPricing: {
      price: 0.99,
      priceCents: 99,
      description: 'Additional credits can be purchased at $0.99 per report',
    },
  });
});

/**
 * GET /api/pricing/calculate
 * 
 * Calculate price for a given page count
 */
router.get('/calculate', (req, res) => {
  if (!isFeatureEnabled('pricing')) {
    return res.json({
      tier: 'free',
      price: 0,
      priceCents: 0,
      message: 'Free in on-premise mode',
    });
  }

  const pageCount = parseInt(req.query.pages as string);

  if (!pageCount || pageCount < 1) {
    return res.status(400).json({ error: 'Invalid page count' });
  }

  let tier: string;
  let priceCents: number;

  if (pageCount <= 5) {
    tier = 'short';
    priceCents = 99;
  } else if (pageCount <= 15) {
    tier = 'medium';
    priceCents = 299;
  } else if (pageCount <= 50) {
    tier = 'long';
    priceCents = 499;
  } else {
    tier = 'enterprise';
    priceCents = 0;
  }

  res.json({
    tier,
    pageCount,
    price: priceCents / 100,
    priceCents,
    currency: 'USD',
  });
});

export default router;
