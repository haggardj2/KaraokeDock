# Singer identity and profile API

Apply `migrations/021_singer_identity_and_crop.sql` through the normal deployment
migration process before starting this server version. No live migration is
performed by the application. It adds `users.singer_id`, the nullable JSONB
`singers.profile_image_crop`, and an internal `profile_image_admin_override` flag.
Existing unambiguous username/display-name singer matches are linked, legacy
name-only queue rows attached, and existing OIDC pictures synchronized. Singer
merges retain the user link; merging two account-owned singers returns 409.

## Queue requests

Both `POST /api/queue` (existing `trackId`) and
`POST /api/karaoke-nerds/add` (existing `title`, `url`, optional artist/brand fields)
accept:

```json
{
  "requestAsHost": true,
  "singerId": "123",
  "requestedBy": "Selected singer",
  "singerUuid": "b31327c2-ef24-4bf3-9558-9b27113247d3"
}
```

- Every manual Host enqueue sends `requestAsHost: true`.
- Send `singerId` only when an existing singer was selected. It must be a
  positive decimal **string**, not a JSON number. The selected row's name/identity
  wins over `requestedBy` and `singerUuid`; missing rows return 404.
- Without `singerId`, Host mode uses a nonblank `requestedBy` and optional
  `singerUuid` to resolve/create that manual singer, never the host. The name
  remains optional: omitted, null, or blank names enqueue anonymously, never
  as the authenticated host. Other non-string names return 400.
- Either Host mode or an explicit `singerId` requires a valid admin
  `x-session-token`. Session role and the current active user's role are checked;
  unauthorized targeting returns 403. Malformed fields return 400.
- Ordinary authenticated requests use their persistent authenticated singer,
  ignoring supplied name/UUID, even if `requestedBy` is omitted. Guest requests
  use the guest recovery rules below. Invalid provided tokens are rejected, not downgraded
  to guest requests. Identity/rotation failures never enqueue anonymously.

## Guest identity recovery and self endpoints

Guest UUIDs are **public identifiers, not secrets or authentication credentials**.
The original name-only guest system remains supported:

- An existing supplied UUID is authoritative. Profile reads, history operations,
  and ordinary enqueues return/use that singer's canonical name; a stale supplied
  name never renames the singer or accesses another known identity.
- An unknown or missing UUID may recover an existing guest by normalized name
  (trimmed, collapsed whitespace, case-insensitive). Recovery returns the row's
  existing UUID and name, without reassigning any UUID or merging singers.
- If neither UUID nor name matches, a new named guest is created. Self endpoints
  require a valid supplied UUID to **create** that new profile; a missing UUID may
  only recover an existing name. Legacy name-only enqueues can create guests with
  a server-generated UUID. A malformed supplied UUID returns 400.
- Every guest path checks `users.singer_id` linkage, including inactive accounts.
  Account-linked singers return 403 with a sign-in/different-guest-name message
  whether matched by UUID or name. Knowing an account's public UUID does not
  authorize guest profile edits, imports, or self-history exports.
- `POST /api/singers/self/name` with `{ name, singerUuid }` explicitly renames an
  existing UUID-owned guest and its active queue names. A name belonging to
  another singer returns 409; it is not an alias or merge. With an unknown UUID,
  a matching guest name instead adopts that existing canonical identity/name.
- Valid authenticated self calls use the persistent `users.singer_id` link and
  ignore guest UUIDs. Authenticated `POST /api/singers/self/name` needs only
  `{ name }`; it updates the account display name, linked singer, and active queue
  names while retaining the singer ID and UUID. Name collisions return 409.

Self profile GET/image upload/focus/delete responses contain
`{ singerId, singerUuid, displayName, canUpload, profile }`. Guest clients should
persist the returned `singerUuid` and canonical `displayName`; authenticated
clients should not replace their saved guest identity with account identifiers.
Missing profiles and persistence failures are explicit errors, not null successes.

Self `.kd` export/import uses the same resolved singer as profile operations,
even before a client receives a recovered UUID. Export for a brand-new named
guest returns a valid version-2 file with an empty song list. Self imports cannot
retarget another singer using UUID/name metadata inside the file. Legacy
name-only history rows may be included for a guest, but rows already owned by a
different singer are never included merely because their request names match.

Host admin manual/selected-singer targeting remains separate and can target
account-linked singers; blank manual names remain anonymous. Trusted remote
Gateway requests retain strict UUID matching rather than recovering a distinct
remote UUID by local name. Public avatars and public Host/queue/history views
remain public; the self-account boundary is not a claim that those are private.

## Crop metadata

`PATCH /api/singers/self/profile/focus` and admin-only
`PATCH /api/singers/:id/profile/focus` accept optional legacy `focusX`, `focusY`
and:

```json
{ "crop": { "x": 10, "y": 20, "width": 70, "height": 60 } }
```

All four values are finite numbers in percentages of the **original natural
image dimensions**: top-left (`x`,`y`) and viewport rectangle (`width`,`height`).
`0 <= x,y < 100`, `0 < width,height <= 100`, and each origin plus extent must
not exceed 100 (tolerance 0.0001 percentage points). Invalid/missing members,
strings, and explicit `crop: null` return 400. Omit crop to retain it; omitted
focus coordinates retain their previous values.

Responses expose optional `profile.crop`; absent crops are omitted, not null.
Queue singers, history, archived singers, overlay singers, and `.kd` exports/imports
carry it alongside legacy focus coordinates. Imports reject invalid crop
metadata, support metadata-only crop updates, and preserve administrator image,
clear, and crop overrides. OIDC self-history imports may update crop but cannot
replace the provider-managed image.

Uploads, clears, and provider image URL/source changes reset crop. Unchanged
provider images retain it. Original upload bytes and provider image URLs remain
unchanged when cropping. No image downloads, canvas operations, or provider-image
server fetches are used. OIDC login can obtain missing profile claims from
subject-validated UserInfo; UserInfo failures propagate rather than silently
dropping the avatar.
