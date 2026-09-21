import type { SocialConfig } from './socialAuthConfig.js';

export type LegalPage = 'privacy' | 'terms';
type LegalContact = Pick<SocialConfig, 'operatorName' | 'contactEmail' | 'frontendUrl'>;

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

function contactDetails(contact: LegalContact): string {
  const operator = contact.operatorName
    ? `<strong>${escapeHtml(contact.operatorName)}</strong>`
    : 'the karaoke host or venue that provided this service';
  return `<p>This KaraokeDock installation is operated by ${operator}, referred to as "we", "us", or "the operator".
    KaraokeDock is self-hosted software; its software contributors are not automatically the operator of this installation.</p>
    ${contact.contactEmail
      ? `<p>For privacy requests or questions about these terms, email <a href="mailto:${escapeHtml(encodeURIComponent(contact.contactEmail))}">${escapeHtml(contact.contactEmail)}</a>.</p>`
      : '<p>For privacy requests or questions about these terms, contact your karaoke host or venue using the contact channel on your event invitation or venue website. Ask for the operator of this KaraokeDock installation.</p>'}`;
}

function privacyPolicy(contact: LegalContact): string {
  return `
    <section id="operator"><h2>1. Who is responsible</h2>${contactDetails(contact)}
      <p>This policy describes the singer request service on this installation, including optional Google and Facebook sign-in.
      The providers' own services and any separately operated venue websites have their own privacy policies.</p></section>

    <section id="information"><h2>2. Information we access and store</h2>
      <ul>
        <li><strong>Guest profiles:</strong> the name you enter, a generated singer identifier, and any profile picture or crop settings you provide.</li>
        <li><strong>Social sign-in:</strong> your name/display name, profile-picture URL, and a stable provider account identifier that links your account to your singer profile.
        Google sign-in requests <code>openid profile</code>; Facebook sign-in requests <code>public_profile</code> and reads the ID, name, and picture fields.
        We do not request your email address, contacts, friends list, posts, birthday, or permission to publish on your behalf.
        A provider may include additional basic profile fields in an authentication response; this integration does not retain those additional fields.</li>
        <li><strong>Karaoke activity:</strong> songs requested, queue order and status, song history, timestamps, key adjustments, and information you import or submit to manage your requests.</li>
        <li><strong>Account and security information:</strong> internal account identifiers, login sessions, and short-lived sign-in state.
        We do not receive your Google or Facebook password. Provider access tokens are used during sign-in and are not retained for later access.</li>
        <li><strong>Technical information:</strong> IP addresses, request paths and times, and diagnostic or security logs.
        Hosting services, reverse proxies, and third-party services may also process browser and network information supplied with requests.</li>
        <li><strong>Communications:</strong> information you choose to send the operator when asking for support or exercising your privacy rights.</li>
      </ul></section>

    <section id="use"><h2>3. Why we use information</h2>
      <p>We use this information to identify singers, show names and avatars, organize requests and performances, prevent abuse,
      maintain the service, and restore your queue and history when you sign in again.
      Returning social accounts are matched by provider account identifier, not by a shared display name.</p>
      <p>Social sign-in is optional. You may use a guest name instead, but guest access does not provide the same account-based recovery.
      We do not sell social profile information or use it for targeted advertising, unrelated profiling, or training generalized AI models.</p>
      <p>Where applicable law requires a legal basis, we process information as needed to provide the requested service,
      for legitimate interests in operating and securing it, to meet legal obligations, or with consent where required.
      Optional provider authorization can be withdrawn as described below.</p></section>

    <section id="visibility"><h2>4. Visibility and sharing</h2>
      <p><strong>This is a social karaoke service, not a private diary.</strong> Your singer name, avatar, song requests,
      queue position, and performance history may be visible to the host, other visitors, and viewers of venue or player displays.
      Some singer and history views are publicly accessible. Only submit information you are comfortable sharing in this context.
      Hosts and administrators can manage singers, queues, and history, including exports.</p>
      <p>An administrator can explicitly link a social login to a password or OIDC account in User Manager after confirming they belong to the same person.
      The linked login can access the combined profile, queue, and history and receives the kept account's permissions, including administrator access when explicitly authorized.
      Earlier singer-only merges do not automatically grant these account permissions.
      Profiles and login accounts are not automatically merged based on matching names or sign-in providers.</p>
      <p>Information may be processed by the operator's hosting and infrastructure providers as necessary to run the service,
      or disclosed where legally required or reasonably necessary to protect people, rights, or the service.
      If a remote gateway is enabled, singer and queue information may be synchronized with that gateway.</p>
      <p>Google or Facebook receives authentication requests when you select its sign-in option. Loading provider-hosted avatars,
      web fonts, or external media can send your IP address and browser information to the corresponding service.
      Features such as YouTube playback or online song search may connect to other services under their own policies.
      The built-in social sign-in feature does not send your karaoke history to Google or Facebook as part of logging in.</p>
      <p>Provider policies: <a href="https://policies.google.com/privacy" rel="noreferrer">Google Privacy Policy</a> and
      <a href="https://www.facebook.com/privacy/policy/" rel="noreferrer">Meta Privacy Policy</a>.</p></section>

    <section id="storage"><h2>5. Browser storage and session information</h2>
      <p>KaraokeDock uses local browser storage to remember your singer name, identifier, profile information, preferences, and login session.
      It uses tab-local session storage for a temporary sign-in proof. These are functional mechanisms, not advertising trackers.
      Google, Facebook, and embedded third-party services may use their own cookies or similar technologies under their policies.</p>
      <p>Logging out clears the app's active browser login; your provider may remain signed in separately.
      You can also clear this site's browser data. Doing so does not erase records already stored on the server.</p></section>

    <section id="retention"><h2>6. Retention and security</h2>
      <p>Singer accounts, profiles, requests, and history are stored in the operator's database so they can be restored later.
      They do not automatically disappear at the end of an event or when you log out. The app has no fixed automatic deletion period
      for singer history; ask the operator about this installation's retention and backup practices.</p>
      <p>Regular login sessions are issued for up to 30 days. Pending social sign-in state expires after 10 minutes,
      and one-time sign-in exchange codes after 2 minutes; expired temporary entries are periodically removed.
      Operator logs and backups may have different retention periods. Information may be retained where required by law,
      to resolve disputes, or to protect the service; backup copies may remain until removed under the operator's backup schedule.</p>
      <p>We use access controls and other reasonable safeguards, but no internet service or storage system is completely secure.
      Use the HTTPS version of this service and log out on shared devices. Hosting and provider processing may occur outside
      your country; contact the operator for details about hosting locations and applicable safeguards.</p></section>

    <section id="choices"><h2>7. Your choices and rights</h2>
      <p>You can choose guest access, edit your singer name, manage supported picture settings, and export your history using
      the profile menu where available. Provider-managed pictures can refresh when their selected account signs in;
      merged profiles retain a consistent picture source.
      Depending on your location, you may have rights to access, correct, delete, or receive a copy of your information,
      restrict or object to certain processing, withdraw consent, or complain to a privacy regulator.
      Contact the operator to exercise these rights; reasonable verification may be needed.</p>
      <p>You can remove this app's authorization in
      <a href="https://myaccount.google.com/connections" rel="noreferrer">Google account connections</a> or
      <a href="https://www.facebook.com/settings?tab=applications" rel="noreferrer">Facebook Apps and Websites</a>.
      Revoking provider access, logging out, or hiding a sign-in option does not automatically delete KaraokeDock records
      or necessarily end an already-issued KaraokeDock session.</p></section>

    <section id="data-deletion"><h2>8. How to request deletion of your data</h2>
      <p>You do not need to sign in or grant social access to read these instructions or request deletion.</p>
      <ol>
        <li>Contact the operator identified in <a href="#operator">section 1</a> and state that you are requesting deletion of your KaraokeDock data.</li>
        <li>Identify the installation or event, your singer name, and whether you used Google, Facebook, or guest access.
        Include only the information reasonably needed to identify your records. <strong>Do not send passwords, access tokens, or login codes.</strong></li>
        <li>The operator may ask you to verify that the records belong to you. Request deletion of the linked account,
        profile picture, current requests, history, and active sessions, and ask for confirmation when handled.</li>
      </ol>
      <p>Requests are handled by the operator, not by an automatic Facebook deletion callback. The operator will respond in
      accordance with applicable law and explain any information that must be retained and why.
      Backups may require separate removal under the operator's retention practices.
      Deleting an account in User Manager alone is not the same as erasing the associated singer and history.
      A later social sign-in can create a new account after deletion.</p></section>

    <section id="children"><h2>9. Children</h2>
      <p>This service is not intended for children under 13, or anyone below a higher minimum age required by local law or
      their sign-in provider. Venue age restrictions also apply. If you believe a child has provided personal information
      improperly, contact the operator so it can be investigated and addressed.</p></section>

    <section id="changes"><h2>10. Changes to this policy</h2>
      <p>We may update this policy as the service or legal requirements change and will revise the date shown above.
      Material changes will be brought to users' attention as required by law. New uses of provider data requiring additional
      permission will not be introduced without the required notice and authorization.</p></section>`;
}

