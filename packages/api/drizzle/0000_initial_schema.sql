-- Initial ReportCast schema
-- Version: 0.2.0

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text UNIQUE NOT NULL,
	"name" text,
	"password_hash" text,
	"provider" text DEFAULT 'email',
	"stripe_customer_id" text,
	"plan" text DEFAULT 'free',
	"credits_remaining" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"page_count" integer NOT NULL,
	"tier" text NOT NULL,
	"price_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ai_provider" text,
	"tts_provider" text,
	"voice" text,
	"tone" text,
	"ai_cost_cents" integer,
	"tts_cost_cents" integer,
	"processing_time_ms" integer,
	"s3_key" text,
	"audio_url" text,
	"audio_size" integer,
	"audio_duration_seconds" integer,
	"share_token" text UNIQUE,
	"is_public" boolean DEFAULT false,
	"listen_count" integer DEFAULT 0,
	"last_listened_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);

-- Listens table (analytics)
CREATE TABLE IF NOT EXISTS "listens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL REFERENCES "reports"("id"),
	"user_id" uuid REFERENCES "users"("id"),
	"ip_address" text,
	"user_agent" text,
	"referer" text,
	"country" text,
	"city" text,
	"listened_at" timestamp DEFAULT now() NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"report_id" uuid REFERENCES "reports"("id"),
	"stripe_payment_intent_id" text UNIQUE,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"type" text NOT NULL,
	"credits_added" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- API Keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id"),
	"key" text UNIQUE NOT NULL,
	"name" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- AI Models table (admin-configurable)
CREATE TABLE IF NOT EXISTS "ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"cost_per_1k_tokens" integer,
	"is_premium" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- TTS Voices table (admin-configurable)
CREATE TABLE IF NOT EXISTS "tts_voices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"voice_id" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"language" text,
	"cost_per_1k_chars" integer,
	"is_premium" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Settings table (global configuration)
CREATE TABLE IF NOT EXISTS "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text UNIQUE NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid REFERENCES "users"("id")
);

-- Prompts table (AI script templates)
CREATE TABLE IF NOT EXISTS "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tone" text NOT NULL,
	"language" text,
	"system_prompt" text NOT NULL,
	"user_prompt_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid REFERENCES "users"("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_reports_user_id" ON "reports"("user_id");
CREATE INDEX IF NOT EXISTS "idx_reports_share_token" ON "reports"("share_token");
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "idx_listens_report_id" ON "listens"("report_id");
CREATE INDEX IF NOT EXISTS "idx_listens_user_id" ON "listens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_payments_user_id" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_models_is_active" ON "ai_models"("is_active");
CREATE INDEX IF NOT EXISTS "idx_tts_voices_is_active" ON "tts_voices"("is_active");
