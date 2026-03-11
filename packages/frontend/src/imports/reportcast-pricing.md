# ReportCast Pricing

## Model: Pay-Per-Use Credit System (MVP)

### Credit System

**1 credit = 3 pages**

Every new user starts with **15 free credits** (45 pages worth of processing).

### How It Works

1. **Upload PDF** → System counts pages
2. **Credit Check** → Calculates required credits (pages ÷ 3, rounded up)
3. **Process** → Deducts credits, generates podcast
4. **Out of Credits?** → Purchase more

### Example

```
10-page PDF:
  10 pages ÷ 3 = 3.33 → 4 credits required
  
User with 15 credits:
  15 - 4 = 11 credits remaining after processing
```

---

## Credit Packages

| Package | Credits | Pages | Price | Best For |
|---------|---------|-------|-------|----------|
| **Starter** | 30 | 90 | $4.99 | Light users |
| **Basic** | 100 | 300 | $14.99 | Regular users |
| **Pro** ⭐ | 300 | 900 | $39.99 | Power users |
| **Business** | 1000 | 3000 | $99.99 | Teams |

**Note:** All packages are one-time purchases. Credits don't expire.

---

## API Endpoints

### Get Pricing

```http
GET /api/pricing
```

**Response:**
```json
{
  "mode": "saas",
  "model": "pay-per-use",
  "currency": "USD",
  "creditsPerPage": 3,
  "freeCredits": 15,
  "packages": [
    {
      "id": "starter",
      "name": "Starter",
      "credits": 30,
      "pages": 90,
      "price": 4.99,
      "priceCents": 499,
      "priceFormatted": "$4.99",
      "pricePerCredit": "0.166",
      "description": "90 pages worth of processing",
      "bestValue": false
    },
    {
      "id": "pro",
      "name": "Pro",
      "credits": 300,
      "pages": 900,
      "price": 39.99,
      "priceCents": 3999,
      "priceFormatted": "$39.99",
      "pricePerCredit": "0.133",
      "description": "900 pages worth of processing",
      "bestValue": true
    }
  ]
}
```

### Calculate Requirements

```http
GET /api/pricing/calculate?pages=25
```

**Response:**
```json
{
  "pageCount": 25,
  "creditsRequired": 9,
  "creditsPerPage": 3,
  "recommendedPackage": {
    "id": "starter",
    "name": "Starter",
    "credits": 30,
    "price": 4.99,
    "priceCents": 499,
    "priceFormatted": "$4.99"
  },
  "allPackages": [
    {
      "id": "starter",
      "name": "Starter",
      "credits": 30,
      "price": 4.99,
      "priceCents": 499,
      "canProcess": true
    }
  ]
}
```

### Purchase Credits

```http
POST /api/payments/buy-credits
Authorization: Bearer <token>
Content-Type: application/json

{
  "packageId": "pro"
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "package": {
    "id": "pro",
    "name": "Pro",
    "credits": 300,
    "pages": 900,
    "price": 39.99,
    "priceCents": 3999,
    "priceFormatted": "$39.99"
  },
  "currency": "usd"
}
```

---

## User Flow

### 1. Upload PDF

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: report.pdf
```

**Response (Sufficient Credits):**
```json
{
  "reportId": "uuid",
  "filename": "report.pdf",
  "pageCount": 10,
  "status": "pending",
  "creditsRequired": 4,
  "creditsAvailable": 15,
  "hasEnoughCredits": true,
  "message": "Ready to process. Will consume 4 credits."
}
```

**Response (Insufficient Credits):**
```json
{
  "reportId": "uuid",
  "filename": "report.pdf",
  "pageCount": 50,
  "status": "pending",
  "creditsRequired": 17,
  "creditsAvailable": 5,
  "hasEnoughCredits": false,
  "creditDeficit": 12,
  "message": "Insufficient credits. You need 17 credits but have 5.",
  "recommendedPackage": {
    "id": "starter",
    "name": "Starter",
    "credits": 30,
    "price": 4.99,
    "priceCents": 499,
    "priceFormatted": "$4.99"
  }
}
```

### 2. Confirm Processing

```http
POST /api/upload/:reportId/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "auto",
  "tone": "professional"
}
```

**Success (Credits Deducted):**
```json
{
  "reportId": "uuid",
  "status": "processing",
  "message": "Processing started. Check status endpoint for updates."
}
```

**Error (Insufficient Credits):**
```json
{
  "error": "Insufficient credits",
  "creditsRequired": 17,
  "creditsAvailable": 5,
  "message": "Please purchase credits to continue"
}
```

---

## Future: Subscription Plans

When launched, subscription plans will offer:

- **Monthly credit allocation** (auto-renewed)
- **Premium AI models** (GPT-4o, Claude Opus)
- **Premium TTS voices** (OpenAI, ElevenLabs)
- **Priority processing** queue
- **Better rates** (more credits per dollar)

**Plan Advantages (Infrastructure Ready):**

| Feature | Free | Team | Business |
|---------|------|------|----------|
| Credits/month | 15 | 150 | 600 |
| Premium Models | ❌ | ✅ | ✅ |
| Premium Voices | ❌ | ✅ | ✅ |
| Priority Queue | ❌ | ✅ | ✅ |
| Support | Community | Priority | Dedicated |

---

## Configuration (Database-Driven)

All pricing is stored in the `settings` table and can be updated without code changes:

- `pricing_credits_per_page`: "3"
- `pricing_free_credits`: "15"
- `pricing_package_starter_credits`: "30"
- `pricing_package_starter_price`: "499"
- `pricing_package_basic_credits`: "100"
- `pricing_package_basic_price`: "1499"
- `pricing_package_pro_credits`: "300"
- `pricing_package_pro_price`: "3999"
- `pricing_package_business_credits`: "1000"
- `pricing_package_business_price`: "9999"

---

## On-Premise Mode

When `DEPLOYMENT_MODE=on-premise`:

- **All features free**
- **No credit limits**
- **No page limits**
- **No payments**

Perfect for self-hosted deployments!