function termsOfService(contact: LegalContact): string {
  return `
    <section id="operator"><h2>1. About this service and these terms</h2>${contactDetails(contact)}
      <p>These Terms of Service govern your use of this installation's karaoke request, singer profile, queue, history,
      and optional social sign-in features. By using the service, you agree to these terms. If you do not agree, do not use it.
      The <a href="/privacy">Privacy Policy</a> explains how personal information is handled.</p></section>

    <section id="eligibility"><h2>2. Eligibility and your account</h2>
      <p>You must be at least 13 and meet any higher age or other eligibility requirement imposed by local law, your sign-in
      provider, or the venue. If you have not reached the legal age of majority, use the service only with permission from a
      parent or legal guardian where required. You must have authority to agree to these terms.</p>
      <p>Use only accounts you are authorized to use. Do not impersonate another singer or attempt to claim another person's
      queue or history. Protect your devices and login credentials, log out of shared devices, and report suspected unauthorized
      access to the operator. Guest names are not verified identities and do not offer the same recovery as a linked account.</p></section>

    <section id="social"><h2>3. Google and Facebook sign-in</h2>
      <p>Social sign-in is optional and may be disabled by the operator. Selecting a provider authorizes it to share the basic
      profile information described in the Privacy Policy so the service can identify you and restore your singer account.
      It does not give KaraokeDock your provider password or permission to post on your behalf.</p>
      <p>Google and Facebook are independent services, not sponsors or operators of this installation. Their terms and policies
      govern use of their services. Your access can be affected by provider outages, account changes, revoked authorization,
      or changes to the operator's configuration. Matching display names do not merge accounts, and accounts from different
      providers are not automatically linked.</p></section>

    <section id="conduct"><h2>4. Acceptable use</h2>
      <p>Use the service lawfully and respectfully. Do not:</p>
      <ul>
        <li>Harass, threaten, abuse, or discriminate against other people, or submit unlawful or privacy-invasive material.</li>
        <li>Upload images or other material you lack permission to use, infringe intellectual-property rights, or misrepresent your identity.</li>
        <li>Spam requests, manipulate another singer's queue, bypass access controls or restrictions, interfere with operation, or distribute malicious code.</li>
        <li>Collect other people's profile or activity information for unsolicited marketing, surveillance, or other unauthorized purposes.</li>
      </ul>
      <p>Follow reasonable event rules and host instructions. The host may reject, remove, or reorder requests, change a display
      name, restrict access, or end a session to run the event safely and fairly.</p></section>

    <section id="content"><h2>5. Your submissions and music rights</h2>
      <p>You remain responsible for names, pictures, requests, imports, and other material you submit, and for having the rights
      needed to provide them. You retain any ownership rights you have in your submissions. You grant the operator a limited,
      non-exclusive permission to store, display, copy, and process those submissions as needed to provide, secure, and administer
      the karaoke service, consistent with the Privacy Policy. This does not authorize unrelated advertising use.</p>
      <p>Music, recordings, videos, lyrics, provider logos, and other third-party material belong to their respective rights
      holders. Access to this software does not grant a license to reproduce, download, distribute, or publicly perform music.
      Operators and venues are responsible for obtaining the permissions required for their media and performances.</p></section>

    <section id="availability"><h2>6. Requests, history, and availability</h2>
      <p>A request is not a guarantee that a song will be available or performed, or that you will sing at a particular time.
      Queue order, available media, event duration, and performance decisions remain subject to host control.</p>
      <p>We may maintain, change, suspend, or discontinue features. Network issues, software faults, provider changes, or
      administrative action may affect access or cause loss of saved information. Export important history where that feature
      is available; the service is not a guaranteed archival or backup service.</p></section>

    <section id="termination"><h2>7. Ending access and requesting deletion</h2>
      <p>You may stop using the service at any time. The operator may restrict or end access for violations of these terms,
      safety or security concerns, legal requirements, or the end of an event or service. Where appropriate and required by law,
      the operator will provide notice or an opportunity to address the issue.</p>
      <p>Logging out, revoking Google or Facebook access, or losing access to an event does not automatically erase server records.
      Follow the <a href="/privacy#data-deletion">data-deletion instructions</a> to request removal of account and singer data.</p></section>

    <section id="disclaimer"><h2>8. Disclaimers and responsibility</h2>
      <p>To the extent permitted by applicable law, the service is provided "as is" and "as available", without a promise of
      uninterrupted availability, error-free operation, or fitness for a particular purpose.</p>
      <p>To the extent permitted by applicable law, the operator is not liable for indirect or consequential losses arising
      from use of or inability to use the service. Nothing in these terms excludes liability that cannot lawfully be excluded,
      or removes mandatory consumer rights, privacy rights, or other non-waivable protections.
      These terms do not limit liability for fraud, willful misconduct, or other conduct where such a limit is prohibited.</p></section>

    <section id="changes"><h2>9. Changes, applicable law, and contact</h2>
      <p>We may update these terms and will revise the date above. Material changes will be communicated as required by law.
      If you do not accept updated terms, stop using the service. Changes do not override rights you already have under mandatory law.</p>
      <p>Applicable law and mandatory protections in your jurisdiction continue to apply. No exclusive court, mandatory arbitration
      process, or waiver of statutory rights is imposed by this page. If a provision is unenforceable, the remaining provisions
      apply to the extent permitted by law. Contact the operator identified in <a href="#operator">section 1</a> with questions or concerns.</p></section>`;
}

