## Photo Comparative Plugin (MVP Pièces)

Autonomous web plugin to be embedded in Bubble via iframe. Implements piece selection, reference photo overlay (ghost) with opacity slider, camera capture, review, and event protocol with Bubble.

### Build/Run

- Serve the `PLUGIN PHOTO` folder over HTTPS to allow `getUserMedia`.
- Example local dev: use `npx http-server -S -C cert.pem -K key.pem "PLUGIN PHOTO"` or any static hosting with TLS.
- Entry point: `index.html`.

Quick test locally with a JSON file:

- Place your `source.json` at the project root or within `PLUGIN PHOTO/`.
- Open `index.html` with `?data_file=../source.json` (adjust the relative path) or simply use the built-in loader on the empty screen to select `source.json`.

### Iframe URL

`https://photo-plugin.checkeasy.app/?rapport_id=...&logement_id=...&token=...[&data_url=...]`

- **token**: optional JWT/HMAC from Bubble
- **data_url**: optional signed public URL where the JSON is hosted (Option A). If omitted, send JSON via postMessage after `photo.ready`.

### Data Shape

The plugin expects the following JSON:

```json
{
  "logement_id": "…",
  "rapport_id": "…",
  "pieces": [
    {
      "piece_id": "…",
      "nom": "🛏️ Chambre",
      "commentaire_ia": "",
      "checkin_pictures": [
        { "piece_id": "…", "url": "…" },
        { "piece_id": "…", "url": "…" }
      ],
      "etapes": []
    }
  ]
}
```

Validation rules (MVP):

- `pieces` is non-empty
- each piece has `piece_id`, `nom`, `checkin_pictures` non-empty with valid http(s) `url`
- pieces without `checkin_pictures` are disabled in the UI

### Messaging Protocol (postMessage)

All messages use `{ type: string, payload?: object }`. The plugin records the first `origin` it receives and ignores others.

Plugin → Bubble:

- `photo.ready` — plugin is ready to receive data
- `photo.data.request` — emitted if no data yet shortly after ready
- `photo.piece.selected` — `{ piece_id }`
- `photo.capture.preview` — `{ piece_id, temp_id }`
- `photo.capture.confirmed` — `{ piece_id, capture_id, taken_at, data_url?, blob_ref?, meta }`
- `photo.error` — `{ code, message, context? }`

Bubble → Plugin:

- `photo.data.provide` — `{ json }` (full data structure)
- `photo.open.piece` — `{ piece_id }` (open a given piece)
- `photo.auth.update` — `{ token }` (update token)

### UX Flow

- Home grid lists pieces with availability; open navigates to compare
- Compare shows live camera with reference overlay (ghost) and opacity slider; toggles for 3x3 grid and horizon line
- Capture takes a photo and shows side-by-side review (reference vs new)
- Confirm emits `photo.capture.confirmed` including data URL (Option A)

### Camera & Capture

- Requests: `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }}})`
- Capture: canvas `toBlob('image/jpeg', 0.85)`; returns `data_url` on confirm

### Error Codes

- `CAMERA_DENIED` — user denied camera or device unavailable
- `REF_LOAD_FAILED` — failed to load data or reference
- `CAPTURE_FAILED` — canvas or blob error

Each error also triggers a user toast.

### Bubble Integration Example

```html
<iframe id="photo" src="https://photo-plugin.checkeasy.app/?rapport_id=R123&logement_id=L456&token=XYZ" allow="camera; microphone" style="width:100%;height:90vh;border:0;"></iframe>
<script>
const frame = document.getElementById('photo');
const origin = new URL(frame.src).origin;

window.addEventListener('message', (event) => {
  if (event.origin !== origin) return;
  const { type, payload } = event.data || {};
  switch (type) {
    case 'photo.ready': {
      // Provide JSON via postMessage (Option B delivery)
      frame.contentWindow.postMessage({ type: 'photo.data.provide', payload: { json: window.myJson } }, origin);
      break;
    }
    case 'photo.capture.confirmed': {
      // Upload payload.data_url to Bubble/S3, then persist URL
      console.log('Confirmed capture', payload);
      break;
    }
    case 'photo.error': {
      console.warn('Plugin error', payload);
      break;
    }
  }
});
</script>
```

For data via URL, host the JSON at a signed HTTPS URL and include `&data_url=...` in the iframe `src`.


