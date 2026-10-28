import { useState, type FormEvent } from "react";
import { API_BASE } from "../../api";
import { useAuth } from "../../auth-context";
import MaterialIcon from "../../components/MaterialIcon";
import SnapshotsCard from "./SnapshotsCard";
import {
  encodePassphraseHeader,
  filenameFromDisposition,
  MIN_BACKUP_PASSPHRASE_LENGTH,
  parseBackupHeader,
  passphraseProblem,
  type BackupFileInfo,
  type BackupKind,
} from "./backupFile";

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Fall back to the status text.
  }
  return response.statusText || `HTTP ${response.status}`;
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const CARDS: Record<BackupKind, { title: string; icon: string; contents: string; restoreNote: string; confirm: string }> = {
  database: {
    title: "Database",
    icon: "database",
    contents: "Everything: the song library, singers and their history, the queue, rotations, break music, users and all settings, plus uploaded images (profile pictures and player backgrounds).",
    restoreNote: "Restoring replaces all current data with the backup and signs everyone out.",
    confirm: "Replace ALL KaraokeDock data with this backup?\n\nCurrent singers, queue, history, users and settings will be overwritten, and everyone will be signed out. This cannot be undone.",
  },
  settings: {
    title: "Settings",
    icon: "tune",
    contents: "All Admin and Host settings, including sign-in and Gateway secrets. Singers, songs and users are not included.",
    restoreNote: "Restoring overwrites the settings in the backup; settings that aren't in it are left as they are.",
    confirm: "Overwrite the current settings with the ones in this backup?",
  },
};

function BackupCard({ kind, sessionToken, onDatabaseRestored }: {
  kind: BackupKind;
  sessionToken: string;
  onDatabaseRestored: () => void;
}) {
  const card = CARDS[kind];
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<BackupFileInfo | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fileProblem = file && !fileInfo
    ? "This isn't a KaraokeDock backup file."
    : fileInfo && fileInfo.kind !== kind
      ? `This is a ${fileInfo.kind} backup. Restore it from the ${CARDS[fileInfo.kind].title} card.`
      : "";

  async function backUp(event: FormEvent) {
    event.preventDefault();
    const problem = passphraseProblem(passphrase, confirmation);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy("backup");
    setError("");
    setStatus("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/backup/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-token": sessionToken },
        body: JSON.stringify({ passphrase }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const blob = await response.blob();
      const name = filenameFromDisposition(response.headers.get("content-disposition"), `karaokedock-${kind}.kdbackup`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPassphrase("");
      setConfirmation("");
      setStatus(`Downloaded ${name}. Keep the passphrase somewhere safe: without it this backup can't be restored.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backup failed.");
    } finally {
      setBusy(null);
    }
  }

  async function chooseFile(next: File | null) {
    setFile(next);
    setFileInfo(null);
    setError("");
    setStatus("");
    if (next) setFileInfo(parseBackupHeader(new Uint8Array(await next.slice(0, 4096).arrayBuffer())));
  }

  async function restore(event: FormEvent) {
    event.preventDefault();
    if (!file || !fileInfo || fileProblem) return;
    if (restorePassphrase.length < MIN_BACKUP_PASSPHRASE_LENGTH) {
      setError(`Enter the passphrase used for this backup (at least ${MIN_BACKUP_PASSPHRASE_LENGTH} characters).`);
      return;
    }
    if (!window.confirm(card.confirm)) return;
    setBusy("restore");
    setError("");
    setStatus("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/restore/${kind}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-session-token": sessionToken,
          "x-backup-passphrase": encodePassphraseHeader(restorePassphrase),
        },
        body: file,
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setRestorePassphrase("");
      if (kind === "database") {
        window.alert("Database restored. Everyone has been signed out, so sign in again with an account from the backup.");
        onDatabaseRestored();
        return;
      }
      const result = await response.json();
      setStatus(`Restored ${result.settings} settings from the backup made ${formatCreatedAt(fileInfo.createdAt)}. Reload the page to see them.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }

  const id = (name: string) => `backup-${kind}-${name}`;

  return (
    <div className="card backup-card">
      <div className="card-header">
        <h2>
          <MaterialIcon name={card.icon} style={{ fontSize: 24, verticalAlign: "text-bottom", marginRight: 8 }} />
          {card.title}
        </h2>
      </div>
      <div className="card-content">
        <p className="backup-help">{card.contents}</p>
        {error && <div className="error-msg" role="alert">{error}</div>}
        {status && <div className="banner success" role="status">{status}</div>}

        <form className="backup-form" onSubmit={backUp}>
          <h3>Back up</h3>
          <div className="form-group">
            <label className="form-label" htmlFor={id("passphrase")}>Passphrase</label>
            <input id={id("passphrase")} className="form-input" type="password" autoComplete="new-password"
              value={passphrase} onChange={(e) => setPassphrase(e.target.value)} disabled={busy !== null}
              aria-describedby={id("passphrase-help")} />
            <p id={id("passphrase-help")} className="backup-help">
              The backup is encrypted with this passphrase (at least {MIN_BACKUP_PASSPHRASE_LENGTH} characters). It isn't stored anywhere and can't be recovered.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={id("confirm")}>Confirm passphrase</label>
            <input id={id("confirm")} className="form-input" type="password" autoComplete="new-password"
              value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={busy !== null} />
          </div>
          <button className="btn primary" type="submit" disabled={busy !== null}>
            <MaterialIcon name="download" />
            {busy === "backup" ? "Creating backup…" : `Download ${card.title.toLowerCase()} backup`}
          </button>
        </form>

        <form className="backup-form" onSubmit={restore}>
          <h3>Restore</h3>
          <p className="backup-help">{card.restoreNote}</p>
          <div className="form-group">
            <label className="form-label" htmlFor={id("file")}>Backup file</label>
            <input id={id("file")} className="form-input" type="file" accept=".kdbackup"
              onChange={(e) => void chooseFile(e.target.files?.[0] ?? null)} disabled={busy !== null} />
            {fileProblem
              ? <p className="backup-file-info is-problem" role="alert">{fileProblem}</p>
              : fileInfo && (
                <p className="backup-file-info" role="status">
                  {CARDS[fileInfo.kind].title} backup made {formatCreatedAt(fileInfo.createdAt)}
                  {fileInfo.appVersion && ` with KaraokeDock ${fileInfo.appVersion}`}
                </p>
              )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={id("restore-passphrase")}>Passphrase</label>
            <input id={id("restore-passphrase")} className="form-input" type="password" autoComplete="off"
              value={restorePassphrase} onChange={(e) => setRestorePassphrase(e.target.value)} disabled={busy !== null} />
          </div>
          <button className={`btn ${kind === "database" ? "danger" : ""}`} type="submit"
            disabled={busy !== null || !fileInfo || Boolean(fileProblem)}>
            <MaterialIcon name="restore" />
            {busy === "restore" ? "Restoring…" : `Restore ${card.title.toLowerCase()}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// Admin › Backup & Restore: encrypted backups of the whole database (with images) or just settings,
// and automatic snapshots kept on the server.
export default function BackupSection({ sessionToken }: { sessionToken: string }) {
  const auth = useAuth();
  return (
    <>
      <BackupCard kind="database" sessionToken={sessionToken} onDatabaseRestored={() => void auth.handleLogout()} />
      <SnapshotsCard sessionToken={sessionToken} onDatabaseRestored={() => void auth.handleLogout()} />
      <BackupCard kind="settings" sessionToken={sessionToken} onDatabaseRestored={() => void auth.handleLogout()} />
    </>
  );
}
