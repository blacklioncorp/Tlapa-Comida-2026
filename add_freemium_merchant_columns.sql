-- Add Freemium config columns to Merchants table
ALTER TABLE merchants
ADD COLUMN IF NOT EXISTS "customizationAttempts" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isPremium" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "brandData" jsonb;
