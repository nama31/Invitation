# Feature Plan: Guest Photo Gallery

## Why Cloudflare R2

| | Cloudflare R2 | AWS S3 | Google Cloud Storage |
|---|---|---|---|
| Egress fees | **Free** | ~$0.09/GB | ~$0.12/GB |
| Storage cost | $0.015/GB/mo | $0.023/GB/mo | $0.020/GB/mo |
| S3-compatible API | ✅ | ✅ | ❌ (own SDK) |
| Setup complexity | Low | Medium | High |
| Free tier | 10GB storage, 1M requests | 5GB (12mo only) | 5GB (12mo only) |

At an event with 100 guests uploading ~20 photos each at ~3MB average = ~6GB of photos served
many times. On S3 that's real money. On R2 it's free.

---

## How uploads work (architecture decision)

**Option A — Direct upload (recommended)**
```
Guest browser → POST /api/photos/presign (backend)
             ← { upload_url, photo_id }
Guest browser → PUT upload_url (direct to R2, backend never touches the file)
Guest browser → POST /api/photos/confirm { photo_id } (backend saves metadata to DB)
```
✅ Backend never handles large files — no memory pressure, no timeouts
✅ Upload speed is maximum (direct to CDN edge)
✅ Works with the existing FastAPI setup

**Option B — Proxy upload**
```
Guest browser → POST /api/photos/upload (multipart, through backend)
Backend → streams file to R2
```
❌ Backend handles every byte — slow, memory risk, Docker container limits
❌ Don't use this

We use **Option A**.

---

## Database changes

New table: **`photos`**

| Column | Type | Notes |
|---|---|---|
| `id` | Serial PK | |
| `storage_key` | VARCHAR | R2 object key, e.g. `photos/uuid4.jpg` |
| `public_url` | VARCHAR | Full CDN URL for display |
| `uploader_name` | VARCHAR | Guest's name (self-reported, optional) |
| `original_filename` | VARCHAR | For display only |
| `file_size_bytes` | INTEGER | For admin info |
| `mime_type` | VARCHAR | `image/jpeg`, `image/png`, `image/heic` |
| `is_approved` | BOOLEAN | Default `true` — admin can hide photos |
| `uploaded_at` | TIMESTAMP | Default now() |

No FK to guests table — upload is anonymous/self-reported. Keeps it simple.

---

## API Endpoints

### Public

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/photos/presign` | Generate a presigned R2 upload URL |
| `POST` | `/api/photos/confirm` | Save photo metadata after successful upload |
| `GET` | `/api/photos` | List all approved photos (for gallery display) |

### Admin (JWT protected)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/photos` | All photos including hidden ones |
| `PATCH` | `/api/admin/photos/{id}/hide` | Set is_approved = false |
| `PATCH` | `/api/admin/photos/{id}/show` | Set is_approved = true |
| `DELETE` | `/api/admin/photos/{id}` | Delete from DB and from R2 |

---

## Page section placement

Guest page section order:
1. Hero
2. RSVP
3. Seating Chart
4. **Photo Gallery** ← here, after seating
5. Schedule
6. Dress Code
7. Map

Reasoning: the gallery is participatory content (guests add to it), so it belongs in the
interactive zone of the page (top half), not buried in the info blocks at the bottom.
After seating also makes sense emotionally: "you're confirmed, you know your table, now
see (and add to) the memories."

Nav bar link: add **Photos** between Seating and Schedule.

---

## Frontend components

### `components/PhotoGallery.tsx`
- Fetches `GET /api/photos` on mount
- Masonry grid layout (CSS columns, 2 on mobile / 3 on desktop)
- Each photo: lazy-loaded `<img>` with rounded corners and a subtle shadow
- Click → opens a lightbox (full-screen overlay with prev/next arrows)
- "Add your photos" upload button at the top of the section

### `components/PhotoUpload.tsx`
- Opens as a bottom sheet / modal on mobile
- Drag-and-drop zone on desktop, tap-to-select on mobile
- Accepts: JPEG, PNG, HEIC, WebP — max 20MB per file, max 10 files at once
- Client-side image compression before upload (use `browser-image-compression` npm package)
  Compress to max 2000px on longest side, quality 0.85 — keeps quality good, cuts size
- Upload flow per file:
  1. Call POST /api/photos/presign → get { upload_url, photo_id, storage_key }
  2. PUT file directly to upload_url (XMLHttpRequest for progress tracking, not fetch)
  3. On 200 → call POST /api/photos/confirm { photo_id, uploader_name, original_filename, file_size_bytes, mime_type }
  4. On success → photo appears in gallery immediately (optimistic prepend to local state)
