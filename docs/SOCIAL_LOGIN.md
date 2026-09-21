# Singer social login: Google and Facebook

Social login is optional and **off by default**. Configure it in **Admin > Singer Social Login**, separately from the host/admin SSO settings.

When enabled, configured providers appear as small service icons below **Continue** in **Who is singing?**. Singers can still enter a guest name instead. Turning social login off removes this section entirely. Turning off **Show Google sign-in** or **Show Facebook sign-in** hides that icon and prevents new logins through that provider; it does not delete existing accounts or history.

## What is stored and restored

KaraokeDock stores a provider-specific account identifier, the singer's name/display name, and their profile-picture URL. It creates a normal singer account, not an administrator account. No email address, contacts, friends, posts, or posting permission is requested. Provider access tokens are used only during sign-in, not retained for later use.

| Provider | Requested scope | Profile information used |
|----------|-----------------|--------------------------|
| Google | `openid profile` | Stable `sub` identifier, name, picture |
| Facebook | `public_profile` | App-scoped ID, name, picture |

Signing in again with the **same provider account on the same KaraokeDock installation** restores the singer's current queue and song history, including on another device. A provider profile name change does not create another singer. Profile pictures flow through the existing singer avatar and crop controls.

Accounts are **not automatically merged by matching names**. A new social account does not claim an existing guest's or another account's queue. If a name is already in use, a distinct singer name is assigned. Google, Facebook, OIDC, and password accounts initially remain separate identities. An administrator can explicitly merge duplicate singer profiles and link their existing logins as described below.

## Link a social login to a password or OIDC account

Use this when social sign-in creates a second singer for someone whose password or OIDC account already exists. Linking is available only in **Admin > User Manager**, not on Host.

Deploy the updated server and run normal database migrations, including `026_account_login_links.sql`. This stores explicit account links and records which credential created a session. Earlier singer-only merges do not automatically grant account privileges.

1. Sign in once with Google or Facebook so the social identity exists.
2. Sign back in as an administrator using your password or OIDC account.
3. In **Admin > User Manager**, select the merge icon beside the password/OIDC account to keep.
4. Search for the social identity by name, username, or provider. Social-only and guest profiles are not top-level User Manager entries; social identities are available in this picker.
5. Confirm the identities belong to the same person and authorize the social login to use the kept account's permissions. Select **Merge and link login**.
6. Sign in again with the social provider. It now authenticates the kept account, including Host/Admin access if that account is an administrator. Linked providers appear beneath the account in User Manager.

This works even if an earlier merge already gave the social and OIDC identities the same singer. No second singer merge is needed in that case. Both accounts must be active; social identities already linked to another account cannot be reassigned through this flow.

When singers differ, the kept singer retains its name and picture settings. Queue and history are combined without deleting repeated performances. Later social logins cannot rename the kept profile or replace its picture with the social provider's picture.

**This explicitly grants account access, not just shared singer data.** Only link identities after confirming ownership, especially when the target is an administrator. No name-based linking or automatic promotion occurs. Existing source social sessions are revoked; a fresh sign-in is required. Disabling the kept account or the social credential blocks that linked sign-in. Deactivate an account with linked credentials instead of deleting it.

The merge cannot be undone automatically. To copy selected historical songs without linking accounts, use history export/import instead; that does not transfer the live queue.

## Before configuring a provider

Upgrade the app and apply its normal database migrations first, including `023_singer_social_login.sql`. The standard container startup runs them automatically. For a Dockerless install, run `npm run migrate` in `src/server` with your usual database configuration before starting the upgraded API.

1. Choose a stable public HTTPS origin for the request page, such as `https://karaoke.example.com`. Set `WEB_APP_URL` to this origin and allow it in `ORIGIN`. Make sure your reverse proxy forwards `/api/` to KaraokeDock and has a valid certificate. Never expose PostgreSQL to make OAuth work.
2. Open KaraokeDock using that exact origin. Browser storage binds each login attempt to its initiating origin and tab. Do not start at a LAN IP and return to a different public hostname.
3. In **Admin > Singer Social Login**, set **Public request-page origin** to that origin, without `/requests`, a query, or a fragment.
4. Create provider credentials as described below. Enter them in Admin, not in browser code, Git, or a public configuration file.

### Public policies for provider setup

KaraokeDock includes public, server-rendered policy pages. They are readable without an account, social sign-in, or JavaScript, even when social login is disabled:

