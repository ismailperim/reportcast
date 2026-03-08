# API Documentation - Additional Endpoints

## Pricing

### GET /api/pricing

Get pricing information (public endpoint).

**Response (SaaS mode):**
```json
{
  "mode": "saas",
  "currency": "USD",
  "tiers": {
    "short": {
      "name": "Short Report",
      "pages": "1-5",
      "price": 0.99,
      "priceCents": 99,
      "description": "Perfect for quick summaries and brief documents"
    },
    "medium": {
      "name": "Medium Report",
      "pages": "6-15",
      "price": 2.99,
      "priceCents": 299,
      "description": "Ideal for standard reports and articles"
    },
    "long": {
      "name": "Long Report",
      "pages": "16-50",
      "price": 4.99,
      "priceCents": 499,
      "description": "Best for comprehensive documents and whitepapers"
    },
    "enterprise": {
      "name": "Enterprise",
      "pages": "51+",
      "price": null,
      "priceCents": null,
      "description": "Custom pricing for large documents",
      "contactEmail": "sales@reportcast.com"
    }
  },
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "credits": 5,
      "features": [...]
    },
    ...
  ]
}
```

**Response (On-Premise mode):**
```json
{
  "mode": "on-premise",
  "message": "All features are free in on-premise mode",
  "plans": [],
  "tiers": {}
}
```

### GET /api/pricing/calculate

Calculate price for a specific page count.

**Query Parameters:**
- `pages` (integer, required): Number of pages

**Example:**
```bash
GET /api/pricing/calculate?pages=10
```

**Response:**
```json
{
  "tier": "medium",
  "pageCount": 10,
  "price": 2.99,
  "priceCents": 299,
  "currency": "USD"
}
```

---

## Admin Panel (Protected)

**Authentication:** Requires admin role (`plan: "admin"`)

### AI Models

#### GET /api/admin/models

List all AI models.

**Response:**
```json
{
  "models": [
    {
      "id": "uuid",
      "provider": "openai",
      "modelId": "gpt-4-turbo",
      "displayName": "GPT-4 Turbo",
      "description": "Fast and capable, good for most reports",
      "costPer1kTokens": 10,
      "isPremium": false,
      "isActive": true,
      "isDefault": true,
      "sortOrder": 1,
      "createdAt": "2026-03-08T...",
      "updatedAt": "2026-03-08T..."
    },
    ...
  ]
}
```

#### POST /api/admin/models

Create a new AI model.

**Request:**
```json
{
  "provider": "openai",
  "modelId": "gpt-4o",
  "displayName": "GPT-4o",
  "description": "Latest multimodal model",
  "costPer1kTokens": 25,
  "isPremium": true,
  "isActive": true,
  "isDefault": false,
  "sortOrder": 2
}
```

#### PATCH /api/admin/models/:id

Update an AI model (partial update).

**Request:**
```json
{
  "isActive": false,
  "description": "Deprecated model"
}
```

#### DELETE /api/admin/models/:id

Delete an AI model.

---

### TTS Voices

#### GET /api/admin/voices

List all TTS voices.

#### POST /api/admin/voices

Create a new TTS voice.

**Request:**
```json
{
  "provider": "openai",
  "voiceId": "nova",
  "displayName": "Nova (English)",
  "description": "Energetic and engaging female voice",
  "language": "en",
  "costPer1kChars": 150,
  "isPremium": true,
  "isActive": true,
  "isDefault": false,
  "sortOrder": 2
}
```

#### PATCH /api/admin/voices/:id

Update a TTS voice.

#### DELETE /api/admin/voices/:id

Delete a TTS voice.

---

### Prompts

#### GET /api/admin/prompts

List all prompts.

**Response:**
```json
{
  "prompts": [
    {
      "id": "uuid",
      "name": "professional_turkish",
      "tone": "professional",
      "language": "tr",
      "systemPrompt": "Sen deneyimli bir teknik yazarsın...",
      "userPromptTemplate": "Aşağıdaki raporu bir podcast senaryosuna dönüştür:\n\n{text}",
      "isActive": true,
      "isDefault": true,
      "sortOrder": 1,
      "createdAt": "2026-03-08T...",
      "updatedAt": "2026-03-08T...",
      "updatedBy": "uuid"
    },
    ...
  ]
}
```

#### POST /api/admin/prompts

Create a new prompt template.

**Request:**
```json
{
  "name": "casual_english",
  "tone": "casual",
  "language": "en",
  "systemPrompt": "You are a friendly narrator...",
  "userPromptTemplate": "Turn this report into a podcast:\n\n{text}",
  "isActive": true,
  "isDefault": false,
  "sortOrder": 5
}
```

#### PATCH /api/admin/prompts/:id

Update a prompt.

#### DELETE /api/admin/prompts/:id

Delete a prompt.

---

### Settings

#### GET /api/admin/settings

List all global settings.

**Response:**
```json
{
  "settings": [
    {
      "id": "uuid",
      "key": "site_name",
      "value": "ReportCast",
      "description": "Application name",
      "isPublic": true,
      "updatedAt": "2026-03-08T...",
      "updatedBy": "uuid"
    },
    ...
  ]
}
```

#### PATCH /api/admin/settings/:key

Update a setting.

**Request:**
```json
{
  "value": "My Custom ReportCast",
  "description": "Updated application name",
  "isPublic": true
}
```

---

## Payments (SaaS Mode Only)

### GET /api/payments/config

Get Stripe configuration (public endpoint).

**Response:**
```json
{
  "enabled": true,
  "publishableKey": "pk_test_..."
}
```

### POST /api/payments/create-intent

Create a payment intent for a report.

**Request:**
```json
{
  "reportId": "uuid"
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "amount": 299,
  "currency": "usd"
}
```

### POST /api/payments/webhook

Stripe webhook endpoint (raw body).

**Headers:**
- `stripe-signature`: Webhook signature

### POST /api/payments/buy-credits

Purchase additional credits.

**Request:**
```json
{
  "credits": 10
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "credits": 10,
  "amount": 990,
  "currency": "usd",
  "pricePerCredit": 99
}
```

---

## Deployment Modes

ReportCast supports two deployment modes:

### On-Premise Mode (Default)

- **All features free**
- **No limits** (pages, reports, users)
- **No payments** (Stripe disabled)
- **All models/voices available**
- Self-hosted, full control

Set via: `DEPLOYMENT_MODE=on-premise`

### SaaS Mode

- **Pricing tiers** (short/medium/long/enterprise)
- **User limits** (credits, plans)
- **Premium features** (models, voices)
- **Stripe payments** enabled

Set via: `DEPLOYMENT_MODE=saas`

Feature flags:
- `pricing`: Tier-based pricing
- `payments`: Stripe integration
- `credits`: Credit system
- `userLimits`: Free/Team/Business plans
- `analytics`: Usage analytics
- `premiumModels`: Gated AI models/voices