- Per-file progress bar during upload
- Error state per file if upload fails (retry button)
- Uploader name input (optional): "Your name (optional)" — saved as uploader_name

### `hooks/usePhotoSocket.ts`
WebSocket hook (same pattern as useSeatingSocket) listening on `/ws/photos`.
When a new photo is confirmed → backend broadcasts `{ "type": "photo_added" }` →
all open gallery instances re-fetch and show the new photo.
This makes the gallery feel live: guests at the event see each other's photos appear
in real time.

---

## Cloudflare R2 setup (one-time, ~10 minutes)

1. Create a Cloudflare account → go to R2 in the dashboard
2. Create a bucket named `eventinvite-photos`
3. Enable **Public access** on the bucket → get the public CDN URL
   (looks like: `https://pub-xxxx.r2.dev`)
4. Create an **API Token** with R2 Object Write permissions → get:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
5. Add to `.env`:
   ```env
   R2_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_key_id
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=eventinvite-photos
   R2_PUBLIC_URL=https://pub-xxxx.r2.dev
   ```
6. R2 endpoint for boto3/s3 clients:
   `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

---

## New dependencies

**Backend:**
```
boto3          # S3-compatible client — works with R2 out of the box
```

**Frontend:**
```
browser-image-compression   # client-side compress before upload
```
No heavy lightbox library needed — build a simple one with Tailwind + React portal.

---

## Phase breakdown

| Phase | What | Prompt file |
|---|---|---|
| **A** | Backend: DB migration + R2 config + 3 public endpoints + 4 admin endpoints + WebSocket broadcast | `PHOTOS_PHASE_A.md` |
| **B** | Frontend: PhotoGallery + PhotoUpload + usePhotoSocket + page integration | `PHOTOS_PHASE_B.md` |
| **C** | Admin panel: photo moderation tab (list, hide, delete) | `PHOTOS_PHASE_C.md` |

---

# Phase A — AI Prompt (Backend)

```
The EventInvite project is fully implemented. Add a guest photo gallery feature to the backend. Do not change any existing endpoints, models, or files except where explicitly listed.

## 1. New dependency
Add `boto3` to requirements.txt.

## 2. R2 client (new file: backend/app/core/r2.py)
Set up an S3-compatible boto3 client pointed at Cloudflare R2:

```python
import boto3
from app.core.config import settings

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )
```

Also add a helper:
```python
def generate_presigned_upload_url(key: str, mime_type: str, expires_in: int = 300) -> str:
    client = get_r2_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": key,
            "ContentType": mime_type,
        },
        ExpiresIn=expires_in,
    )

def delete_object(key: str) -> None:
    client = get_r2_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=key)
```

## 3. Settings additions (backend/app/core/config.py)
Add to the existing Settings class (do not remove existing fields):
  r2_account_id: str
  r2_access_key_id: str
  r2_secret_access_key: str
  r2_bucket_name: str
  r2_public_url: str  # e.g. https://pub-xxxx.r2.dev

## 4. New DB model (backend/app/models/photo.py)
```python
class Photo(Base):
    __tablename__ = "photos"
    id: Mapped[int] = mapped_column(primary_key=True)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    public_url: Mapped[str] = mapped_column(String, nullable=False)
    uploader_name: Mapped[str | None] = mapped_column(String, nullable=True)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```
Import it in models/__init__.py so Alembic picks it up.

## 5. Pydantic schemas (backend/app/schemas/photo.py)
```python
class PresignRequest(BaseModel):
    mime_type: str  # must be one of: image/jpeg, image/png, image/webp, image/heic
    file_size_bytes: int  # reject if > 20MB (20_971_520 bytes)

class PresignResponse(BaseModel):
    photo_id: str  # a UUID — temporary ID before DB row is created
    upload_url: str
    storage_key: str

class ConfirmUpload(BaseModel):
    storage_key: str
    uploader_name: str | None = None
    original_filename: str
    file_size_bytes: int
    mime_type: str

class PhotoRead(BaseModel):
    id: int
    public_url: str
    uploader_name: str | None
    uploaded_at: datetime
    model_config = ConfigDict(from_attributes=True)
```

## 6. Public endpoints (add to backend/app/api/public.py)