| Provider-console field | Standard deployment URL |
|------------------------|-------------------------|
| Privacy policy | `https://karaoke.example.com/privacy` |
| Terms of service | `https://karaoke.example.com/terms` |
| Facebook data-deletion instructions | `https://karaoke.example.com/privacy#data-deletion` |

Replace the example origin with your own public HTTPS origin. The API server serves these routes, including on the standard combined app deployment. If you host the frontend and API separately, use the public API origin for these URLs or proxy `/privacy` and `/terms` from the public frontend to the API. The request page and Admin link to the configured API's pages.

Set **Public operator / venue name** and **Public privacy / support email** in **Admin > Singer Social Login**, then save. Both values are published on the policy pages; use a monitored public contact address, not a provider client secret. Existing deployments without these fields remain supported, but until configured the pages direct visitors to their host or venue rather than inventing a contact identity.

Review the text in `src/server/src/publicLegal.ts` for your actual legal entity, jurisdiction, event age rules, hosting, sharing, and retention practices, and obtain appropriate legal review before publishing or submitting to a provider. These general terms do not by themselves guarantee legal compliance or provider approval. Update the effective date when revising the policies. Keep the pages publicly reachable through your proxy or access-control service, and register the published URLs in Google Auth Platform and Meta's app settings.

The normal single-origin callback URLs are:

```text
Google:   https://karaoke.example.com/api/auth/social/google/callback
Facebook: https://karaoke.example.com/api/auth/social/facebook/callback
```

If the API runs on a separate public origin, use that origin for the callback URLs, but keep **Public request-page origin** pointed at the web app. The browser's API configuration must point to the same API deployment.

Both the provider console and KaraokeDock must use the **exact same callback URL**, including scheme, hostname, port, path, and trailing slash. Do not use the admin SSO callback `/api/auth/oidc/callback`.

HTTP is supported only for localhost development, for example a web origin of `http://localhost:5173` with callbacks at `http://localhost:5174/api/auth/social/google/callback`. Provider rules still apply; use a public HTTPS development domain if Facebook rejects a localhost callback. Plain HTTP LAN addresses do not support the browser cryptography required by this flow.

## Google

