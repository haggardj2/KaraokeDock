// Helpers for Admin › Backup & Restore that don't need React.

export type BackupKind = "database" | "settings";

export type BackupFileInfo = { kind: BackupKind; createdAt: string; appVersion: string };

const MAGIC = "KDBACKUP\n";
export const MIN_BACKUP_PASSPHRASE_LENGTH = 10;

// Reads the plaintext header at the start of a .kdbackup file, so the admin can see what a file
// is (and catch a settings file picked for a database restore) before typing the passphrase.
export function parseBackupHeader(bytes: Uint8Array): BackupFileInfo | null {
  const text = new TextDecoder().decode(bytes.subarray(0, 4096));
  if (!text.startsWith(MAGIC)) return null;
  const end = text.indexOf("\n", MAGIC.length);
  if (end < 0) return null;
  try {
    const header = JSON.parse(text.slice(MAGIC.length, end));
    if (header?.format !== "karaokedock-backup" || (header.kind !== "database" && header.kind !== "settings")) return null;
    return { kind: header.kind, createdAt: String(header.createdAt ?? ""), appVersion: String(header.appVersion ?? "") };
  } catch {
    return null;
  }
}

// The restore request carries the passphrase in a header, base64-encoded so any characters work.
export function encodePassphraseHeader(passphrase: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(passphrase)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function passphraseProblem(passphrase: string, confirmation: string): string | null {
  if (passphrase.length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    return `Use a passphrase of at least ${MIN_BACKUP_PASSPHRASE_LENGTH} characters.`;
  }
  if (passphrase !== confirmation) return "The passphrases don't match.";
  return null;
}

export function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}
