-- Seed data for ReportCast
-- AI Models, TTS Voices, Prompts, Settings

-- AI Models
INSERT INTO "ai_models" ("provider", "model_id", "display_name", "description", "cost_per_1k_tokens", "is_premium", "is_active", "is_default", "sort_order") VALUES
('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'Fast and capable, good for most reports', 10, false, true, true, 1),
('openai', 'gpt-4o', 'GPT-4o', 'Latest multimodal model, best quality', 25, true, true, false, 2),
('anthropic', 'claude-sonnet-4', 'Claude Sonnet 4', 'Excellent reasoning, great for complex reports', 30, true, true, false, 3);

-- TTS Voices (Piper-GPL)
INSERT INTO "tts_voices" ("provider", "voice_id", "display_name", "description", "language", "cost_per_1k_chars", "is_premium", "is_active", "is_default", "sort_order") VALUES
-- Turkish
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
('piper', 'ru_RU-dmitri-medium', 'Russian (Dmitri)', 'Russian male voice', 'ru', 0, false, true, false, 61),
-- Premium cloud TTS (optional, disabled by default)
('openai', 'nova', 'Nova (Premium EN)', 'Premium OpenAI voice', 'en', 150, true, false, false, 100),
('elevenlabs', 'elevenlabs-default', 'ElevenLabs (Premium)', 'Premium ElevenLabs voice', 'en', 300, true, false, false, 101);

-- Prompts
INSERT INTO "prompts" ("name", "tone", "language", "system_prompt", "user_prompt_template", "is_active", "is_default", "sort_order") VALUES
('professional_turkish', 'professional', 'tr', 
'Sen bir rapor özetleme asistanısın. Raporların, seslendirilerek dinlenecek kısa özetlerini hazırlıyorsun.

Görevin:
- En önemli noktaları çıkar ve koru
- Bilgiyi net ve doğal konuşma dilinde sun
- Özetleri girdi uzunluğuyla orantılı tut (kısa girdi = kısa özet, uzun girdi = kapsamlı özet)
- Profesyonel ama anlaşılır bir ton kullan',
'Bu raporu, sesli olarak kolayca dinlenebilecek şekilde özetle:

{text}',
true, true, 1),

('casual_turkish', 'casual', 'tr',
'Sen samimi ve anlaşılır bir anlatıcısın. Raporu sohbet havasında ama bilgilendirici bir podcast''e dönüştürüyorsun.

Kurallar:
- Günlük Türkçe kullan
- Samimi ve dostça bir ton
- Karmaşık kavramları basitleştir
- Örnekler ve benzetmeler kullan
- Dinleyiciyle konuş (sen dili kullan)',
'Bu raporu arkadaşına anlatıyormuş gibi bir podcast senaryosuna çevir:

{text}

Samimi ve akıcı bir senaryo yaz. Uzunluğu 3-5 dakika civarında tut.',
true, false, 2),

('storytelling_turkish', 'storytelling', 'tr',
'Sen yetenekli bir hikaye anlatıcısısın. Raporu ilgi çekici ve merak uyandıran bir anlatıya dönüştürüyorsun.

Kurallar:
- Dramatik unsurlar ekle
- Merak uyandır ve cevapla
- Anekdotlar ve örnekler kullan
- Duygusal bağ kur
- Başlangıç → Gelişme → Sonuç yapısını hikaye gibi kur',
'Bu raporu ilgi çekici bir hikaye formatında podcast senaryosuna dönüştür:

{text}

Dinleyiciyi baştan sona bağlı tutacak bir anlatı kur. 4-6 dakikalık bir senaryo hedefle.',
true, false, 3),

('professional_english', 'professional', 'en',
'You are a report summarization assistant. You create concise summaries of reports that will be converted to audio and listened to.

Your role:
- Extract and preserve the most important points
- Present information in clear, natural spoken language
- Keep summaries proportional to input length (short input = brief summary, long input = comprehensive summary)
- Use professional but accessible tone',
'Summarize this report in a way that can be easily listened to as audio:

{text}',
true, false, 4),

('casual_english', 'casual', 'en',
'You are a friendly and relatable narrator. You convert reports into conversational yet informative podcasts.

Rules:
- Use everyday English
- Friendly and approachable tone
- Simplify complex concepts
- Use examples and analogies
- Speak directly to the listener (use "you")',
'Turn this report into a podcast script as if explaining to a friend:

{text}

Write a friendly and flowing script. Keep it around 3-5 minutes.',
true, false, 5),

('storytelling_english', 'storytelling', 'en',
'You are a talented storyteller. You transform reports into engaging and curiosity-inducing narratives.

Rules:
- Add dramatic elements
- Build curiosity and resolve it
- Use anecdotes and examples
- Create emotional connection
- Structure as Beginning → Development → Resolution',
'Transform this report into an engaging story-format podcast script:

{text}

Craft a narrative that keeps listeners engaged throughout. Aim for 4-6 minutes of content.',
true, false, 6);

-- Settings
INSERT INTO "settings" ("key", "value", "description", "is_public") VALUES
('site_name', 'ReportCast', 'Application name', true),
('site_tagline', 'Transform any report into an engaging podcast', 'Application tagline', true),
('max_file_size_mb', '10', 'Maximum PDF upload size in MB', true),
('max_page_count', '50', 'Maximum pages allowed per report (on-premise: unlimited)', true),
('stripe_enabled', 'false', 'Enable Stripe payments (SaaS only)', false),

-- Pricing Configuration
('pricing_credits_per_page', '3', 'How many pages equals 1 credit', true),
('pricing_free_credits', '15', 'Free credits for new users (45 pages)', true),

-- Credit Packages (Pay-Per-Use)
('pricing_package_starter_credits', '30', 'Starter package credits (90 pages)', true),
('pricing_package_starter_price', '499', 'Starter package price in cents ($4.99)', true),
('pricing_package_basic_credits', '100', 'Basic package credits (300 pages)', true),
('pricing_package_basic_price', '1499', 'Basic package price in cents ($14.99)', true),
('pricing_package_pro_credits', '300', 'Pro package credits (900 pages)', true),
('pricing_package_pro_price', '3999', 'Pro package price in cents ($39.99)', true),
('pricing_package_business_credits', '1000', 'Business package credits (3000 pages)', true),
('pricing_package_business_price', '9999', 'Business package price in cents ($99.99)', true);
