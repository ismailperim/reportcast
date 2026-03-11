-- Migration: Switch to Piper-GPL voices
-- Created: 2026-03-11
-- Remove old TTS voices and add Piper-GPL voices

-- Delete all existing voices
DELETE FROM tts_voices;

-- Insert Piper-GPL voices
-- Turkish
INSERT INTO "tts_voices" ("provider", "voice_id", "display_name", "description", "language", "cost_per_1k_chars", "is_premium", "is_active", "is_default", "sort_order") VALUES
('piper', 'tr_TR-dfki-medium', 'Turkish (DFKI)', 'Turkish voice - medium quality', 'tr', 0, false, true, true, 1),
('piper', 'tr_TR-fettah-medium', 'Turkish (Fettah)', 'Turkish voice - medium quality', 'tr', 0, false, true, false, 2),

-- English (US)
('piper', 'en_US-lessac-medium', 'English US (Lessac)', 'Clear American voice - medium quality', 'en', 0, false, true, true, 10),
('piper', 'en_US-lessac-high', 'English US (Lessac HD)', 'Clear American voice - high quality', 'en', 0, false, true, false, 11),
('piper', 'en_US-amy-medium', 'English US (Amy)', 'Female American voice', 'en', 0, false, true, false, 12),
('piper', 'en_US-ryan-high', 'English US (Ryan)', 'Male American voice - high quality', 'en', 0, false, true, false, 13),
('piper', 'en_US-libritts-high', 'English US (LibriTTS)', 'Neural American voice - high quality', 'en', 0, false, true, false, 14),

-- English (GB)
('piper', 'en_GB-alan-medium', 'English UK (Alan)', 'British male voice', 'en', 0, false, true, false, 20),
('piper', 'en_GB-alba-medium', 'English UK (Alba)', 'British female voice', 'en', 0, false, true, false, 21),
('piper', 'en_GB-southern_english_female-medium', 'English UK (Southern)', 'Southern British female voice', 'en', 0, false, true, false, 22),

-- German
('piper', 'de_DE-thorsten-medium', 'German (Thorsten)', 'German male voice - medium quality', 'de', 0, false, true, true, 30),
('piper', 'de_DE-karlsson-low', 'German (Karlsson)', 'German voice - low quality (fast)', 'de', 0, false, true, false, 31),

-- French
('piper', 'fr_FR-upmc-medium', 'French (UPMC)', 'French voice - medium quality', 'fr', 0, false, true, true, 40),
('piper', 'fr_FR-siwis-medium', 'French (Siwis)', 'French female voice - medium quality', 'fr', 0, false, true, false, 41),

-- Spanish (Spain)
('piper', 'es_ES-sharvard-medium', 'Spanish (Sharvard)', 'Spanish voice - medium quality', 'es', 0, false, true, true, 50),
('piper', 'es_ES-carlfm-x_low', 'Spanish (Carlfm)', 'Spanish voice - extra low quality (fast)', 'es', 0, false, true, false, 51),

-- Spanish (Mexico)
('piper', 'es_MX-ald-medium', 'Spanish MX (Ald)', 'Mexican Spanish voice', 'es', 0, false, true, false, 52),

-- Russian
('piper', 'ru_RU-ruslan-medium', 'Russian (Ruslan)', 'Russian male voice', 'ru', 0, false, true, true, 60),
('piper', 'ru_RU-dmitri-medium', 'Russian (Dmitri)', 'Russian male voice', 'ru', 0, false, true, false, 61);

-- Update default TTS provider to piper
UPDATE settings SET value = 'piper' WHERE key = 'default_tts_provider';
