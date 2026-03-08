# ReportCast Test Plan

## Test Environment

```bash
cd /home/perim.labz.tr/.openclaw/workspace/reportcast

# Start all services
docker-compose up -d

# Check services
docker-compose ps

# Watch logs
docker-compose logs -f api worker
```

---

## Test Scenarios

### 1. Service Health Checks

```bash
# PostgreSQL
docker exec reportcast-postgres psql -U reportcast -c "SELECT 1"

# Redis
docker exec reportcast-redis redis-cli ping

# MinIO
curl http://localhost:9001  # Web console (login: minioadmin/minioadmin)
curl http://localhost:9000/minio/health/live

# TTS Server
curl http://localhost:8000/v1/models

# API
curl http://localhost:3000/health
```

**Expected:**
- All services healthy
- API version: 0.2.0
- Storage: minio

---

### 2. User Registration & Authentication

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@reportcast.com",
    "password": "test123",
    "name": "Test User"
  }'

# Save token from response
TOKEN="eyJhbG..."

# Get user info
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- User created successfully
- JWT token returned
- User info includes: plan=free, creditsRemaining=5

---

### 3. PDF Upload & Pricing

```bash
# Upload PDF (create test file first)
echo "Test report content..." > /tmp/test-report.txt
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@packages/worker/inputs/test-turkce.txt"

# Save reportId from response
REPORT_ID="uuid..."
```

**Expected:**
- File uploaded
- Tier detected (short: 1-5 pages)
- Price calculated ($0.99)
- Status: pending

---

### 4. Process Report

```bash
# Confirm and start processing
curl -X POST http://localhost:3000/api/upload/$REPORT_ID/confirm \
  -H "Authorization: Bearer $TOKEN"

# Check status (repeat until completed)
curl http://localhost:3000/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Status: processing → completed
- S3 key: podcasts/{reportId}.mp3
- Audio URL present
- Processing time logged

---

### 5. Download Podcast

```bash
# Download audio file
curl http://localhost:3000/api/reports/$REPORT_ID/download \
  -H "Authorization: Bearer $TOKEN" \
  -o test-podcast.mp3

# Play locally
mpv test-podcast.mp3
```

**Expected:**
- File downloads successfully
- Audio plays correctly
- Turkish voice quality acceptable

---

### 6. Enable Public Sharing

```bash
# Enable sharing
curl -X POST http://localhost:3000/api/share/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN"

# Save shareToken from response
SHARE_TOKEN="abc123..."
```

**Expected:**
- Share token generated
- Share URL: http://localhost:3000/listen/{token}
- isPublic: true

---

### 7. Anonymous Listening (Public Share)

```bash
# Listen without auth (anonymous)
curl http://localhost:3000/listen/$SHARE_TOKEN \
  -o shared-podcast.mp3

# Or open in browser
open http://localhost:3000/listen/$SHARE_TOKEN
```

**Expected:**
- Audio streams/downloads without auth
- Listen event tracked
- Listen count incremented

---

### 8. Listen Analytics

```bash
# Get listen stats
curl http://localhost:3000/api/share/$REPORT_ID/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- totalListens: 1 (or more)
- recentListens array populated
- IP address masked (192.168.1.***)
- lastListenedAt timestamp

---

### 9. Disable Sharing

```bash
# Disable public access
curl -X DELETE http://localhost:3000/api/share/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN"

# Try accessing public link (should fail)
curl http://localhost:3000/listen/$SHARE_TOKEN
```

**Expected:**
- Sharing disabled successfully
- Public link returns 404

---

### 10. List Reports

```bash
# List user's reports
curl http://localhost:3000/api/reports \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Array of reports
- Includes status, audioUrl, pageCount
- Pagination info

---

### 11. Delete Report

```bash
# Delete report
curl -X DELETE http://localhost:3000/api/reports/$REPORT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Report deleted from database
- Audio file deleted from S3 (MinIO)
- Cannot access anymore

---

### 12. MinIO Web Console

```bash
# Open MinIO console
open http://localhost:9001

# Login: minioadmin / minioadmin
# Browse bucket: reportcast
# Check file: podcasts/{reportId}.mp3
```

**Expected:**
- Bucket `reportcast` exists
- Audio files visible
- Metadata includes reportId

