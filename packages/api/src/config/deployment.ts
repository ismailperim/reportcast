export type DeploymentMode = 'on-premise' | 'saas';

export interface DeploymentConfig {
  mode: DeploymentMode;
  features: {
    pricing: boolean;           // Pricing tiers (SaaS only)
    payments: boolean;          // Stripe integration (SaaS only)
    credits: boolean;           // Credit system (SaaS only)
    userLimits: boolean;        // User/report limits (SaaS only)
    analytics: boolean;         // Usage analytics (SaaS only)
    premiumModels: boolean;     // Paid AI/TTS models (SaaS only)
  };
}

/**
 * Get deployment configuration
 */
export function getDeploymentConfig(): DeploymentConfig {
  const mode = (process.env.DEPLOYMENT_MODE || 'on-premise') as DeploymentMode;

  // On-premise: All features free, no limits
  if (mode === 'on-premise') {
    return {
      mode: 'on-premise',
      features: {
        pricing: false,
        payments: false,
        credits: false,
        userLimits: false,
        analytics: false,
        premiumModels: false, // All models available
      },
    };
  }

  // SaaS: Pricing, payments, limits enabled
  return {
    mode: 'saas',
    features: {
      pricing: true,
      payments: true,
      credits: true,
      userLimits: true,
      analytics: true,
      premiumModels: true,
    },
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof DeploymentConfig['features']): boolean {
  const config = getDeploymentConfig();
  return config.features[feature];
}

/**
 * Check if deployment is SaaS
 */
export function isSaaS(): boolean {
  return getDeploymentConfig().mode === 'saas';
}

/**
 * Check if deployment is on-premise
 */
export function isOnPremise(): boolean {
  return getDeploymentConfig().mode === 'on-premise';
}
