import React from "react";
import MaterialIcon from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

// Pick the folder yt-dlp downloads into.
export default function DownloadFolderBrowserDialog({ admin }: { admin: AdminState }) {
  const {
    name,
    path,
    currentBrowsePath,
    folderContents,
    browseError,
    showDownloadBrowser,
    setShowDownloadBrowser,
    browseFolders,
    navigateUp,
    selectDownloadFolder,
  } = admin;

  return (
    <>
            {/* Download Location Folder Browser Modal */}
            {showDownloadBrowser && (
              <>
                <div
                  className="modal-backdrop"
                  onClick={() => setShowDownloadBrowser(false)}
                />
                <div className="modal">
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="folder" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Select Download Folder</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowDownloadBrowser(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      <MaterialIcon name="close" />
                    </button>
                  </div>

                  <div className="browser-path">
                    <MaterialIcon name="location_on" />
                    <div className="breadcrumb">
                      <span
                        className="breadcrumb-part"
                        onClick={() => browseFolders("/")}
                      >
                        /
                      </span>
                      {currentBrowsePath
                        .split("/")
                        .filter(Boolean)
                        .map((part, idx, arr) => {
                          const partPath = "/" + arr.slice(0, idx + 1).join("/");
                          return (
                            <React.Fragment key={idx}>
                              <span className="breadcrumb-sep">/</span>
                              <span
                                className="breadcrumb-part"
                                onClick={() => browseFolders(partPath)}
                              >
                                {part}
                              </span>
                            </React.Fragment>
                          );
                        })}
                    </div>
                  </div>

                  {browseError && (
                    <div className="error-msg"><MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />{browseError}</div>
                  )}

                  <div className="browser-container">
                    {currentBrowsePath !== "/" && (
                      <div className="folder-item" onClick={navigateUp}>
                        <MaterialIcon name="arrow_upward" className="folder-icon" />
                        <span className="folder-name">..</span>
                        <span style={{ opacity: 0.5, fontSize: 13 }}>(parent directory)</span>
                      </div>
                    )}

                    {folderContents
                      .filter((item) => item.isDirectory)
                      .map((item) => (
                        <div
                          key={item.path}
                          className="folder-item"
                          onClick={() => browseFolders(item.path)}
                        >
                          <MaterialIcon name="folder" className="folder-icon" />
                          <span className="folder-name">{item.name}</span>
                        </div>
                      ))}

                    {folderContents.filter((item) => item.isDirectory).length ===
                      0 &&
                      !browseError && (
                        <div className="empty-state" style={{ padding: 40 }}>
                          <MaterialIcon name="folder_open" className="empty-icon" style={{ fontSize: 48 }} />
                          <div className="empty-text" style={{ fontSize: 14 }}>No subfolders in this directory</div>
                        </div>
                      )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <input
                      className="form-input"
                      value={currentBrowsePath}
                      readOnly
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn success"
                      onClick={() => selectDownloadFolder(currentBrowsePath)}
                    >
                      <MaterialIcon name="check" /> Select This Folder
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => setShowDownloadBrowser(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
    </>
  );
}