POST /api/photos/presign
  Body: PresignRequest
  Validation:
    - mime_type must be in allowed list: image/jpeg, image/png, image/webp, image/heic
    - file_size_bytes must be <= 20_971_520 (20MB), else raise 400 "File too large"
  Logic:
    - Generate storage_key = f"photos/{uuid4()}.{extension}" where extension is derived from mime_type
    - Call generate_presigned_upload_url(key, mime_type) from r2.py
    - Return PresignResponse (do NOT create a DB row yet — wait for confirm)

POST /api/photos/confirm
  Body: ConfirmUpload
  Logic:
    - Validate that the storage_key starts with "photos/" (prevent path traversal)
    - Create Photo row in DB with:
        public_url = f"{settings.r2_public_url}/{storage_key}"
        is_approved = True (default)
    - After DB commit, broadcast to all WebSocket connections:
        await ws_manager.broadcast({"type": "photo_added"})
    - Return PhotoRead of the created row

GET /api/photos
  Logic:
    - Query all Photo rows where is_approved = True
    - Order by uploaded_at DESC
    - Return list of PhotoRead

## 7. Admin endpoints (add to backend/app/api/admin.py)

All require get_current_admin dependency (already implemented).

GET /api/admin/photos
  Return all photos (approved and hidden), ordered by uploaded_at DESC
  Include is_approved field in response

PATCH /api/admin/photos/{id}/hide
  Set is_approved = False. Return updated photo.

PATCH /api/admin/photos/{id}/show
  Set is_approved = True. Return updated photo.

DELETE /api/admin/photos/{id}
  1. Fetch photo by id, raise 404 if not found
  2. Call delete_object(photo.storage_key) from r2.py to remove from R2
  3. Delete the DB row
  4. Return 204 No Content

## 8. WebSocket endpoint for photos (add to backend/app/api/public.py)
Same pattern as /ws/seating:
```python
@router.websocket("/ws/photos")
async def photos_websocket(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
```

## 9. Alembic migration
After adding the model, generate a migration:
  alembic revision --autogenerate -m "add photos table"

## Requirements
- mime_type allowlist is strictly enforced — reject anything else with 400
- storage_key prefix validation prevents any path manipulation
- delete_object in R2 must be called before deleting the DB row — if R2 deletion fails, catch the exception, log it, but still delete the DB row (orphaned R2 objects are acceptable, orphaned DB rows are not)
- No existing endpoints modified
```

---

# Phase B — AI Prompt (Frontend)

```
Phase A backend is complete and tested. Now build the frontend photo gallery feature.
Do not modify any existing components or pages except the two edits listed at the end.

## 1. Install dependency
Run: npm install browser-image-compression
Add the type import in the component: import imageCompression from 'browser-image-compression'

## 2. New file: hooks/usePhotoSocket.ts
Identical pattern to the existing useSeatingSocket.ts hook.
Connect to /ws/photos. On message { "type": "photo_added" }, call onUpdate().
Include the same auto-reconnect logic (3 second delay on close).

## 3. New file: components/PhotoUpload.tsx
A modal/bottom-sheet for uploading photos.

Props: { isOpen: boolean, onClose: () => void, onUploaded: (photo: PhotoRead) => void }

State:
  - files: array of { file: File, status: 'pending'|'compressing'|'uploading'|'done'|'error', progress: number, errorMsg?: string }
  - uploaderName: string (optional text input)

UI layout:
  - Modal overlay (fixed inset-0 bg-black/50 z-50) on desktop
  - Slides up from bottom on mobile (translate-y animation, rounded top corners)
  - Header: "Upload your photos 📸" + close X button
  - Uploader name input: placeholder "Your name (optional)"
  - Drop zone: dashed border, "Drop photos here or tap to select"
    accept="image/jpeg,image/png,image/webp,image/heic" multiple
    On file select → add to files array
  - File preview list: thumbnail + filename + progress bar
    Each file shows its status icon: ⏳ pending / 🔄 compressing / ↑ uploading (with %) / ✅ done / ❌ error (with retry)
  - "Upload all" button → triggers the upload pipeline for all pending files
  - "Done" button (appears when all files are done/error) → calls onClose

Upload pipeline per file:
  1. Set status = 'compressing'
     Compress using imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2000, useWebWorker: true })
  2. Set status = 'uploading'
     POST /api/photos/presign with { mime_type: file.type, file_size_bytes: compressed.size }
     On 400 (file too large or bad type) → set status = 'error', errorMsg = response detail
  3. Upload to presign.upload_url via XMLHttpRequest (for progress events):
     xhr.upload.onprogress = (e) => update progress = Math.round(e.loaded / e.total * 100)
     On success (status 200) → proceed
     On failure → set status = 'error', errorMsg = "Upload failed, please retry"
  4. POST /api/photos/confirm with storage_key, uploader_name, original_filename, file_size_bytes, mime_type
  5. Set status = 'done'. Call onUploaded(confirmedPhoto).

