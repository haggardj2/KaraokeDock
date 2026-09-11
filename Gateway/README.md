# KaraokeDock Remote Requests Gateway

Small public-facing request gateway for KaraokeDock Station. It can run on a VPS or in Docker, keeps a local SQLite copy of the Station catalog for fast public searches, accepts singer requests, and exposes token-protected Station sync endpoints.

Station polls the Gateway automatically once configured. The poll loop pulls new singer requests, applies singer queue edits, and refreshes the Gateway copy of "My Queue" without requiring an Admin-page manual sync.

## Run locally

```bash
npm install
cp .env.example .env
STATION_API_TOKEN=your-station-token npm run dev
```

The requests page is served at `http://localhost:5180`.

## Docker

```bash
docker build -t karaokedock-gateway ./Gateway
docker run -d \
  --name karaokedock-gateway \
  -p 5180:5180 \
  -v karaokedock-gateway-data:/data \
  -e STATION_API_TOKEN=your-station-token \
  -e JSON_BODY_LIMIT=50mb \
  -e PUBLIC_BASE_URL=https://requests.example.com \
  karaokedock-gateway
```

## Station integration contract

All Station endpoints require either:

```http
Authorization: Bearer <STATION_API_TOKEN>
```

or:

```http
X-Station-Token: <STATION_API_TOKEN>
```

### Catalog sync

`PUT /api/station/catalog`

```json
{
  "full": true,
  "syncId": "station-generated-sync-id",
  "chunkIndex": 0,
  "chunkCount": 1,
  "complete": true,
  "tracks": [
    {
      "id": 123,
      "title": "Amber",
      "artist": "311",
      "discId": "CC2112-063",
      "kind": "cdgmp3",
      "durationMs": 192000,
      "source": "local"
    }
  ]
}
```

Large Station libraries may be sent in multiple chunks with the same `syncId`. The Gateway prunes tracks missing from the Station catalog only when the final chunk has been received.

### Settings sync

`PUT /api/station/settings`

```json
{
  "settings": {
    "libraries.local_enabled": true,
    "libraries.external_enabled": true,
    "requests.acceptance": "local",
    "requests.local_browse_enabled": true
  }
}
```

The Gateway enforces these Station rules for public search and request submission.

### Pull pending singer requests

`GET /api/station/requests/pending?limit=50`

### Acknowledge a request after Station queues or rejects it

`POST /api/station/requests/:id/ack`

```json
{ "status": "queued", "stationQueueId": 456 }
```

or:

```json
{ "status": "rejected", "error": "Track no longer exists" }
```

### Push current queue snapshot for "My Queue"

`PUT /api/station/queue/snapshot`

```json
{
  "full": true,
  "queue": [
    {
      "stationQueueId": 456,
      "stationTrackId": 123,
      "requestedBy": "Alex",
      "singerUuid": "browser-generated-uuid",
      "status": "queued",
      "position": 4,
      "keyAdjustment": 0,
      "title": "Amber",
      "artist": "311"
    }
  ]
}
```

### Pull pending singer queue actions

`GET /api/station/queue-actions/pending?limit=50`

Actions are created when singers reorder or remove their own queued songs on the Gateway.

### Acknowledge a queue action

`POST /api/station/queue-actions/:id/ack`

```json
{ "status": "applied" }
```

or:

```json
{ "status": "rejected", "error": "Queue item is no longer queued" }
```

## Public API

- `GET /api/search?q=amber`
- `POST /api/requests`
- `GET /api/my-queue?name=Alex&singerUuid=<uuid>`
- `PATCH /api/my-queue/reorder`
- `DELETE /api/my-queue/:id`
- `GET /api/requests/:id`

## Singer profiles and history

The round avatar opens a menu with **Manage History**, **Manage Profile Picture**,
**Edit Name**, and **Logout**. Manage History contains the `.kd` import/export
controls. Profile pictures use a draggable circular Croppie viewport and zoom
control; only **Save Crop** writes changes. **Cancel** discards image selection,
crop, and staged removal. Uploads are resized in the browser to at most 1600 pixels
on their longest side and 2 MiB before saving (JPEG, or PNG retaining transparency).

- `GET /api/singers/self/profile?name=Alex+L&singerUuid=<uuid>`
- `POST /api/singers/self/profile/image?name=Alex+L&singerUuid=<uuid>` — raw PNG,
  JPEG, WebP, or GIF, at most 2 MiB. Replacing an image resets crop and legacy focus.
- `PATCH /api/singers/self/profile/focus` — JSON body with `name`, `singerUuid`,
  optional `focusX`/`focusY`, and optional `crop`.
- `DELETE /api/singers/self/profile/image?name=Alex+L&singerUuid=<uuid>` — clears
  image and crop, retaining a timestamped tombstone for Station synchronization.
- `GET /api/history/self/export` and `POST /api/history/self/import` include profile
  images and crop metadata in version 2 `.kd` files.
- `GET /api/station/singer-profiles` and
  `GET /api/station/singer-profiles/:singerUuid` provide profiles and tombstones
  with image data for token-authenticated Station synchronization. The list accepts
  `updatedAfter`, `afterSingerUuid`, and `limit` (maximum 10).

`profile.crop` is optional `{ "x": 10, "y": 20, "width": 50, "height": 60 }`,
where each value is a percentage of the original image's natural dimensions.
Coordinates must be nonnegative, dimensions positive, and the rectangle must
remain within the image. Invalid rectangles return HTTP 400. Omitted crop on a
focus PATCH retains the previous rectangle; explicit `crop: null` is rejected.
Uploads and image removal reset the rectangle. Legacy
`focusX`/`focusY` remain supported. Croppie's natural-pixel `get().points` are
converted to these percentages; existing provider images never use canvas output.
Imported OIDC images retain valid HTTPS URLs (at most 2048 characters, without
credentials); invalid URLs are rejected rather than silently clearing the image.

Croppie is pinned in npm and served locally at `/vendor/croppie/`. `npm run build`
and `npm run dev` generate a local JS copy preserving the upstream license.
The small, checked build patch makes Croppie 2.6.5 honor `enableCrossOrigin: false`
(upstream otherwise forces anonymous CORS). The editor disables canvas and EXIF
processing, so provider images without CORS headers can still be positioned.
No CDN or image proxy is used.
