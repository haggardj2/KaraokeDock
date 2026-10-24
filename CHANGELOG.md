# Changelog

### Breaking changes

#### Brotli runtime security (CVE-2026-111497)

- Node container stages are pinned to patched release 26.12.1 for the main
  app/web images and the Gateway.
- Gateway moves from Node.js 22 to 26.12.1 in both dependency/build and runtime
  stages. Its native `better-sqlite3` dependency is compiled with Python, make,
  and a C++ compiler in the build stage. Development dependencies are pruned
  before copying to the runtime image, which contains no compiler toolchain.
- API and Gateway startup now reject runtimes without a recognized Brotli fix
  before loading application modules. This protects both incoming compressed
  bodies and outgoing HTTP response decompression without disabling gzip,
  deflate, or Brotli support on patched runtimes.
- Supported host Node.js lines start at 22.23.4, 24.22.1, and 26.12.1.
  These security releases backport the fix without updating the Brotli version
  string. The runtime check recognizes the new permanent block-switch error
  constant as well as patched upstream Brotli versions.
- Station checks Electron's embedded runtime before starting services or
  opening browser windows, and before development/packaging commands.
  As of 2026-10-24, Electron 45.0.0 is the latest stable release and still
  contains affected Brotli 1.2.0. **Station is blocked until a patched Electron
  is available**, rather than shipping a vulnerable desktop runtime.

Rebuild and redeploy containers from these sources; existing images and
AppImages are not updated automatically. For docker-less installs, upgrade
the Node.js binary used by the service and restart it. Do not rely on an npm
dependency update or system Node.js update to patch an existing AppImage.
When changing Node.js major versions for a local Gateway install, run `npm ci`
in `Gateway` before restarting to rebuild its native SQLite dependency.
See the [Gateway setup instructions](Gateway/README.md#run-locally) for build
tool requirements.

Sources: [Node.js security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases),
[CVE record](https://www.cve.org/CVERecord?id=CVE-2026-111497),
[Electron release versions](https://releases.electronjs.org/releases.json).

Regression checks: `node --test dev/runtime-security.test.mjs`.

#### OIDC sign-in now requires group membership

OIDC accounts must belong to at least one of these exact, case-sensitive groups:

| Provider group | Application role | Access |
| --- | --- | --- |
| `karaokedock_admin` | Admin | All Host controls and the Admin page |
| `karaokedock_user` | User | All Host controls; no Admin access |

- The provider must return a `groups` claim in the ID token or subject-validated
  UserInfo response. Admin takes precedence when both groups are present.
- Roles are assigned at account creation and synchronized on every OIDC login.
  The previous default SSO role setting no longer determines access.
- Sign-in without either group is rejected. Existing sessions are revoked and
  the account's role is reduced to User, but the account is not disabled.
- Group membership is checked during OIDC login, not continuously. Local
  administrative account disabling remains authoritative.
- Managed local User accounts now have full Host access. Standalone social
  singer accounts remain request-page-only unless explicitly linked to a
  managed account.

**Migration before upgrading:**

1. Keep a working local administrator login available.
2. Create or assign the appropriate groups in your identity provider and
   configure the application's claim mapping, for example
   `"groups": ["karaokedock_admin"]`.
3. Deploy the updated application and start a fresh SSO sign-in. KaraokeDock
   requests `openid email profile groups` when discovery advertises the
   `groups` scope, including with Pocket ID; otherwise it requests
   `openid email profile` and requires the provider to include the claim.
4. If an account was disabled by an earlier build's missing-group handling,
   re-enable it once through **Admin > User Manager** after deploying the fix.
   Correcting group membership alone does not reactivate a disabled account.

See [OIDC group setup](docs/SOCIAL_LOGIN.md#hostadmin-oidc-group-roles).

**Locked out after upgrading?** Restore local username/password access from the
server terminal:

1. Follow [Reenable Password Login](docs/README.md#reenable-password-login) to
   restore the password sign-in form.
2. If you do not know the administrator credentials or the account is disabled,
   follow [Forgot Login](docs/README.md#forgot-login) to reset administrator
   access. The reset helper activates the account and restores its Admin role,
   but also signs out all existing sessions. It can rename an existing Admin
   account when the requested username does not exist; specify the existing
   administrator username to avoid that.
3. Reload `/admin`, sign in with the local credentials, then correct the OIDC
   group configuration and re-enable affected accounts in **User Manager**.

Re-enabling password login does not reset credentials, and resetting credentials
does not re-enable password login; both steps may be necessary. Replace the
example container name in those instructions with your running app container.

#### Web page routing

- Unknown web page paths now return HTTP 404 rather than the application shell.
  Supported pages are `/`, `/request`, `/host`, `/player`, and `/admin`.
- Legacy `/requests` links redirect permanently to `/request`, preserving query
  parameters. Registered API, media, authentication, legal, and health endpoints
  remain available.

### Added

- Android TV Player wrapper with saved server configuration, remote-control
  navigation, fullscreen playback, and a tablet-compatible build option.
- Separate installable Host and Player PWAs.
- Browser screen wake-lock support on Player, with visible failures and retry.
- Application version information in the Host, Admin, and Request profile menus,
  browser startup console, and server startup logs. Player has no visible
  version label.

### Changed

- Managed Users can add singers, reorder and clear queues, recall singers,
  manage singer history, control playback, configure rotation, and manage
  break music. Administrative configuration remains Admin-only.
- Host uses dedicated, permission-checked settings and download endpoints
  instead of fetching the full Admin settings response.
- Search supports multi-word artist/title matching and prioritizes exact,
  prefix, then partial matches instead of overriding relevance alphabetically.
- Artist and song browse tabs reuse the main query and apply the appropriate
  search field automatically. Redundant field filters are removed, letter
  selection is hidden while searching, and the filter control is an external
  cog icon.
- Local video fills the Player area using cover sizing; mismatched aspect ratios
  can crop edges. The QR code and scroller remain independent overlays.
- Mobile Player sizing follows the visible viewport, with compact controls on
  small screens. Up Next can display the queued singer's picture and saved crop.

### Fixed

- OIDC requests include the advertised `groups` scope so providers such as
  Pocket ID return the membership needed for authorization.
- Missing OIDC groups no longer permanently disable an account.
- Player background image failures are surfaced with retry controls; background
  settings refresh after reconnecting or returning to the foreground.

### Security

- Masked `oidc.client_secret` in Admin settings responses and added cache-control
  protections. OIDC credentials remain stored in database settings.
- Generic settings writes reject `oidc.*` keys; use the dedicated
  `/api/admin/settings/oidc` endpoint.
- Previously exposed OIDC secrets still require rotation at the identity
  provider and replacement through Admin. Response masking does not rotate them.

### Dependencies

- Updated direct npm dependencies and lockfiles across Web, Server, Gateway,
  and Station to current stable releases, including React 19.3.1, TypeScript
  7.0.2, Vite 8.3.5, Vitest 5.0.5, Electron 45.0.0, and better-sqlite3 13.0.3.
- Migrated frontend test compilation and parsing to esbuild and Oxc because
  TypeScript 7 removed the previous JavaScript compiler API.
- Updated Android Gradle Plugin to 9.4.1, the Gradle wrapper to 9.8.2, and
  Robolectric to 4.17. Android builds now use SDK Build Tools 36.0.0; minimum
  Android API 24, target/compile API 35, and the Player version code are unchanged.
