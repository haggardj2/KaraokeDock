import MaterialIcon from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

// Add a break music folder.
export default function AddBreakFolderDialog({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    busy,
    breakFolderName,
    setBreakFolderName,
    breakFolderPath,
    setBreakFolderPath,
    showAddBreakFolderModal,
    closeAddBreakFolderModal,
    addBreakFolder,
    openBreakLibraryBrowser,
  } = admin;

  return (
    <>
            {showAddBreakFolderModal && (
              <>
                <div className="modal-backdrop" onClick={closeAddBreakFolderModal} />
                <div className="modal" style={{ maxWidth: 560 }}>
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="music_note" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Add Break Music Folder</h3>
                    <button className="btn ghost" onClick={closeAddBreakFolderModal} style={{ padding: '4px 12px' }}><MaterialIcon name="close" /></button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Folder Name</label>
                    <input
                      className="form-input"
                      placeholder="e.g., Lobby Music"
                      value={breakFolderName}
                      onChange={(e) => setBreakFolderName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Break Music Folder Path</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-input"
                        placeholder="e.g., /media/break-music"
                        value={breakFolderPath}
                        onChange={(e) => setBreakFolderPath(e.target.value)}
                      />
                      <button
                        className="btn-icon"
                        onClick={openBreakLibraryBrowser}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        title="Browse folders"
                        aria-label="Browse break music folders"
                      >
                        <MaterialIcon name="folder" />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn primary"
                      onClick={addBreakFolder}
                      disabled={busy || !breakFolderName.trim() || !breakFolderPath.trim()}
                    >
                      <MaterialIcon name="add" /> Add Folder
                    </button>
                    <button className="btn ghost" onClick={closeAddBreakFolderModal}>
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
    </>
  );
}