export function renderPublicLegalPage(page: LegalPage, contact: LegalContact): string {
  const title = page === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const home = escapeHtml(`${contact.frontendUrl || ''}/`);
  const iconBase = escapeHtml(contact.frontendUrl || '');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="KaraokeDock ${title}: singer accounts, social login, and karaoke requests.">
  <title>${title} - KaraokeDock</title>
  <link rel="icon" type="image/x-icon" sizes="any" href="${iconBase}/favicon.ico">
  <link rel="icon" type="image/png" sizes="16x16" href="${iconBase}/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="${iconBase}/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="${iconBase}/favicon-48x48.png">
  <link rel="apple-touch-icon" sizes="180x180" href="${iconBase}/apple-touch-icon.png">
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, sans-serif; line-height: 1.65; }
    body { margin: 0; background: #101019; color: #ededf4; }
    .page { box-sizing: border-box; width: min(860px, 100%); margin: auto; padding: 24px; }
    nav { display: flex; gap: 12px 24px; flex-wrap: wrap; padding: 12px 0; }
    a { color: #b7baff; text-underline-offset: 3px; overflow-wrap: anywhere; }
    a:focus-visible { outline: 3px solid #b7baff; outline-offset: 4px; }
    h1 { font-size: clamp(2rem, 6vw, 3rem); line-height: 1.2; }
    h2 { font-size: 1.35rem; line-height: 1.4; }
    section { margin: 32px 0; scroll-margin-top: 20px; }
    li { margin: 10px 0; }
    .date, footer { color: #b9b9c9; }
    footer { margin-top: 40px; border-top: 1px solid #414151; padding-top: 16px; }
    code { overflow-wrap: anywhere; }
    @media print { body { background: white; color: black; } a { color: black; } .date, footer { color: #333; } }
  </style>
</head>
<body>
  <div class="page">
    <a href="#content">Skip to policy content</a>
    <nav aria-label="Public pages">
      <a href="${home}">KaraokeDock requests</a>
      <a href="/privacy"${page === 'privacy' ? ' aria-current="page"' : ''}>Privacy Policy</a>
      <a href="/terms"${page === 'terms' ? ' aria-current="page"' : ''}>Terms of Service</a>
      <a href="/privacy#data-deletion">Data deletion</a>
    </nav>
    <main id="content">
      <h1>${title}</h1>
      <p class="date">Effective date: <time datetime="2026-09-14">September 14, 2026</time></p>
      ${page === 'privacy' ? privacyPolicy(contact) : termsOfService(contact)}
    </main>
    <footer>These public pages can be read without an account, social sign-in, or JavaScript.</footer>
  </div>
</body>
</html>`;
}
