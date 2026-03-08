import Stripe from 'stripe';
import { db } from '../db/index.js';
import { users, payments, reports } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getDeploymentConfig, isFeatureEnabled } from '../config/deployment.js';

// Initialize Stripe (only if enabled)
let stripe: Stripe | null = null;

if (isFeatureEnabled('payments') && process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia' as any,
  });
  console.log('✅ Stripe initialized');
} else {
  console.log('⏭️  Stripe disabled (on-premise mode or no API key)');
}

export interface CreatePaymentIntentOptions {
  userId: string;
  reportId?: string;
  amountCents: number;
  currency?: string;
  type: 'report' | 'credits' | 'subscription';
  creditsAdded?: number;
  metadata?: Record<string, string>;
}

/**
 * Create Stripe Payment Intent
 */
export async function createPaymentIntent(
  options: CreatePaymentIntentOptions
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  if (!stripe) {
    throw new Error('Stripe not initialized. Check STRIPE_SECRET_KEY env var.');
  }

  const { userId, reportId, amountCents, currency = 'usd', type, creditsAdded, metadata = {} } = options;

  // Get or create Stripe customer
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });

    customerId = customer.id;

    // Update user with Stripe customer ID
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  }

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customerId,
    metadata: {
      userId,
      type,
      ...(reportId && { reportId }),
      ...(creditsAdded && { creditsAdded: String(creditsAdded) }),
      ...metadata,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Create payment record
  await db.insert(payments).values({
    userId,
    reportId: reportId || null,
    stripePaymentIntentId: paymentIntent.id,
    amountCents,
    currency,
    status: 'pending',
    type,
    creditsAdded: creditsAdded || null,
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  body: Buffer,
  signature: string
): Promise<{ received: boolean }> {
  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err);
    throw new Error('Webhook signature verification failed');
  }

  console.log(`📥 Webhook received: ${event.type}`);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // TODO: Handle subscription events
      console.log(`📌 Subscription event: ${event.type}`);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id;

  console.log(`✅ Payment succeeded: ${paymentIntentId}`);

  // Update payment record
  const [payment] = await db
    .update(payments)
    .set({ status: 'succeeded' })
    .where(eq(payments.stripePaymentIntentId, paymentIntentId))
    .returning();

  if (!payment) {
    console.error(`⚠️  Payment record not found for intent: ${paymentIntentId}`);
    return;
  }

  // Handle based on payment type
  switch (payment.type) {
    case 'report':
      // Report payment: update report status to allow processing
      if (payment.reportId) {
        await db
          .update(reports)
          .set({ status: 'pending' })
          .where(eq(reports.id, payment.reportId));

        console.log(`✅ Report ${payment.reportId} payment confirmed`);
      }
      break;

    case 'credits':
      // Credits purchase: add credits to user
      if (payment.creditsAdded) {
        await db.execute(`
          UPDATE users 
          SET credits_remaining = credits_remaining + ${payment.creditsAdded}
          WHERE id = '${payment.userId}'
        `);

        console.log(`✅ Added ${payment.creditsAdded} credits to user ${payment.userId}`);
      }
      break;

    case 'subscription':
      // Subscription payment: update user plan
      // TODO: Implement subscription logic
      console.log(`📌 Subscription payment for user ${payment.userId}`);
      break;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const paymentIntentId = paymentIntent.id;

  console.log(`❌ Payment failed: ${paymentIntentId}`);

  // Update payment record
  await db
    .update(payments)
    .set({ status: 'failed' })
    .where(eq(payments.stripePaymentIntentId, paymentIntentId));
}

/**
 * Get publishable key (safe to expose to frontend)
 */
export function getStripePublishableKey(): string | null {
  if (!isFeatureEnabled('payments')) {
    return null;
  }

  return process.env.STRIPE_PUBLISHABLE_KEY || null;
}
