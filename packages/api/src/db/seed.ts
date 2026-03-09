import 'dotenv/config';
import { db } from './index.js';
import { aiModels, ttsVoices, prompts, settings } from './schema.js';
import { sql } from 'drizzle-orm';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');
  
  // Check if already seeded
  const existingModels = await db.select().from(aiModels).limit(1);
  if (existingModels.length > 0) {
    console.log('⏭️  Database already seeded, skipping...');
    return;
  }

  // AI Models
  console.log('📝 Seeding AI models...');
  await db.insert(aiModels).values([
    {
      provider: 'openai',
      modelId: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      description: 'Fast and capable, good for most reports',
      costPer1kTokens: 10, // $0.01 per 1k tokens (in cents)
      isPremium: false,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
    },
    {
      provider: 'openai',
      modelId: 'gpt-4o',
      displayName: 'GPT-4o',
      description: 'Latest multimodal model, best quality',
      costPer1kTokens: 25, // $0.025 per 1k tokens
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    },
    {
      provider: 'anthropic',
      modelId: 'claude-sonnet-4',
      displayName: 'Claude Sonnet 4',
      description: 'Excellent reasoning, great for complex reports',
      costPer1kTokens: 30, // $0.03 per 1k tokens
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 3,
    },
  ]);

  // TTS Voices
  console.log('🔊 Seeding TTS voices...');
  await db.insert(ttsVoices).values([
    // OpenedAI (Free, self-hosted)
    {
      provider: 'openedai',
      voiceId: 'turkish',
      displayName: 'Turkish (Piper)',
      description: 'Free Turkish voice via Piper TTS',
      language: 'tr',
      costPer1kChars: 0,
      isPremium: false,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
    },
    // OpenAI TTS
    {
      provider: 'openai',
      voiceId: 'nova',
      displayName: 'Nova (English)',
      description: 'Energetic and engaging female voice',
      language: 'en',
      costPer1kChars: 150, // $1.50 per 1M chars = $0.0015 per 1k chars = 0.15 cents
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    },
    {
      provider: 'openai',
      voiceId: 'alloy',
      displayName: 'Alloy (English)',
      description: 'Neutral and balanced voice',
      language: 'en',
      costPer1kChars: 150,
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 3,
    },
    {
      provider: 'openai',
      voiceId: 'echo',
      displayName: 'Echo (English)',
      description: 'Male voice, clear and professional',
      language: 'en',
      costPer1kChars: 150,
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 4,
    },
    {
      provider: 'openai',
      voiceId: 'fable',
      displayName: 'Fable (English)',
      description: 'Warm and storytelling voice',
      language: 'en',
      costPer1kChars: 150,
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 5,
    },
    {
      provider: 'openai',
      voiceId: 'onyx',
      displayName: 'Onyx (English)',
      description: 'Deep male voice, authoritative',
      language: 'en',
      costPer1kChars: 150,
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 6,
    },
    {
      provider: 'openai',
      voiceId: 'shimmer',
      displayName: 'Shimmer (English)',
      description: 'Soft and gentle female voice',
      language: 'en',
      costPer1kChars: 150,
      isPremium: true,
      isActive: true,
      isDefault: false,
      sortOrder: 7,
    },
    // ElevenLabs (placeholder - requires API key)
    {
      provider: 'elevenlabs',
      voiceId: 'elevenlabs-default',
      displayName: 'ElevenLabs (Custom)',
      description: 'High-quality custom voices (requires ElevenLabs API key)',
      language: 'en',
      costPer1kChars: 300, // Estimated $3 per 1M chars
      isPremium: true,
      isActive: false, // Disabled by default, admin enables after API key setup
      isDefault: false,
      sortOrder: 8,
    },
  ]);

  // Prompts
  console.log('💬 Seeding prompts...');
  await db.insert(prompts).values([
    // Professional Turkish
    {
      name: 'professional_turkish',
      tone: 'professional',
      language: 'tr',
      systemPrompt: `Sen deneyimli bir teknik yazarsın. Rapor içeriğini profesyonel ve anlaşılır bir podcast senaryosuna dönüştürüyorsun.

Kurallar:
- Türkçe kullan
- Profesyonel ve net bir dil kullan
- Teknik terimleri açıkla
- Özet → Detay → Sonuç yapısını kullan
- Dinleyiciyle doğrudan konuş (sen/siz yerine "bu rapor", "bulgular" vb.)`,
      userPromptTemplate: `Aşağıdaki raporu bir podcast senaryosuna dönüştür:

{text}

Senaryoyu doğrudan konuşma metni olarak yaz (giriş/kapanış müziği notları ekleme). Yaklaşık 3-5 dakikalık bir senaryo hedefle.`,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
    },
    // Casual Turkish
    {
      name: 'casual_turkish',
      tone: 'casual',
      language: 'tr',
      systemPrompt: `Sen samimi ve anlaşılır bir anlatıcısın. Raporu sohbet havasında ama bilgilendirici bir podcast'e dönüştürüyorsun.

Kurallar:
- Günlük Türkçe kullan
- Samimi ve dostça bir ton
- Karmaşık kavramları basitleştir
- Örnekler ve benzetmeler kullan
- Dinleyiciyle konuş (sen dili kullan)`,
      userPromptTemplate: `Bu raporu arkadaşına anlatıyormuş gibi bir podcast senaryosuna çevir:

{text}

Samimi ve akıcı bir senaryo yaz. Uzunluğu 3-5 dakika civarında tut.`,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    },
    // Storytelling Turkish
    {
      name: 'storytelling_turkish',
      tone: 'storytelling',
      language: 'tr',
      systemPrompt: `Sen yetenekli bir hikaye anlatıcısısın. Raporu ilgi çekici ve merak uyandıran bir anlatıya dönüştürüyorsun.

Kurallar:
- Dramatik unsurlar ekle
- Merak uyandır ve cevapla
- Anekdotlar ve örnekler kullan
- Duygusal bağ kur
- Başlangıç → Gelişme → Sonuç yapısını hikaye gibi kur`,
      userPromptTemplate: `Bu raporu ilgi çekici bir hikaye formatında podcast senaryosuna dönüştür:

{text}

Dinleyiciyi baştan sona bağlı tutacak bir anlatı kur. 4-6 dakikalık bir senaryo hedefle.`,
      isActive: true,
      isDefault: false,
      sortOrder: 3,
    },
    // Professional English
    {
      name: 'professional_english',
      tone: 'professional',
      language: 'en',
      systemPrompt: `You are an experienced technical writer. You convert report content into professional and clear podcast scripts.

Rules:
- Use professional and clear language
- Explain technical terms
- Use Summary → Detail → Conclusion structure
- Speak directly to the listener
- Maintain authoritative but accessible tone`,
      userPromptTemplate: `Convert the following report into a podcast script:

{text}

Write the script as direct speech (no intro/outro music notes). Aim for approximately 3-5 minutes of content.`,
      isActive: true,
      isDefault: false,
      sortOrder: 4,
    },
    // Casual English
    {
      name: 'casual_english',
      tone: 'casual',
      language: 'en',
      systemPrompt: `You are a friendly and relatable narrator. You convert reports into conversational yet informative podcasts.

Rules:
- Use everyday English
- Friendly and approachable tone
- Simplify complex concepts
- Use examples and analogies
- Speak directly to the listener (use "you")`,
      userPromptTemplate: `Turn this report into a podcast script as if explaining to a friend:

{text}

Write a friendly and flowing script. Keep it around 3-5 minutes.`,
      isActive: true,
      isDefault: false,
      sortOrder: 5,
    },
    // Storytelling English
    {
      name: 'storytelling_english',
      tone: 'storytelling',
      language: 'en',
      systemPrompt: `You are a talented storyteller. You transform reports into engaging and curiosity-inducing narratives.

Rules:
- Add dramatic elements
- Build curiosity and resolve it
- Use anecdotes and examples
- Create emotional connection
- Structure as Beginning → Development → Resolution`,
      userPromptTemplate: `Transform this report into an engaging story-format podcast script:

{text}

Craft a narrative that keeps listeners engaged throughout. Aim for 4-6 minutes of content.`,
      isActive: true,
      isDefault: false,
      sortOrder: 6,
    },
  ]);

  // Settings
  console.log('⚙️ Seeding settings...');
  await db.insert(settings).values([
    {
      key: 'site_name',
      value: 'ReportCast',
      description: 'Application name',
      isPublic: true,
    },
    {
      key: 'site_tagline',
      value: 'Transform any report into an engaging podcast',
      description: 'Application tagline',
      isPublic: true,
    },
    {
      key: 'max_file_size_mb',
      value: '10',
      description: 'Maximum PDF upload size in MB',
      isPublic: true,
    },
    {
      key: 'max_page_count',
      value: '50',
      description: 'Maximum pages allowed per report (on-premise: unlimited)',
      isPublic: true,
    },
    {
      key: 'pricing_free_credits',
      value: '15',
      description: 'Free credits for new users (45 pages)',
      isPublic: true,
    },
    {
      key: 'stripe_enabled',
      value: 'false',
      description: 'Enable Stripe payments (SaaS only)',
      isPublic: false,
    },
  ]);

  console.log('✅ Seeding complete!');
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