Run all files in parallel (Promise.all over the pipeline, not sequential).

## 4. New file: components/PhotoGallery.tsx
Props: none (self-contained, fetches its own data)

Data:
  - photos: PhotoRead[] (fetched from GET /api/photos on mount)
  - isUploadOpen: boolean
  - Use usePhotoSocket({ onUpdate: fetchPhotos }) for live updates
  - fetchPhotos wrapped in useCallback

Layout:
  Section wrapper with id="photos" for nav anchor.
  Title: "Gallery" with subtitle: "Moments from the celebration 📷"
  
  Top bar:
    Left: photo count "42 photos"
    Right: "📸 Add yours" button → sets isUploadOpen = true

  Photo grid:
    CSS columns layout (not flexbox/grid) for true masonry effect:
    columns-2 on mobile, columns-3 on md, gap-2
    Each photo:
      <img> lazy loading, object-cover, rounded, cursor-pointer
      On click → open lightbox

  Lightbox:
    Full screen overlay (fixed inset-0 z-50 bg-black/90)
    Center the current photo (max-h-screen max-w-screen object-contain)
    Top right: close button (X)
    Left/right arrows for prev/next (keyboard ← → also works, add keydown listener)
    Bottom: uploader_name if present ("📸 by Anna Smith") + formatted date

  Loading state: 6 grey pulsing skeleton rectangles in the masonry layout
  Empty state (0 photos): "Be the first to add a photo! 🎉" + upload button centered

## 5. Edit app/page.tsx — two changes only

Change 1 — Import:
  Add: import PhotoGallery from '@/components/PhotoGallery'

Change 2 — Insert after <SeatingChart /> and before <Schedule />:
  <PhotoGallery />

## 6. Edit lib/api.ts — add types and function (do not modify existing)
Add:
  type PhotoRead = { id: number; public_url: string; uploader_name: string | null; uploaded_at: string }
  type PresignResponse = { photo_id: string; upload_url: string; storage_key: string }

  async function presignPhoto(mime_type: string, file_size_bytes: number): Promise<PresignResponse>
  async function confirmPhoto(payload: { storage_key: string; uploader_name?: string; original_filename: string; file_size_bytes: number; mime_type: string }): Promise<PhotoRead>
  async function getPhotos(): Promise<PhotoRead[]>

## 7. Nav bar edit
Add "Photos" anchor link pointing to #photos.
Place it after the Seating link and before the Schedule link.

## Requirements
- browser-image-compression runs in a web worker — do not block the main thread
- XMLHttpRequest is required for per-file progress — do not use fetch for the actual upload
- The lightbox must trap focus and close on Escape key
- PhotoGallery must still work if the WebSocket fails (graceful degrade)
- TypeScript strict — no any
- All new components mobile-first (tested at 375px)
```

---

# Phase C — AI Prompt (Admin Moderation)

```
Phases A and B are complete. Add a photo moderation tab to the admin panel.

## New page: frontend/app/admin/photos/page.tsx

Protected route (same JWT check as other admin pages).

Layout: same sidebar + main content as other admin pages.

Fetch: GET /api/admin/photos (includes is_approved field)

Display: a grid of photo cards (3 columns on desktop, 2 on tablet, 1 on mobile)
  Each card:
    - Photo thumbnail (fixed aspect ratio 4:3, object-cover)
    - Uploader name or "Anonymous"
    - Upload date (formatted: "14 Sep 2025, 18:42")
    - File size (formatted: "2.1 MB")
    - Status badge: green "Visible" or red "Hidden"
    - Two action buttons:
        If visible: "Hide" → PATCH /api/admin/photos/{id}/hide → update local state
        If hidden:  "Show" → PATCH /api/admin/photos/{id}/show → update local state
        Always: "Delete" (red) → confirmation dialog "Delete this photo permanently?" → DELETE /api/admin/photos/{id} → remove from local state

Filter bar above the grid:
  Toggle buttons: "All" | "Visible" | "Hidden"
  Client-side filter — no re-fetch

## Sidebar addition
Add "Photos" link to the admin sidebar nav, between any logical existing entries.

## Requirements
- Optimistic UI: update local state immediately on hide/show, revert on error
- Delete is NOT optimistic — wait for API confirmation before removing from UI
- Show total counts per filter tab: "All (42)" "Visible (38)" "Hidden (4)"
- No new dependencies
```