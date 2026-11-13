import MaterialIcon from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

// Break music folders and saved playlists folder.
export default function BreakMusicSection({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    path,
    busy,
    breakFolders,
    setShowAddBreakFolderModal,
    breakPlaylistsFolder,
    setBreakPlaylistsFolder,
    activeSection,
    resetBreakFolderForm,
    deleteBreakFolder,
    scanBreakMusic,
    clearBreakMusicDb,
    handleBreakPlaylistsFolderChange,
    openBreakPlaylistsBrowser,
  } = admin;

  return (
    <>
            {activeSection === "break" && (
              <>
            {/* Break Music Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="music_note" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Break Music</h2>
              </div>

              <div className="card-content">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="btn-icon primary"
                      onClick={() => scanBreakMusic()}
                      disabled={busy}
                      title="Scan all break music folders"
                    >
                      <MaterialIcon name="search" />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={clearBreakMusicDb}
                      disabled={busy}
                      title="Clear break music tracks from database"
                    >
                      <MaterialIcon name="cleaning_services" />
                    </button>
                  </div>
                  <button
                    className="btn-icon primary"
                    onClick={() => {
                      resetBreakFolderForm();
                      setShowAddBreakFolderModal(true);
                    }}
                    disabled={!auth.sessionToken || !auth.isLoggedIn}
                    title="Add break music folder"
                    aria-label="Add break music folder"
                  >
                    <MaterialIcon name="add" />
                  </button>
                </div>

                <div style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="save" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Saved Playlists Folder</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      value={breakPlaylistsFolder}
                      onChange={(e) => setBreakPlaylistsFolder(e.target.value)}
                      placeholder="/media/playlists"
                    />
                    <button
                      className="btn-icon"
                      onClick={openBreakPlaylistsBrowser}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      title="Browse playlist folders"
                    >
                      <MaterialIcon name="folder" />
                    </button>
                    <button
                      className="btn-icon primary"
                      onClick={handleBreakPlaylistsFolderChange}
                      disabled={busy || !breakPlaylistsFolder.trim()}
                      title="Save playlists folder"
                    >
                      <MaterialIcon name="save" />
                    </button>
                  </div>
                </div>

                {breakFolders.length > 0 ? (
                  <div className="library-list">
                    {breakFolders.map((f) => (
                      <div key={f.id} className="library-item">
                        <div className="library-header">
                          <div className="library-info">
                            <div className="library-name">{f.name}</div>
                            <div className="library-path"><MaterialIcon name="folder" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />{f.path}</div>
                          </div>
                          <div className="library-actions">
                            <button
                              className="btn-icon primary"
                              onClick={() => scanBreakMusic(f.id)}
                              disabled={busy}
                              title="Scan this folder"
                            >
                              <MaterialIcon name="search" />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() => deleteBreakFolder(f.id)}
                              disabled={busy}
                              title="Remove folder"
                            >
                              <MaterialIcon name="delete" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MaterialIcon name="music_note" className="empty-icon" />
                    <div className="empty-text">No break music folders configured</div>
                  </div>
                )}
              </div>
            </div>
              </>
            )}
    </>
  );
}
