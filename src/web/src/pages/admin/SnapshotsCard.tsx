import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../api";
import MaterialIcon from "../../components/MaterialIcon";

type SnapshotInterval = "hourly" | "6h" | "12h" | "daily" | "weekly";
type SnapshotSettings = { enabled: boolean; interval: SnapshotInterval; retentionDays: number };
type Snapshot = { name: string; createdAt: string; size: number; beforeRestore: boolean };
type SnapshotState = {
  settings: SnapshotSettings;
  directory: string;
  nextRunAt: string | null;
  lastRun: { at: string; ok: boolean; name?: string; error?: string } | null;
  snapshots: Snapshot[];
};

const INTERVAL_LABELS: Record<SnapshotInterval, string> = {
  hourly: "Every hour",
  "6h": "Every 6 hours",
  "12h": "Every 12 hours",
  daily: "Every day",
  weekly: "Every week",
};
const RETENTION_LABELS: Record<number, string> = {
  1: "1 day", 3: "3 days", 7: "1 week", 14: "2 weeks", 30: "30 days", 90: "90 days",
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatDate = (value: string) => new Date(value).toLocaleString();

// Admin › Backup & Restore › Automatic snapshots: schedule, retention, and the list of snapshots
// saved on the server, each restorable in one step.
export default function SnapshotsCard({ sessionToken, onDatabaseRestored }: {
  sessionToken: string;
  onDatabaseRestored: () => void;
}) {
  const [state, setState] = useState<SnapshotState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}/api/admin/snapshots${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-session-token": sessionToken, ...init.headers },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : `HTTP ${response.status}`);
    return body;
  }, [sessionToken]);

  const load = useCallback(async () => {
    try {
      setState(await request(""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load snapshots.");
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label);
    setError("");
    setStatus("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  // Settings save as soon as they change.
  const saveSettings = (change: Partial<SnapshotSettings>) => run("settings", async () => {
    const result = await request("/settings", { method: "PUT", body: JSON.stringify(change) });
    setState((current) => current && { ...current, ...result });
    setStatus(result.settings.enabled ? "Snapshot schedule saved." : "Automatic snapshots turned off.");
  });

  const takeNow = () => run("take", async () => {
    const result = await request("", { method: "POST" });
    await load();
    setStatus(`Saved snapshot from ${formatDate(result.snapshot.createdAt)}.`);
  });

  const restore = (snapshot: Snapshot) => {
    if (!window.confirm(`Restore the snapshot from ${formatDate(snapshot.createdAt)}?\n\nAll current data will be replaced and everyone will be signed out. The current state is saved as a "before restore" snapshot first, so you can undo this.`)) return;
    void run(`restore:${snapshot.name}`, async () => {
      await request(`/${encodeURIComponent(snapshot.name)}/restore`, { method: "POST" });
      window.alert("Snapshot restored. Everyone has been signed out, so sign in again with an account from that snapshot.");
      onDatabaseRestored();
    });
  };

  const remove = (snapshot: Snapshot) => {
    if (!window.confirm(`Delete the snapshot from ${formatDate(snapshot.createdAt)}? This cannot be undone.`)) return;
    void run(`delete:${snapshot.name}`, async () => {
      await request(`/${encodeURIComponent(snapshot.name)}`, { method: "DELETE" });
      await load();
    });
  };

  const settings = state?.settings;
  const disabled = busy !== null || !settings;

  return (
    <div className="card backup-card">
      <div className="card-header">
        <h2>
          <MaterialIcon name="history" style={{ fontSize: 24, verticalAlign: "text-bottom", marginRight: 8 }} />
          Automatic snapshots
        </h2>
      </div>
      <div className="card-content">
        <p className="backup-help">
          Database snapshots (with uploaded images) saved on the server on a schedule. They're encrypted with a key file kept in
          the snapshots folder, so they can be restored here in one step.
        </p>
        {error && <div className="error-msg" role="alert">{error}</div>}
        {status && <div className="banner success" role="status">{status}</div>}

        {!state ? (
          !error && <p role="status">Loading snapshots…</p>
        ) : (
          <>
            <div className="backup-form">
              <label className="snapshot-toggle">
                <input type="checkbox" checked={settings!.enabled} disabled={disabled}
                  onChange={(e) => void saveSettings({ enabled: e.target.checked })} />
                <span>Take snapshots automatically</span>
              </label>
              <div className="snapshot-options">
                <div className="form-group">
                  <label className="form-label" htmlFor="snapshot-interval">How often</label>
                  <select id="snapshot-interval" className="form-input" value={settings!.interval} disabled={disabled}
                    onChange={(e) => void saveSettings({ interval: e.target.value as SnapshotInterval })}>
                    {(Object.keys(INTERVAL_LABELS) as SnapshotInterval[]).map((value) => (
                      <option key={value} value={value}>{INTERVAL_LABELS[value]}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="snapshot-retention">Keep snapshots for</label>
                  <select id="snapshot-retention" className="form-input" value={settings!.retentionDays} disabled={disabled}
                    onChange={(e) => void saveSettings({ retentionDays: Number(e.target.value) })}>
                    {Object.entries(RETENTION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="backup-help">
                {settings!.enabled
                  ? state.nextRunAt ? `Next snapshot ${formatDate(state.nextRunAt)}.` : "Next snapshot is being scheduled."
                  : "Automatic snapshots are off."}{" "}
                Older snapshots are deleted after the period above; the newest one is always kept.
              </p>
              {state.lastRun && !state.lastRun.ok && (
                <div className="error-msg" role="alert">Last automatic snapshot failed ({formatDate(state.lastRun.at)}): {state.lastRun.error}</div>
              )}
              <p className="backup-help">
                Folder: <code>{state.directory}</code>
                {state.directory === "/app/snapshots" && (
                  <> — keep this mapped to a host folder (<code>SNAPSHOTS_PATH</code>, or the Database Snapshots path on Unraid), or snapshots are lost when the container is recreated.</>
                )}
              </p>
              <button className="btn primary" type="button" disabled={disabled} onClick={() => void takeNow()}>
                <MaterialIcon name="add_a_photo" />
                {busy === "take" ? "Taking snapshot…" : "Take snapshot now"}
              </button>
            </div>

            <div className="backup-form">
              <h3>Snapshots</h3>
              {state.snapshots.length === 0 ? (
                <p className="backup-help">No snapshots yet.</p>
              ) : (
                <ul className="snapshot-list">
                  {state.snapshots.map((snapshot) => (
                    <li key={snapshot.name} className="snapshot-row">
                      <div className="snapshot-info">
                        <span className="snapshot-date">{formatDate(snapshot.createdAt)}</span>
                        <span className="snapshot-meta">
                          {formatSize(snapshot.size)}
                          {snapshot.beforeRestore && <span className="snapshot-badge">Before restore</span>}
                        </span>
                      </div>
                      <div className="snapshot-actions">
                        <button className="btn" type="button" disabled={busy !== null} onClick={() => restore(snapshot)}>
                          <MaterialIcon name="restore" />
                          {busy === `restore:${snapshot.name}` ? "Restoring…" : "Restore"}
                        </button>
                        <button className="btn ghost danger-text" type="button" disabled={busy !== null}
                          onClick={() => remove(snapshot)} aria-label={`Delete snapshot from ${formatDate(snapshot.createdAt)}`}>
                          <MaterialIcon name="delete" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
