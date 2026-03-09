import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface PricingConfig {
  creditsPerPage: number;
  freeCredits: number;
  packages: {
    id: string;
    name: string;
    credits: number;
    priceCents: number;
    pages: number;
    priceFormatted: string;
  }[];
}

let cachedPricing: PricingConfig | null = null;

/**
 * Get pricing configuration from database
 * Cached for performance
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  if (cachedPricing) {
    return cachedPricing;
  }

  try {
    // Fetch all pricing settings
    const pricingSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'pricing_credits_per_page'));

    // Helper to get setting value
    const getSetting = async (key: string): Promise<string> => {
      const [setting] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      
      return setting?.value || '0';
    };

    const creditsPerPage = parseInt(await getSetting('pricing_credits_per_page'));
    const freeCredits = parseInt(await getSetting('pricing_free_credits'));

    // Build packages
    const packages = [
      {
        id: 'starter',
        name: 'Starter',
        credits: parseInt(await getSetting('pricing_package_starter_credits')),
        priceCents: parseInt(await getSetting('pricing_package_starter_price')),
      },
      {
        id: 'basic',
        name: 'Basic',
        credits: parseInt(await getSetting('pricing_package_basic_credits')),
        priceCents: parseInt(await getSetting('pricing_package_basic_price')),
      },
      {
        id: 'pro',
        name: 'Pro',
        credits: parseInt(await getSetting('pricing_package_pro_credits')),
        priceCents: parseInt(await getSetting('pricing_package_pro_price')),
      },
      {
        id: 'business',
        name: 'Business',
        credits: parseInt(await getSetting('pricing_package_business_credits')),
        priceCents: parseInt(await getSetting('pricing_package_business_price')),
      },
    ];

    cachedPricing = {
      creditsPerPage,
      freeCredits,
      packages: packages.map(pkg => ({
        ...pkg,
        pages: pkg.credits * creditsPerPage,
        priceFormatted: `$${(pkg.priceCents / 100).toFixed(2)}`,
      })),
    };

    return cachedPricing;
  } catch (error) {
    console.error('Failed to load pricing config:', error);
    
    // Fallback to default values
    return {
      creditsPerPage: 3,
      freeCredits: 15,
      packages: [
        { id: 'starter', name: 'Starter', credits: 30, priceCents: 499, pages: 90, priceFormatted: '$4.99' },
        { id: 'basic', name: 'Basic', credits: 100, priceCents: 1499, pages: 300, priceFormatted: '$14.99' },
        { id: 'pro', name: 'Pro', credits: 300, priceCents: 3999, pages: 900, priceFormatted: '$39.99' },
        { id: 'business', name: 'Business', credits: 1000, priceCents: 9999, pages: 3000, priceFormatted: '$99.99' },
      ],
    };
  }
}

/**
 * Calculate required credits for a page count
 */
export function calculateRequiredCredits(pageCount: number, creditsPerPage: number): number {
  return Math.ceil(pageCount / creditsPerPage);
}

/**
 * Clear pricing cache (call after settings update)
 */
export function clearPricingCache(): void {
  cachedPricing = null;
}
