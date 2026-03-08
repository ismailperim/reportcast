-- Seed data for ReportCast
-- AI Models, TTS Voices, Prompts, Settings

-- AI Models
INSERT INTO "ai_models" ("provider", "model_id", "display_name", "description", "cost_per_1k_tokens", "is_premium", "is_active", "is_default", "sort_order") VALUES
('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'Fast and capable, good for most reports', 10, false, true, true, 1),
('openai', 'gpt-4o', 'GPT-4o', 'Latest multimodal model, best quality', 25, true, true, false, 2),
('anthropic', 'claude-sonnet-4', 'Claude Sonnet 4', 'Excellent reasoning, great for complex reports', 30, true, true, false, 3);

-- TTS Voices
INSERT INTO "tts_voices" ("provider", "voice_id", "display_name", "description", "language", "cost_per_1k_chars", "is_premium", "is_active", "is_default", "sort_order") VALUES
('openedai', 'turkish', 'Turkish (Piper)', 'Free Turkish voice via Piper TTS', 'tr', 0, false, true, true, 1),
('openai', 'nova', 'Nova (English)', 'Energetic and engaging female voice', 'en', 150, true, true, false, 2),
('openai', 'alloy', 'Alloy (English)', 'Neutral and balanced voice', 'en', 150, true, true, false, 3),
('openai', 'echo', 'Echo (English)', 'Male voice, clear and professional', 'en', 150, true, true, false, 4),
('openai', 'fable', 'Fable (English)', 'Warm and storytelling voice', 'en', 150, true, true, false, 5),
('openai', 'onyx', 'Onyx (English)', 'Deep male voice, authoritative', 'en', 150, true, true, false, 6),
('openai', 'shimmer', 'Shimmer (English)', 'Soft and gentle female voice', 'en', 150, true, true, false, 7),
('elevenlabs', 'elevenlabs-default', 'ElevenLabs (Custom)', 'High-quality custom voices (requires ElevenLabs API key)', 'en', 300, true, false, false, 8);

-- Prompts
INSERT INTO "prompts" ("name", "tone", "language", "system_prompt", "user_prompt_template", "is_active", "is_default", "sort_order") VALUES
('professional_turkish', 'professional', 'tr', 
'Sen deneyimli bir teknik yazarsın. Rapor içeriğini profesyonel ve anlaşılır bir podcast senaryosuna dönüştürüyorsun.

Kurallar:
- Türkçe kullan
- Profesyonel ve net bir dil kullan
- Teknik terimleri açıkla
- Özet → Detay → Sonuç yapısını kullan
- Dinleyiciyle doğrudan konuş (sen/siz yerine "bu rapor", "bulgular" vb.)',
'Aşağıdaki raporu bir podcast senaryosuna dönüştür:

{text}

Senaryoyu doğrudan konuşma metni olarak yaz (giriş/kapanış müziği notları ekleme). Yaklaşık 3-5 dakikalık bir senaryo hedefle.',
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
'You are an experienced technical writer. You convert report content into professional and clear podcast scripts.

Rules:
- Use professional and clear language
- Explain technical terms
- Use Summary → Detail → Conclusion structure
- Speak directly to the listener
- Maintain authoritative but accessible tone',
'Convert the following report into a podcast script:

{text}

Write the script as direct speech (no intro/outro music notes). Aim for approximately 3-5 minutes of content.',
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
('free_tier_credits', '5', 'Number of free credits for new users (SaaS only)', false),
('stripe_enabled', 'false', 'Enable Stripe payments (SaaS only)', false);