---

### 13. S3 Storage Verification

```bash
# List objects in MinIO
docker exec reportcast-minio mc ls local/reportcast/

# Or use AWS CLI (if installed)
aws s3 ls s3://reportcast/ \
  --endpoint-url http://localhost:9000 \
  --profile minio
```

**Expected:**
- Files in podcasts/ folder
- File sizes match database records

---

### 14. Worker Queue Processing

```bash
# Check BullMQ queue
docker exec reportcast-redis redis-cli KEYS "bull:report-processing:*"

# Watch worker logs
docker-compose logs -f worker
```

**Expected:**
- Jobs processed successfully
- No failed jobs
- Processing time logged

---

### 15. Database Verification

```bash
# Connect to database
docker exec -it reportcast-postgres psql -U reportcast reportcast

# Check tables
\dt

# Check reports
SELECT id, filename, status, s3_key, listen_count FROM reports;

# Check listens
SELECT * FROM listens ORDER BY listened_at DESC LIMIT 10;

# Exit
\q
```

**Expected:**
- All tables created (users, reports, payments, api_keys, listens)
- Reports have s3_key populated
- Listen events tracked

---

## Performance Tests

### Upload Speed

```bash
time curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@large-report.pdf"
```

**Target:** <5s for 10MB PDF

---

### Processing Time

Monitor worker logs:
- PDF parsing: <2s
- AI script generation: 5-15s
- TTS generation: 10-30s
- S3 upload: <5s
- **Total:** 20-50s for short report (1-5 pages)

---

### Download Speed

```bash
time curl http://localhost:3000/api/reports/$REPORT_ID/download \
  -H "Authorization: Bearer $TOKEN" \
  -o test.mp3
```

**Target:** Streaming starts immediately, full download <10s for 5MB file

---

## Stress Tests

### Concurrent Uploads

```bash
# Upload 10 files simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test-report-$i.pdf" &
done
wait
```

**Expected:**
- All uploads succeed
- Worker processes concurrently (2 concurrent by default)
- No crashes

---

### Multiple Listens

```bash
# Simulate 100 listens
for i in {1..100}; do
  curl -s http://localhost:3000/listen/$SHARE_TOKEN > /dev/null &
done
wait
```

**Expected:**
- All requests succeed
- Listen count accurate (100)
- Database not overwhelmed

---

## Error Handling Tests

### Invalid Token

```bash
curl http://localhost:3000/api/reports \
  -H "Authorization: Bearer invalid_token"
```

**Expected:** 401 Unauthorized

---

### Non-existent Report

```bash
curl http://localhost:3000/api/reports/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** 404 Not found

---

### Invalid File Type

```bash
echo "not a pdf" > /tmp/test.txt
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt"
```

**Expected:** 400 Only PDF files allowed

---

### Large File (>50MB)

```bash
dd if=/dev/zero of=/tmp/large.pdf bs=1M count=60
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/large.pdf"
```

**Expected:** 400 File too large

---

## Cleanup

```bash
# Stop services
docker-compose down

# Remove volumes (CAUTION: deletes all data)
docker-compose down -v

# Remove test files
rm -f test-podcast.mp3 shared-podcast.mp3
```

---

## Success Criteria

- ✅ All services start without errors
- ✅ Database migrations run automatically
- ✅ MinIO bucket created automatically
- ✅ User registration works
- ✅ PDF upload + processing succeeds
- ✅ Audio file uploaded to S3
- ✅ Download works (auth required)
- ✅ Public sharing generates valid link
- ✅ Anonymous listening works
- ✅ Listen analytics track events
- ✅ Disable sharing blocks access
- ✅ Delete removes from S3 and DB
- ✅ Worker processes jobs reliably
- ✅ No memory leaks or crashes

---

## Known Issues

- [ ] Audio duration calculation (rough estimate, needs audio metadata library)
- [ ] GeoIP lookup not implemented (country/city placeholders)
- [ ] Email notifications not implemented
- [ ] Stripe payments not integrated
- [ ] Rate limiting not implemented

---

## Next Steps

- Add automated tests (Jest/Vitest)
- Add CI/CD test pipeline
- Add load testing (k6 or Artillery)
- Add monitoring (Prometheus + Grafana)
