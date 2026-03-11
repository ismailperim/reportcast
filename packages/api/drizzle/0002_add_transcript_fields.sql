-- Migration: Add transcript tracking fields
-- Created: 2025-03-10

-- Add extracted text from PDF
ALTER TABLE reports 
ADD COLUMN extracted_text TEXT;

-- Add AI-generated script/transcript
ALTER TABLE reports 
ADD COLUMN generated_script TEXT;

-- Add comment for documentation
COMMENT ON COLUMN reports.extracted_text IS 'Raw text extracted from uploaded PDF';
COMMENT ON COLUMN reports.generated_script IS 'AI-generated podcast script/transcript';
