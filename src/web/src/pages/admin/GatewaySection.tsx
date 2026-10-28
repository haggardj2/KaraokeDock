import MaterialIcon from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

// Remote request gateway connection and sync.
export default function GatewaySection({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    stationMode,
    remoteGatewayEnabled,
    setRemoteGatewayEnabled,
    remoteGatewayUrl,
    setRemoteGatewayUrl,
    remoteGatewayToken,
    setRemoteGatewayToken,
    remoteGatewayPollInterval,
    setRemoteGatewayPollInterval,
    remoteGatewayBusy,
    remoteGatewayStatus,
    activeSection,
    generateRemoteGatewayToken,
    saveRemoteGatewaySettings,
    copyRemoteGatewayToken,
    testRemoteGatewayConnection,
    syncRemoteGatewayNow,
  } = admin;

  return (
    <>
            {activeSection === "gateway" && (
              <>
            {/* Remote Requests Gateway Card */}
            {stationMode && (
              <div className="card">
                <div className="card-header">
                  <h2><MaterialIcon name="cloud_sync" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Remote Requests Gateway</h2>
                </div>
                <div className="card-content">
                  <p style={{ margin: "0 0 16px", color: "var(--color-text-muted)", fontSize: 14 }}>
                    Configure the public Remote Requests Gateway that will mirror the Station catalog and forward singer requests back to this local Station.
                  </p>
                  <div className="form-group">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={remoteGatewayEnabled}
                        onChange={(e) => setRemoteGatewayEnabled(e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span className="form-label" style={{ margin: 0 }}>Enable Remote Requests Gateway</span>
                    </label>
                    <p style={{ margin: "6px 0 0 26px", color: "var(--color-text-muted)", fontSize: 13 }}>
                      When enabled, Station request links and the QR code point to the Gateway URL instead of the local Requests page.
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gateway URL</label>
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://requests.example.com"
                      value={remoteGatewayUrl}
                      onChange={(e) => setRemoteGatewayUrl(e.target.value)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Auto-sync Poll Interval (seconds)</label>
                    <input
                      className="form-input"
                      type="number"
                      min={2}
                      step={1}
                      value={remoteGatewayPollInterval}
                      onChange={(e) => setRemoteGatewayPollInterval(Number(e.target.value))}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                    />
                    <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 13 }}>
                      Station polls the Gateway for new requests and refreshes My Queue automatically at this interval.
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Station API Token</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Generate a token for Station/Gateway API auth"
                        value={remoteGatewayToken}
                        onChange={(e) => setRemoteGatewayToken(e.target.value)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        className="btn"
                        type="button"
                        onClick={generateRemoteGatewayToken}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                      >
                        Generate
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={copyRemoteGatewayToken}
                        disabled={!auth.sessionToken || !auth.isLoggedIn || !remoteGatewayToken}
                      >
                        Copy
                      </button>
                    </div>
                    <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: 13 }}>
                      Use this shared token on the Gateway to authenticate catalog sync and request bridge API calls.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      className="btn primary"
                      type="button"
                      onClick={saveRemoteGatewaySettings}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || remoteGatewayBusy}
                    >
                      Save Gateway Settings
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={testRemoteGatewayConnection}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || remoteGatewayBusy}
                    >
                      {remoteGatewayBusy ? "Working..." : "Test Connection"}
                    </button>
                    <button
                      className="btn success"
                      type="button"
                      onClick={syncRemoteGatewayNow}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || remoteGatewayBusy}
                    >
                      Sync Now
                    </button>
                  </div>
                  {remoteGatewayStatus && (
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      background: "var(--color-bg-secondary)",
                      color: remoteGatewayStatus.ok === false ? "var(--color-danger)" : "var(--color-text-secondary)",
                      fontSize: 13,
                    }}>
                      {remoteGatewayStatus.ok === false ? (
                        <div><strong>Gateway error:</strong> {remoteGatewayStatus.error}</div>
                      ) : (
                        <div style={{ display: "grid", gap: 4 }}>
                          <div><strong>Gateway connected:</strong> {remoteGatewayStatus.gatewayUrl}</div>
                          <div><strong>Gateway catalog:</strong> {remoteGatewayStatus.status?.tracks ?? 0} tracks</div>
                          <div><strong>Pending requests:</strong> {remoteGatewayStatus.status?.pendingRequests ?? 0}</div>
                          {remoteGatewayStatus.catalog && (
                            <div><strong>Last sync:</strong> {remoteGatewayStatus.catalog.accepted ?? 0} tracks accepted, {remoteGatewayStatus.pulledRequests?.queued ?? 0} requests queued, {remoteGatewayStatus.queueActions?.applied ?? 0} queue actions applied, {remoteGatewayStatus.queue?.accepted ?? 0} queue items pushed</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
              </>
            )}
    </>
  );
}
