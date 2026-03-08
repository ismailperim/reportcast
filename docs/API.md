# ReportCast API Documentation

Base URL: `http://localhost:3000`

## Authentication

All protected endpoints require a Bearer token:

```bash
Authorization: Bearer <your-jwt-token>
```

Get token via `/api/auth/register` or `/api/auth/login`.

---

## Endpoints

### Authentication

#### POST /api/auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "creditsRemaining": 5
  }
}
```

---

#### POST /api/auth/login

Login existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "creditsRemaining": 5
  }
}
```

---

#### GET /api/auth/me

Get current user info.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "creditsRemaining": 5,
  "createdAt": "2026-03-07T10:00:00Z"
}
```

---

### Upload & Processing

#### POST /api/upload

Upload PDF and get pricing estimate.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@report.pdf"
```

**Response:**
```json
{
  "reportId": "uuid",
  "filename": "report.pdf",
  "pageCount": 12,
  "tier": "medium",
  "priceCents": 299,
  "priceFormatted": "$2.99",
  "currency": "USD",
  "status": "pending",
  "message": "Ready for processing. Confirm payment to start."
}
```

**Tiers:**
- `short` (1-5 pages): $0.99
- `medium` (6-15 pages): $2.99
- `long` (16-50 pages): $4.99
- `enterprise` (51+ pages): Custom pricing (contact sales)

---

#### POST /api/upload/:reportId/confirm

Confirm payment and start processing.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "language": "auto",  // or "tr", "en", "es", etc.
  "tone": "professional"  // or "casual", "storytelling"
}
```

**Response:**
```json
{
  "reportId": "uuid",
  "status": "processing",
  "message": "Processing started. Check status endpoint for updates."
}
```

**Languages:**
- `auto`: Auto-detect from text (default)
- `tr`: Turkish
- `en`: English
- `es`: Spanish
- `fr`: French
- `de`: German

**Tones:**
- `professional`: Clear, formal podcast style
- `casual`: Conversational, friendly style
- `storytelling`: Dramatic, narrative style

---

### Reports

#### GET /api/reports

List user's reports.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional, default: 20): Number of reports to return
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "filename": "report.pdf",
      "pageCount": 12,
      "tier": "medium",
      "status": "completed",
      "audioUrl": "/api/reports/uuid/download",
      "createdAt": "2026-03-07T10:00:00Z",
      "completedAt": "2026-03-07T10:05:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

#### GET /api/reports/:reportId

Get report details and status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "filename": "report.pdf",
  "pageCount": 12,
  "tier": "medium",
  "status": "completed",
  "audioUrl": "/api/reports/uuid/download",
  "audioSize": 3451234,
  "audioDurationSeconds": 180,
  "processingTimeMs": 45000,
  "aiCostCents": 5,
  "ttsCostCents": 0,
  "errorMessage": null,
  "createdAt": "2026-03-07T10:00:00Z",
  "completedAt": "2026-03-07T10:05:00Z"
}
```

**Status values:**
- `pending`: Uploaded, waiting for payment confirmation
- `processing`: AI script generation + TTS in progress
- `completed`: Audio file ready for download
- `failed`: Processing failed (see errorMessage)

---

#### GET /api/reports/:reportId/download

Download generated audio file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `audio/mpeg`
- File download stream

**Example:**
```bash
curl -X GET http://localhost:3000/api/reports/:reportId/download \
  -H "Authorization: Bearer <token>" \
  -o podcast.mp3
```

---

#### DELETE /api/reports/:reportId

Delete report and audio file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Report deleted successfully"
}
```

---

### Sharing

#### POST /api/share/:reportId

Enable public sharing (generate share link).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "shareToken": "abc123...",
  "shareUrl": "http://localhost:3000/listen/abc123...",
  "message": "Public sharing enabled"
}
```

---

#### DELETE /api/share/:reportId

Disable public sharing.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Public sharing disabled"
}
```

---

#### GET /api/share/:reportId/stats

Get listen statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalListens": 42,
  "lastListenedAt": "2026-03-07T15:30:00Z",
  "isPublic": true,
  "shareToken": "abc123...",
  "recentListens": [
    {
      "listenedAt": "2026-03-07T15:30:00Z",
      "ipAddress": "192.168.1.***",
      "country": "TR",
      "city": "Istanbul"
    }
  ]
}
```

---

#### GET /listen/:shareToken

**Public endpoint** - Stream/download podcast (no auth required).

**Response:**
- Content-Type: `audio/mpeg`
- Streams audio file
- Tracks listen event

**Example:**
```bash
# Open in browser or media player
open http://localhost:3000/listen/abc123...

# Download
curl http://localhost:3000/listen/abc123... -o podcast.mp3
```

---

### Health Check

#### GET /health

Check API and database health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T10:00:00Z",
  "database": {
    "healthy": true,
    "timestamp": "2026-03-07T10:00:00.123Z"
  },
  "version": "0.1.0"
}
```

---

## Example Workflow

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Save the returned `token`.

---

### 2. Upload PDF

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@report.pdf"
```

Save the returned `reportId`.

---

### 3. Confirm Processing

```bash
curl -X POST http://localhost:3000/api/upload/<reportId>/confirm \
  -H "Authorization: Bearer <token>"
```

---

### 4. Check Status

```bash
curl -X GET http://localhost:3000/api/reports/<reportId> \
  -H "Authorization: Bearer <token>"
```

Wait until `status` is `completed`.

---

### 5. Download Audio

```bash
curl -X GET http://localhost:3000/api/reports/<reportId>/download \
  -H "Authorization: Bearer <token>" \
  -o podcast.mp3
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `400`: Bad request (missing parameters, invalid input)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (accessing someone else's resource)
- `404`: Not found
- `409`: Conflict (e.g., email already exists)
- `500`: Internal server error

---

## Rate Limiting

(Not implemented yet)

Future: 100 requests/minute per user.

---

## Webhooks

(Not implemented yet)

Future: Webhook notifications when report processing completes.