1. Open the [Google Cloud Console](https://console.developers.google.com/auth/overview). Create or select a project, then open **Google Auth Platform**.
2. Configure **Branding** with your app name, support contact, homepage, privacy policy, and authorized domain as required by Google.
3. Configure **Audience**. For general karaoke guests, choose an external audience. While the app is in Testing, add the Google accounts you will use as test users. Publish when ready for other singers; complete any verification Google requests.
4. Under **Data Access**, use only `openid` and `https://www.googleapis.com/auth/userinfo.profile` (the `profile` scope). KaraokeDock intentionally does not request `email`, Google Drive, or other API access.
5. Under **Clients**, create an OAuth client with application type **Web application**. Add `https://karaoke.example.com/api/auth/social/google/callback` under **Authorized redirect URIs**. This is a server-side authorization-code flow; it does not require a browser client secret or a Google JavaScript SDK.
6. Copy the **Client ID** and **Client secret** into the Google fields in **Admin > Singer Social Login**. Enter the matching **OAuth callback URL**.
7. Select **Show Google sign-in**, enable social login globally, and click **Save social login settings**.
8. Open the request page in a signed-out browser. Select the Google icon, consent, and confirm that the singer name and picture appear. Add a song, sign out through the profile menu, and sign in with the same Google account in another browser to confirm the queue/history follows the account.

Google sign-in uses the supported OpenID Connect library with state, nonce, and PKCE. Credentials remain on the API server.

## Facebook

1. Open [Meta for Developers > My Apps](https://developers.facebook.com/apps/) and create an app. Choose the **Authenticate and request data from users with Facebook Login** use case. Use consumer Facebook Login, not a business-management integration.
2. Under the app's **Basic settings**, configure its name, contact email, app domain, website URL, privacy-policy URL, and user-data-deletion instructions as required by Meta.
3. Customize the Facebook Login use case. Keep **public_profile**; do not add `email`, friends, photos, posts, or other optional permissions. KaraokeDock requests only `id`, `name`, and `picture` from the profile API.
4. Open the Facebook Login **Settings** (older dashboards place this under **Products > Facebook Login**). Enable **Client OAuth Login** and **Web OAuth Login**. Add the exact `https://karaoke.example.com/api/auth/social/facebook/callback` URL to **Valid OAuth Redirect URIs**.
5. Copy the **App ID** and **App secret** from the app dashboard into the Facebook fields in **Admin > Singer Social Login**. Enter the matching callback URL.
6. Select **Show Facebook sign-in**, enable social login globally, and click **Save social login settings**.
7. While the Meta app is in development, test with an account assigned an appropriate role on the app. Before inviting ordinary singers, complete the dashboard's publishing and access requirements, including increased access to `public_profile`, business verification, or App Review if requested for your app. Publish/go live.
8. Sign in from the request page with the Facebook icon. Confirm the name and picture appear, then sign out and back in with the same account to confirm queue/history restoration.

The implementation uses Graph API **v25.0** and Facebook's server-side authorization-code flow. The `/me` request includes `appsecret_proof`. Facebook IDs are app-scoped: changing to a different Meta app can create new singer identities instead of restoring the old ones. Keep the same app when rotating its secret.

### Privacy and data-deletion instructions

The public `/privacy` page describes profile collection, public karaoke displays, browser storage, retention, provider revocation, and manual deletion requests. Its `/privacy#data-deletion` section supplies the instructions URL for Meta. Configure the operator's public contact details and ensure you can carry out the described process before publishing.

KaraokeDock does not expose an automated Facebook data-deletion callback as part of this feature. Use Meta's **data-deletion instructions URL** option rather than inventing a callback URL. Account removal and history erasure are distinct: logging out, hiding a provider, or removing access in Facebook does not erase KaraokeDock history. Deleting a user in User Manager is not a complete history-erasure workflow; an operator must also remove that singer's retained queue/history and profile data under the deployment's retention policy.

## Operation and troubleshooting

| Symptom | What to check |
|---------|---------------|
| No social section | Global enable switch, provider visibility, saved client/app ID, secret, callback URL, and public origin. A provider is not offered until it is configured. Refresh an already-open request page after changing settings. |
| Name prompt still shown for an account | Sign out of guest mode using the profile menu, then select the service used originally. Typing an account's name is not authentication. |
| Google `redirect_uri_mismatch` or Facebook invalid redirect | Compare the provider-console callback and Admin callback character for character. Use the social callback, not the SSO callback. |
| Only developers/testers can sign in | Check Google's audience/test users/publishing status or Meta's app roles, publishing status, and `public_profile` access. |
| Sign-in must finish in the same browser tab | Start and finish in the same tab and on the configured public web origin. Do not switch to an in-app browser halfway through. Browser storage must be available. |
| HTTPS required | Open the HTTPS request-page URL, not an HTTP LAN IP. For local development use localhost. |
| Expired or failed login after restarting the API | Start again. In-progress OAuth attempts and one-time exchanges are short-lived and held in memory; singer accounts, history, and regular sessions are in PostgreSQL. |
| Duplicate profiles or a prior merge still signs in as separate accounts | Use Admin > User Manager to explicitly link the social credential to the password/OIDC account, then sign in again. A singer-only merge does not grant account permissions. |
| Picture is missing | A provider may not supply a usable picture. The avatar falls back to initials. Sign in again to refresh provider profile information. |

Secrets are masked when loaded in Admin. Leaving a secret field unchanged keeps it; entering a replacement rotates it. Save, then start a fresh sign-in. Protect the database and backups because provider client/app secrets are server-side settings. Never paste secrets or callback query strings into bug reports.

Social login is for the main KaraokeDock request page. It is not enabled in **Station mode** or implemented on the separate **Gateway** request UI. A deployment with multiple API workers needs requests for an in-progress login to stay on the same worker, because the temporary OAuth state and exchange stores are in memory.

## Provider references and icons

- [Google OpenID Connect and OAuth setup](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google sign-in branding guidelines and pre-approved assets](https://developers.google.com/identity/branding-guidelines)
- [Facebook Login use case setup](https://developers.facebook.com/documentation/development/create-an-app/facebook-login-use-case)
- [Facebook manual login flow](https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow)
- [Facebook permissions](https://developers.facebook.com/docs/permissions/)

The Google button uses the unmodified light, pill, icon-only PNG from Google's [pre-approved sign-in assets](https://developers.google.com/static/identity/images/signin-assets.zip). The Facebook icon path is from [Simple Icons](https://github.com/simple-icons/simple-icons/blob/develop/icons/facebook.svg), released under [CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Provider names and logos remain the trademarks of their respective owners; follow their branding rules.
