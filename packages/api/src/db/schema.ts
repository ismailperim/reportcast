import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name'),
  passwordHash: text('password_hash'), // null for OAuth users
  provider: text('provider').default('email'), // email, google, github
  stripeCustomerId: text('stripe_customer_id'),
  plan: text('plan').default('free'), // free, team, business, enterprise
  creditsRemaining: integer('credits_remaining').default(15), // Free tier: 15 credits (45 pages)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Reports table
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  filename: text('filename').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  pageCount: integer('page_count').notNull(),
  tier: text('tier').notNull(), // short, medium, long, enterprise
  priceCents: integer('price_cents').notNull(), // 99, 299, 499, custom
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  aiProvider: text('ai_provider'), // openai, anthropic
  ttsProvider: text('tts_provider'), // openedai, openai, elevenlabs
  voice: text('voice'), // turkish, alloy, nova, etc.
  tone: text('tone'), // professional, casual, storytelling
  aiCostCents: integer('ai_cost_cents'), // actual AI cost
  ttsCostCents: integer('tts_cost_cents'), // actual TTS cost
  processingTimeMs: integer('processing_time_ms'),
  s3Key: text('s3_key'), // S3 object key
  audioUrl: text('audio_url'), // Public/presigned URL
  audioSize: integer('audio_size'), // bytes
  audioDurationSeconds: integer('audio_duration_seconds'),
  shareToken: text('share_token').unique(), // For anonymous sharing
  isPublic: boolean('is_public').default(false), // Public share enabled
  listenCount: integer('listen_count').default(0), // Total listens
  lastListenedAt: timestamp('last_listened_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Listen events (track individual plays)
export const listens = pgTable('listens', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => reports.id),
  userId: uuid('user_id').references(() => users.id), // null for anonymous
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  country: text('country'),
  city: text('city'),
  listenedAt: timestamp('listened_at').defaultNow().notNull(),
});

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  reportId: uuid('report_id').references(() => reports.id), // null for credit purchases
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').default('usd').notNull(),
  status: text('status').notNull(), // succeeded, pending, failed
  type: text('type').notNull(), // report, credits, subscription
  creditsAdded: integer('credits_added'), // for credit purchases
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// API Keys table (for programmatic access)
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  key: text('key').unique().notNull(), // hashed
  name: text('name').notNull(), // "Production API", "Staging", etc.
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI Models (configurable by admin)
export const aiModels = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(), // openai, anthropic
  modelId: text('model_id').notNull(), // gpt-4-turbo, claude-sonnet-4
  displayName: text('display_name').notNull(),
  description: text('description'),
  costPer1kTokens: integer('cost_per_1k_tokens'), // cents
  isPremium: boolean('is_premium').default(false), // Requires payment in SaaS mode
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TTS Voices (configurable by admin)
export const ttsVoices = pgTable('tts_voices', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(), // openedai, openai, elevenlabs
  voiceId: text('voice_id').notNull(), // turkish, nova, etc.
  displayName: text('display_name').notNull(),
  description: text('description'),
  language: text('language'), // tr, en, etc.
  costPer1kChars: integer('cost_per_1k_chars'), // cents (0 for openedai)
  isPremium: boolean('is_premium').default(false),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// System Settings (global configuration)
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false), // Exposed to frontend
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// Prompts (AI script generation templates)
export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // "professional_turkish", "casual_english", etc.
  tone: text('tone').notNull(), // professional, casual, storytelling
  language: text('language'), // null = language-agnostic, "tr", "en", etc.
  systemPrompt: text('system_prompt').notNull(), // System message
  userPromptTemplate: text('user_prompt_template').notNull(), // User message with {text} placeholder
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reports: many(reports),
  payments: many(payments),
  apiKeys: many(apiKeys),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  listens: many(listens),
}));

export const listensRelations = relations(listens, ({ one }) => ({
  report: one(reports, {
    fields: [listens.reportId],
    references: [reports.id],
  }),
  user: one(users, {
    fields: [listens.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  report: one(reports, {
    fields: [payments.reportId],
    references: [reports.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));
