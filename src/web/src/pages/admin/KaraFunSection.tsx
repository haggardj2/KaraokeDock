import { useEffect, useState } from "react";
import { api } from "../../api";
import MaterialIcon from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

type KarafunStatus =
  | {
      ok: true;
      userLogin: string;
      userId: number;
      plan?: string;
      planCaption?: string;
      isPro: boolean;
      subscriptionEndDate?: string;
    }
  | { ok: false; error: string }
  | null;

type KarafunAdminConfig = {
  enabled: boolean;
  username: string;
  hasPassword: boolean;
  status: KarafunStatus;
};

const EMPTY_CONFIG: KarafunAdminConfig = {
  enabled: false,
  username: "",
  hasPassword: false,
  status: null,
};

export default function KaraFunSection({ admin }: { admin: AdminState }) {
  const { auth, activeSection } = admin;
  const [config, setConfig] = useState<KarafunAdminConfig>(EMPTY_CONFIG);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionHeaders = {
    "x-session-token": auth.sessionToken,
    "Content-Type": "application/json",
  };

  async function load() {
    if (!auth.sessionToken || !auth.isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const data = (await api("/api/admin/karafun", {
        headers: sessionHeaders,
      })) as KarafunAdminConfig;
      setConfig(data);
      setUsername(data.username ?? "");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KaraFun settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection === "karafun") void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, auth.sessionToken, auth.isLoggedIn]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      // Availability is switched in System Settings → Library Availability & Requests.
      const payload: Record<string, unknown> = { username: username.trim() };
      if (password) payload.password = password;
      const data = (await api("/api/admin/karafun", {
        method: "PUT",
        headers: sessionHeaders,
        body: JSON.stringify(payload),
      })) as KarafunAdminConfig;
      setConfig(data);
      setUsername(data.username ?? "");
      setPassword("");
      setMessage("KaraFun settings saved");
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save KaraFun settings");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const status = (await api("/api/admin/karafun/test", {
        method: "POST",
        headers: sessionHeaders,
      })) as KarafunStatus;
      setConfig((current) => ({ ...current, status }));
      if (status?.ok) {
        setMessage(`Connected as ${status.userLogin} (${status.planCaption ?? status.plan ?? "unknown plan"})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "KaraFun connection test failed");
    } finally {
      setTesting(false);
    }
  }

  if (activeSection !== "karafun") return null;

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <MaterialIcon
            name="music_note"
            style={{ fontSize: 24, verticalAlign: "text-bottom", marginRight: 8 }}
          />
          KaraFun Online
        </h2>
      </div>

      <div className="card-content">
        <p style={{ margin: "0 0 16px", color: "var(--color-text-muted)", fontSize: 14 }}>
          Connect a KaraFun subscription account to include its catalog in song search.
          Credentials are hashed with the same scheme as the KaraFun desktop app before
          being stored; the clear password is never saved or returned. KaraFun songs are
          never saved to the media library.
        </p>

        <div className="form-group">
          <span style={{ fontSize: 14 }}>
            KaraFun is currently <strong>{config.enabled ? "available" : "not available"}</strong> on
            the Request page. Turn it on or off in System Settings → Library Availability &amp;
            Requests.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">KaraFun username / e-mail</label>
          <input
            className="form-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            disabled={!auth.sessionToken || !auth.isLoggedIn || saving}
          />
        </div>

        <div className="form-group">
          <label className="form-label">KaraFun password</label>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={config.hasPassword ? "Leave blank to keep the current password" : "Required"}
            autoComplete="new-password"
            disabled={!auth.sessionToken || !auth.isLoggedIn || saving}
          />
          <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 13 }}>
            Only the KaraFun password hash is stored. Enter the password again to change it.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <button className="btn primary" type="button" onClick={save} disabled={saving || !auth.sessionToken}>
            {saving ? "Saving..." : "Save KaraFun settings"}
          </button>
          <button className="btn" type="button" onClick={testConnection} disabled={testing || !auth.sessionToken}>
            {testing ? "Testing..." : "Test connection"}
          </button>
          {loading && <span style={{ alignSelf: "center", color: "var(--color-text-muted)" }}>Loading...</span>}
        </div>

        {message && <div className="banner success">{message}</div>}
        {error && <div className="banner">{error}</div>}

        <div style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          padding: 16,
        }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Connection status</h3>
          {config.status == null ? (
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 14 }}>
              Not tested yet.
            </p>
          ) : config.status.ok ? (
            <div style={{ display: "grid", gap: 4, fontSize: 14 }}>
              <div><strong>Account:</strong> {config.status.userLogin} ({config.status.userId})</div>
              <div><strong>Plan:</strong> {config.status.planCaption ?? config.status.plan ?? "Unknown"}{config.status.isPro ? " · Pro" : ""}</div>
              {config.status.subscriptionEndDate && (
                <div><strong>Subscription ends:</strong> {config.status.subscriptionEndDate}</div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--color-danger)", fontSize: 14 }}>
              {config.status.error}
            </p>
          )}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)", fontSize: 14 }}>
            <div>
              <strong>Playback:</strong> built-in KaraokeDock engine
            </div>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
              No KaraFun application or engine files are required. When a song is
              requested, the server mixes it at the requested key and keeps the mix in
              memory for up to 4 hours. The Player streams that mix and shows KaraFun's
              lyrics and title card over an animated background. A key change made while
              the song is queued is mixed again; a change during the song is not applied.
            </div>
          </div>
        </div>

        <p style={{ margin: "12px 0 0", color: "var(--color-text-muted)", fontSize: 13 }}>
          If the server mix is unavailable, the Player mixes the song in the browser
          instead. That fallback needs Ogg Vorbis support (Chrome, Edge, Firefox and the
          Android Player app; not Safari).
        </p>
      </div>
    </div>
  );
}
