import MaterialIcon from "../../components/MaterialIcon";
import { Stats } from "./shared";
import type { AdminState } from "./useAdmin";

// Statistics and shortcuts to every section.
export default function OverviewSection({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    busy,
    stats,
    activeSection,
    setActiveSection,
    refreshStats,
    visibleSections,
    scanAll,
    clearDb,
  } = admin;

  return (
    <>
            {activeSection === "overview" && (
              <>
            {/* Stats Card */}
            <div className="card">
              <h2 style={{ margin: "0 0 20px", fontSize: 20 }}><MaterialIcon name="bar_chart" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />System Statistics</h2>
              <div className="stats-grid">
                <div className="stat-pill">
                  <MaterialIcon name="mic_external_on" className="stat-icon" />
                  <span className="stat-value">{stats?.artists ??  "—"}</span>
                  <span className="stat-label">Artists</span>
                </div>
                <div className="stat-pill">
                  <MaterialIcon name="music_note" className="stat-icon" />
                  <span className="stat-value">{stats?.tracks ?? "—"}</span>
                  <span className="stat-label">Tracks</span>
                </div>
                <div className="stat-pill">
                  <MaterialIcon name="queue_music" className="stat-icon" />
                  <span className="stat-value">{stats?.queued ?? "—"}</span>
                  <span className="stat-label">Queued</span>
                </div>
                <div className="stat-pill">
                  <MaterialIcon name="schedule" className="stat-icon" />
                  <span className="stat-value" style={{ fontSize: 14 }}>
                    {stats?.lastScan?. finishedAt
                      ? new Date(stats.lastScan. finishedAt).toLocaleDateString()
                      : "Never"}
                  </span>
                  <span className="stat-label">Last Scan</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
                <button
                  className="btn-icon primary"
                  onClick={scanAll}
                  disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                  title="Scan all libraries"
                  aria-label="Scan all libraries"
                >
                  <MaterialIcon name="search" />
                </button>
                <button
                  className="btn-icon danger"
                  onClick={clearDb}
                  disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                  title="Clear database"
                  aria-label="Clear database"
                >
                  <MaterialIcon name="delete" />
                </button>
                <button
                  className="btn-icon"
                  onClick={refreshStats}
                  disabled={! auth.sessionToken || !auth.isLoggedIn}
                  title="Refresh stats"
                  aria-label="Refresh stats"
                >
                  <MaterialIcon name="refresh" />
                </button>
              </div>
            </div>
            <div className="admin-section-tiles">
              {visibleSections.filter((section) => section.id !== "overview").map((section) => (
                <button key={section.id} type="button" className="admin-section-tile" onClick={() => setActiveSection(section.id)}>
                  <MaterialIcon name={section.icon} className="admin-section-tile-icon" />
                  <span className="admin-section-tile-text">
                    <strong>{section.label}</strong>
                    <span>{section.description}</span>
                  </span>
                  <MaterialIcon name="chevron_right" className="admin-section-tile-chevron" />
                </button>
              ))}
            </div>
              </>
            )}
    </>
  );
}
