# ReportCast Deployment Modes

ReportCast supports two deployment modes: **On-Premise** (free, unlimited) and **SaaS** (paid, managed).

---

## On-Premise Mode (Default) 🏢

**What it is:**
- Self-hosted, open-source deployment
- No pricing, no limits, no payments
- All AI models and TTS voices available
- Perfect for internal company use

**Features:**
- ✅ Unlimited reports & pages
- ✅ All AI models (OpenAI, Anthropic)
- ✅ All TTS voices (including premium)
- ✅ No credit system
- ✅ No user limits
- ✅ Full admin control
- ❌ No Stripe integration
- ❌ No usage analytics

**Configuration:**
```bash
# .env
DEPLOYMENT_MODE=on-premise
ADMIN_EMAIL=admin@yourcompany.com
```

**Use Cases:**
- Internal company podcast generation
- Research institutions
- Government agencies
- Privacy-sensitive organizations
- Self-hosted infrastructure

---

## SaaS Mode 💳

**What it is:**
- Managed cloud service
- Pricing tiers (Short/Medium/Long)
- Stripe payments
- User limits & credits
- Usage analytics

**Features:**
- ✅ Free tier (5 credits/month)
- ✅ Pricing tiers ($0.99 - $4.99)
- ✅ Stripe payments
- ✅ Credit system
- ✅ Usage analytics
- ✅ Premium models (paid)
- ❌ Self-hosting required

**Configuration:**
```bash
# .env
DEPLOYMENT_MODE=saas
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_EMAIL=admin@reportcast.com
```

**Pricing Tiers:**
- Short (1-5 pages): $0.99
- Medium (6-15 pages): $2.99
- Long (16-50 pages): $4.99
- Enterprise (51+): Custom

**Use Cases:**
- Public SaaS offering
- Pay-per-use service
- Monetization strategy

---

## Feature Comparison

| Feature | On-Premise | SaaS |
|---------|------------|------|
| **Pricing** | ❌ Free | ✅ Paid tiers |
| **Payments** | ❌ None | ✅ Stripe |
| **User Limits** | ❌ Unlimited | ✅ Credit system |
| **Page Limits** | ❌ Unlimited | ✅ Per tier |
| **Premium Models** | ✅ All free | ✅ Paid upgrade |
| **Analytics** | ❌ Basic | ✅ Advanced |
| **Self-Hosted** | ✅ Required | ✅ Optional |
| **Support** | Community | Premium |

---

## Configuration

### Environment Variables

```bash
# Deployment mode (required)
DEPLOYMENT_MODE=on-premise  # or 'saas'

# Admin access (required for on-premise)
ADMIN_EMAIL=admin@example.com

# SaaS-only (optional)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### API Response

```bash
curl http://localhost:3000/health

{
  "deployment": {
    "mode": "on-premise",
    "features": {
      "pricing": false,
      "payments": false,
      "credits": false,
      "userLimits": false,
      "analytics": false,
      "premiumModels": false
    }
  }
}
```

---

## Model Management

### Admin Panel (On-Premise)

Admins can manage AI models and TTS voices via API:

```bash
# List AI models
curl http://localhost:3000/api/admin/ai-models \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Activate/deactivate model
curl -X PATCH http://localhost:3000/api/admin/ai-models/:id \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"isActive": false}'

# List TTS voices
curl http://localhost:3000/api/admin/tts-voices \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Deactivate premium voice
curl -X PATCH http://localhost:3000/api/admin/tts-voices/:id \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"isActive": false}'
```

### Default Models (Seeded)

**AI Models:**
- ✅ GPT-4 Turbo (default, free)
- ⭐ GPT-4o (premium, SaaS only)
- ⭐ Claude Sonnet 4 (premium, SaaS only)

**TTS Voices:**
- ✅ Turkish (Piper) - default, free
- ✅ Alloy (English) - free
- ⭐ Nova (OpenAI) - premium
- ⭐ Shimmer (OpenAI) - premium
- ⭐ Rachel (ElevenLabs) - ultra-premium (disabled by default)

---

## Switching Modes

### On-Premise → SaaS

1. Update environment:
   ```bash
   DEPLOYMENT_MODE=saas
   STRIPE_SECRET_KEY=sk_...
   ```

2. Restart API:
   ```bash
   docker compose restart api
   ```

3. Features enabled:
   - Pricing tiers
   - Stripe payments
   - User credits
   - Premium models gated

### SaaS → On-Premise

1. Update environment:
   ```bash
   DEPLOYMENT_MODE=on-premise
   # Remove Stripe keys (optional)
   ```

2. Restart API:
   ```bash
   docker compose restart api
   ```

3. Features disabled:
   - No pricing
   - No payments
   - Unlimited usage
   - All models free

---

## Best Practices

### On-Premise Deployments

✅ **Do:**
- Set strong admin password
- Restrict network access (firewall)
- Enable HTTPS (reverse proxy)
- Regular backups (PostgreSQL)
- Monitor disk usage (audio files)

❌ **Don't:**
- Expose publicly without auth
- Use default passwords
- Skip database backups
- Ignore security updates

### SaaS Deployments

✅ **Do:**
- Use production Stripe keys
- Enable webhook signing
- Set up monitoring (Sentry)
- Configure email notifications
- Rate limit API endpoints

❌ **Don't:**
- Use test API keys in production
- Skip webhook verification
- Ignore failed payments
- Expose admin endpoints

---

## Migration Path

### Community Edition → Enterprise

If you start with on-premise and want to offer SaaS:

1. Keep on-premise for internal use
2. Deploy separate SaaS instance
3. Different databases (no shared data)
4. Point public domain to SaaS
5. Keep internal domain on-premise

### Hybrid Model

Run both modes:
- **Internal:** On-premise (free, unlimited)
- **External:** SaaS (paid, managed)

Example:
```
https://reportcast.yourcompany.com  → On-Premise
https://reportcast.com              → SaaS
```

---

## FAQ

**Q: Can I disable specific AI models in on-premise mode?**  
A: Yes, admins can deactivate models via `/api/admin/ai-models/:id`.

**Q: Are premium models really free in on-premise?**  
A: Yes, but you still need API keys (OpenAI, Anthropic). Cost is usage-based from providers.

**Q: Can I use Stripe in on-premise mode?**  
A: Technically yes, but not recommended. Use SaaS mode for proper payment integration.

**Q: How do I become admin in on-premise?**  
A: Set `ADMIN_EMAIL` in `.env` to your email address.

**Q: Can I switch modes without data loss?**  
A: Yes, mode only affects features. All data (users, reports) persists.

**Q: What happens to existing users when switching?**  
A: On-premise → SaaS: Users keep access but may need payment. SaaS → On-premise: All limits removed.

---

## Support

- **On-Premise:** Community support (GitHub Issues)
- **SaaS:** Premium support (email)
- **Enterprise:** Dedicated support (SLA)

GitHub: https://github.com/ismailperim/reportcast  
Docs: https://docs.reportcast.com  
Email: support@reportcast.com
