import MaterialIcon from "../../components/MaterialIcon";
import { LibraryParseMode, Library, LIBRARY_PARSE_MODE_OPTIONS } from "./shared";
import type { AdminState } from "./useAdmin";

// Add a karaoke media library.
export default function AddLibraryDialog({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    setName,
    path,
    setPath,
    libraryParseMode,
    setLibraryParseMode,
    showAddLibraryModal,
    busy,
    closeAddLibraryModal,
    addLibrary,
    openBrowser,
  } = admin;

  return (
    <>
            {showAddLibraryModal && (
              <>
                <div className="modal-backdrop" onClick={closeAddLibraryModal} />
                <div className="modal" style={{ maxWidth: 560 }}>
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="library_music" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Add Media Library</h3>
                    <button className="btn ghost" onClick={closeAddLibraryModal} style={{ padding: '4px 12px' }}><MaterialIcon name="close" /></button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Library Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g., Main Collection"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Folder Path</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g., /media/karaoke"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                      />
                      <button
                        className="btn-icon"
                        onClick={openBrowser}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        title="Browse folders"
                        aria-label="Browse library folders"
                      >
                        <MaterialIcon name="folder" />
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filename Parsing</label>
                    <select
                      className="form-input"
                      value={libraryParseMode}
                      onChange={(e) => setLibraryParseMode(e.target.value as LibraryParseMode)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ cursor: 'pointer' }}
                    >
                      {LIBRARY_PARSE_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="library-path" style={{ marginTop: 8 }}>
                      Example: {LIBRARY_PARSE_MODE_OPTIONS.find((option) => option.value === libraryParseMode)?.example}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn primary"
                      onClick={addLibrary}
                      disabled={
                        busy ||
                        !auth.sessionToken ||
                        !auth.isLoggedIn ||
                        !name.trim() ||
                        !path.trim()
                      }
                    >
                      <MaterialIcon name="add" /> Add Library
                    </button>
                    <button className="btn ghost" onClick={closeAddLibraryModal}>
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
    </>
  );
}
