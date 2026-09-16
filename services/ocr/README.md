# Lango OCR Service

Internal Python microservice that extracts structured identity information from
document photos (National ID, Passport, Driver's License) for the Lango
property-management platform.

---

## Architecture

```
Frontend (React)
    ↓ PhotoCapture → base64
Firebase Cloud Function: analyzeIdDocument
    ↓ Bearer token  ↓ POST /ocr/document (JSON, 30 s timeout)
Python FastAPI service  ←  this service
    ↓
Image preprocessing pipeline (OpenCV):
  EXIF fix → resize → boundary detect → perspective warp
  → grayscale → deskew → CLAHE → denoise → sharpen → threshold
    ↓
Document parser (national_id / passport / driver_license)
  Passport: two-pass — visual zone + MRZ (mrz library, checksum validation)
    ↓
Per-field confidence scoring (Tesseract image_to_data word confidence)
    ↓
Structured JSON response
```

The browser/frontend **never** contacts this service directly.  
The service **never** writes to Firestore or creates visitors.  
Sensitive field values are **never** written to logs.

---

## OCR Engine

**Tesseract 5** (`tesseract-ocr-eng` language pack).

- Kenyan National IDs and passports print all fields in English (Latin script).
- The Swahili field labels (`JINA`, `JINSIA`, etc.) are also Latin script — `eng` handles them correctly.
- MRZ parsing uses the [`mrz`](https://pypi.org/project/mrz/) library (TD3 checksum validation).

---

## API

### `POST /ocr/document`

**Request body (JSON):**

```json
{
  "image_base64": "<base64-encoded JPEG or PNG>",
  "media_type": "image/jpeg",
  "doc_type": "auto"
}
```

`doc_type` can be `auto`, `national_id`, `passport`, or `driver_license`.  
Use `auto` to let the service classify the document.

**Headers:** `Authorization: Bearer <OCR_SERVICE_TOKEN>`

**Success response:**

```json
{
  "schema_version": "1.0",
  "success": true,
  "doc_type": "national_id",
  "fields": {
    "name": { "value": "Jane Warucho Ngugi", "confidence": 0.96, "raw": "JANE WARUCHO NGUGI" },
    "id_number": { "value": "12345678", "confidence": 0.94, "raw": "12345678" },
    "date_of_birth": { "value": "1990-04-15", "confidence": 0.88, "raw": "15/04/1990" },
    "sex": { "value": "F", "confidence": 0.93, "raw": "F" },
    "nationality": { "value": "KENYAN", "confidence": 1.0, "raw": "KENYAN" },
    "issue_date": { "value": "2015-03-10", "confidence": 0.79, "raw": "10/03/2015" },
    "expiry_date": { "value": null, "confidence": 0.0, "raw": null },
    "address": { "value": null, "confidence": 0.0, "raw": null },
    "issuing_country": { "value": null, "confidence": 0.0, "raw": null }
  },
  "mrz": null,
  "overall_confidence": 0.88,
  "warnings": [],
  "processing_ms": 1240
}
```

**Failure response (always HTTP 200 — never 500 for OCR failures):**

```json
{
  "schema_version": "1.0",
  "success": false,
  "doc_type": "unknown",
  "fields": {},
  "mrz": null,
  "overall_confidence": 0.0,
  "warnings": [],
  "error": {
    "code": "PARSE_FAILED",
    "message": "Could not extract identifying fields from this document.",
    "recoverable": true
  },
  "processing_ms": 340
}
```

### `GET /health`

Returns `{"status": "ok", "demo_mode": false}`. Always HTTP 200.

### `GET /ready`

Invokes Tesseract on a minimal image to verify it is installed and responding.  
Returns HTTP 200 with `{"ready": true, "tesseract_version": "5.x.x"}` or  
`{"ready": false, "error": "..."}`.

Interactive API docs: `GET /docs` (Swagger UI).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OCR_SERVICE_TOKEN` | `dev-token-change-in-prod` | Shared bearer token — must match the `OCR_SERVICE_TOKEN` Firebase Function secret |
| `OCR_DEMO_MODE` | `false` | Return mock data without Tesseract |
| `MAX_FILE_BYTES` | `5242880` | Maximum image size in bytes (5 MB) |
| `TESSERACT_TIMEOUT_SECONDS` | `20` | Hard timeout for Tesseract processing |
| `LOG_LEVEL` | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`) |

---

## Local Development

**Prerequisites:** Docker and Docker Compose.

```bash
# From the repo root:
docker compose up --build

# Verify health:
curl http://localhost:8080/health

# Verify readiness (Tesseract check):
curl http://localhost:8080/ready

# Test with a real image:
python3 - <<'EOF'
import base64, json, requests
with open("sample_id.jpg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
r = requests.post(
    "http://localhost:8080/ocr/document",
    json={"image_base64": b64, "media_type": "image/jpeg", "doc_type": "auto"},
    headers={"Authorization": "Bearer dev-token-change-in-prod"},
)
print(json.dumps(r.json(), indent=2))
EOF
```

---

## Running Tests

```bash
# From services/ocr/:
pip install -r requirements.txt
pytest tests/ -v
```

Tests use `MockProvider` injected via FastAPI's `dependency_overrides` — **no
Tesseract installation required** to run the test suite.

---

## Production Deployment

Deploy to **Google Cloud Run** in `us-central1` (same region as Firebase Cloud Functions).

```bash
# Build and push:
gcloud builds submit services/ocr/ --tag gcr.io/<PROJECT_ID>/lango-ocr

# Deploy (adjust memory/concurrency to your load):
gcloud run deploy lango-ocr \
  --image gcr.io/<PROJECT_ID>/lango-ocr \
  --region us-central1 \
  --memory 512Mi \
  --concurrency 2 \
  --set-env-vars OCR_DEMO_MODE=false \
  --set-secrets OCR_SERVICE_TOKEN=OCR_SERVICE_TOKEN:latest \
  --no-allow-unauthenticated

# Set Firebase Function secrets to point at the Cloud Run URL:
firebase functions:secrets:set OCR_SERVICE_URL   # paste Cloud Run URL
firebase functions:secrets:set OCR_SERVICE_TOKEN # paste the same token
```

`--no-allow-unauthenticated` keeps Cloud Run behind Google IAM. The Cloud
Function has network access within the same project without a VPC connector.

---

## Adding a New Document Type

1. Create `app/parsers/<new_type>.py` subclassing `BaseParser`.
2. Implement `parse(image, warnings) → ParsedDocument`.
3. Add a `PipelineConfig` entry in `app/pipeline/config.py`.
4. Register in `app/providers/tesseract.py` `_PARSERS` dict.
5. Add the new `doc_type` literal to `app/schemas.py` `DocType`.
6. Write tests in `tests/test_parsers.py`.

---

## Security & Privacy

- Document images are processed **in-memory** — no temp files created by this service.
  (Tesseract writes transient `/tmp` files internally; these are cleaned by the OS.)
- Original images are **never permanently stored**.
- Extracted field **values are never written to logs** — only: request ID, doc_type, duration, confidence, success.
- The service is **not publicly exposed** — it sits behind the Cloud Function's bearer-token check and the Cloud Run IAM boundary.
- `OCR_SERVICE_TOKEN` uses `hmac.compare_digest` (timing-safe) to prevent timing attacks.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `GET /ready` returns `ready: false` | Tesseract not installed | Check `apt-get install tesseract-ocr` in Dockerfile |
| All fields `null`, low confidence | Poor image quality | Ask guard to retake photo in better lighting |
| `PARSE_FAILED` on passport | MRZ lines not extracted cleanly | OCR saw blurry MRZ zone; visual-zone fallback returned no name |
| Cloud Function timeout | OCR service not reachable | Check `OCR_SERVICE_URL` secret; verify Cloud Run is running |
| `401 Unauthorized` from Cloud Function | Token mismatch | Ensure `OCR_SERVICE_TOKEN` Firebase secret == `OCR_SERVICE_TOKEN` env var on Cloud Run |
