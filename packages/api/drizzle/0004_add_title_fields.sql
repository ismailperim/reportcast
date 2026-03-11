-- Migration: Add title and original_filename fields
-- Created: 2026-03-11
-- Purpose: Better UX - show meaningful titles instead of hash filenames

-- Add original_filename (user's uploaded filename)
ALTER TABLE reports ADD COLUMN original_filename TEXT;

-- Add title (AI-generated from content)
ALTER TABLE reports ADD COLUMN title TEXT;

-- Update existing records: set original_filename from filename (best effort)
UPDATE reports SET original_filename = filename WHERE original_filename IS NULL;

-- Note: Existing reports won't have AI-generated titles (title will be NULL)
-- Frontend should fallback to original_filename when title is NULL
