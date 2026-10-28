import MaterialIcon from "../../components/MaterialIcon";
import { LIBRARY_PARSE_MODE_OPTIONS } from "./shared";
import type { AdminState } from "./useAdmin";

// Karaoke media library folders.
export default function LibrariesSection({ admin }: { admin: AdminState }) {
  const {
    auth,
    libs,
    name,
    path,
    setShowAddLibraryModal,
    busy,
    activeSection,
    resetLibraryForm,
    deleteLibrary,
    scanOne,
  } = admin;

  return (
    <>
            {activeSection === "libraries" && (
              <>
            {/* Media Libraries Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="library_music" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />Media Libraries</h2>
              </div>
              
              <div className="card-content">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-icon primary"
                    title="Add media library"
                    aria-label="Add media library"
                    onClick={() => {
                      resetLibraryForm();
                      setShowAddLibraryModal(true);
                    }}
                    disabled={!auth.sessionToken || !auth.isLoggedIn}
                  >
                    <MaterialIcon name="add" />
                  </button>
                </div>

              {/* Libraries List */}
              {libs.length > 0 ? (
                <div className="library-list">
                  {libs.map((l, index) => (
                    <div key={l.id} className="library-item" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="library-header">
                        <div className="library-info">
                          <div className="library-name">{l.name}</div>
                          <div className="library-path"><MaterialIcon name="folder" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />{l.path}</div>
                          <div className="library-path">
                            <MaterialIcon name="sell" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />{LIBRARY_PARSE_MODE_OPTIONS.find((option) => option.value === l.parseMode)?.label ?? l.parseMode}
                          </div>
                        </div>
                        <div className="library-actions">
                          <button
                            className="btn-icon primary"
                            onClick={() => scanOne(l.id)}
                            disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                            title="Scan this library"
                          >
                            <MaterialIcon name="search" />
                          </button>
                          <button
                            className="btn-icon danger"
                            onClick={() => deleteLibrary(l.id)}
                            disabled={busy || !auth.sessionToken || !auth.isLoggedIn}
                            title="Remove library"
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
                  <MaterialIcon name="folder" className="empty-icon" />
                  <div className="empty-text">No libraries configured yet</div>
                  <div className="empty-subtext">Use the add button to create your first media library</div>
                </div>
              )}
              </div>
            </div>
              </>
            )}
    </>
  );
}
