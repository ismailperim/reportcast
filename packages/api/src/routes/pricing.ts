import { Router } from 'express';
import { isFeatureEnabled } from '../config/deployment.js';
import { getPricingConfig, calculateRequiredCredits } from '../services/pricing-service.js';

const router = Router();

/**
 * GET /api/pricing
 * 
 * Get pricing information (public endpoint)
 * Returns empty in on-premise mode
 */
router.get('/', async (req, res) => {
  if (!isFeatureEnabled('pricing')) {
    return res.json({
      mode: 'on-premise',
      message: 'All features are free in on-premise mode',
      packages: [],
      model: 'unlimited',
    });
  }

  try {
    const pricing = await getPricingConfig();

    // SaaS mode: Return credit-based pricing (MVP - Pay-per-use only)
    res.json({
      mode: 'saas',
      model: 'pay-per-use',
      currency: 'USD',
      
      // Credit system
      creditsPerPage: pricing.creditsPerPage,
      freeCredits: pricing.freeCredits,
      
      // Credit packages
      packages: pricing.packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        pages: pkg.pages,
        price: pkg.priceCents / 100,
        priceCents: pkg.priceCents,
        priceFormatted: pkg.priceFormatted,
        pricePerCredit: (pkg.priceCents / pkg.credits / 100).toFixed(3),
        description: `${pkg.pages} pages worth of processing`,
        bestValue: pkg.id === 'pro', // Highlight best value
      })),

      // Future: Subscription plans will be added here
      // plans: []  
    });
  } catch (error) {
    console.error('Pricing endpoint error:', error);
    res.status(500).json({ error: 'Failed to load pricing' });
  }
});

/**
 * GET /api/pricing/calculate
 * 
 * Calculate required credits and recommended package for a page count
 */
router.get('/calculate', async (req, res) => {
  if (!isFeatureEnabled('pricing')) {
    return res.json({
      credits: 0,
      message: 'Free in on-premise mode',
    });
  }

  const pageCount = parseInt(req.query.pages as string);

  if (!pageCount || pageCount < 1) {
    return res.status(400).json({ error: 'Invalid page count' });
  }

  try {
    const pricing = await getPricingConfig();
    const requiredCredits = calculateRequiredCredits(pageCount, pricing.creditsPerPage);

    // Find recommended package (smallest package that covers the credits)
    const recommendedPackage = pricing.packages.find(pkg => pkg.credits >= requiredCredits) 
      || pricing.packages[pricing.packages.length - 1]; // Default to largest if exceeds all

    res.json({
      pageCount,
      creditsRequired: requiredCredits,
      creditsPerPage: pricing.creditsPerPage,
      recommendedPackage: {
        id: recommendedPackage.id,
        name: recommendedPackage.name,
        credits: recommendedPackage.credits,
        price: recommendedPackage.priceCents / 100,
        priceCents: recommendedPackage.priceCents,
        priceFormatted: recommendedPackage.priceFormatted,
      },
      allPackages: pricing.packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        price: pkg.priceCents / 100,
        priceCents: pkg.priceCents,
        canProcess: pkg.credits >= requiredCredits,
      })),
    });
  } catch (error) {
    console.error('Calculate pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

export default router;
