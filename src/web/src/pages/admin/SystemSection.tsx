import { THEMES, type ThemeId } from "../../theme";
import MaterialIcon from "../../components/MaterialIcon";
import { Library } from "./shared";
import type { AdminState } from "./useAdmin";

// Requests, downloads, image uploads, background tasks and logging.
export default function SystemSection({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    busy,
    imageUploadsDir,
    setImageUploadsDir,
    ytdlpVersion,
    ytdlpUpdating,
    downloadLocation,
    setDownloadLocation,
    backgroundTasksEnabled,
    backgroundMediaScanEnabled,
    setBackgroundMediaScanEnabled,
    backgroundDownloadScanEnabled,
    setBackgroundDownloadScanEnabled,
    backgroundBreakMusicScanEnabled,
    setBackgroundBreakMusicScanEnabled,
    requestAcceptance,
    localLibraryEnabled,
    externalLibraryEnabled,
    localBrowseEnabled,
    requestTheme,
    allowDownloads,
    activeSection,
    logLevel,
    updateYtdlp,
    handleDownloadLocationChange,
    handleImageUploadsDirChange,
    handleBackgroundTasksToggle,
    handleSpecificBackgroundTaskToggle,
    handleRequestAcceptanceChange,
    handleLibraryToggle,
    handleRequestThemeChange,
    handleLocalBrowseToggle,
    handleAllowDownloadsToggle,
    handleLogLevelChange,
    openDownloadBrowser,
    openImageUploadsBrowser,
    scanDownloadLocation,
  } = admin;

  return (
    <>
            {activeSection === "system" && (
              <>
            {/* System Settings Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="settings" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />System Settings</h2>
              </div>
              
              <div className="card-content">
                {/* Combined Library & Request Settings */}
                <div style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="library_music" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Library Availability & Requests</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={requestAcceptance === "disabled" || (!localLibraryEnabled && !externalLibraryEnabled)}
                        onChange={(e) => {
                          const disabled = e.target.checked;
                          void (async () => {
                            await handleRequestAcceptanceChange(disabled ? "disabled" : "local");
                            if (!disabled) {
                              // When unchecking disabled, enable local library by default
                              await handleLibraryToggle("local", true);
                              return;
                            }
                            await Promise.all([
                              handleLibraryToggle("local", false),
                              handleLibraryToggle("external", false),
                            ]);
                          })();
                        }}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Disabled (no guest requests)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={localLibraryEnabled}
                        onChange={(e) => handleLibraryToggle("local", e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Enable Local Library</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={externalLibraryEnabled}
                        onChange={(e) => handleLibraryToggle("external", e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Enable External Library (Karaoke Nerds)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: localLibraryEnabled ? "pointer" : "not-allowed", opacity: localLibraryEnabled ? 1 : 0.6 }}>
                      <input
                        type="checkbox"
                        checked={localBrowseEnabled}
                        onChange={(e) => handleLocalBrowseToggle(e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn || !localLibraryEnabled}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>Show Local Library Browse on Request Page</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14 }}>Request Page Theme</span>
                      <select
                        className="form-input"
                        style={{ width: "auto", minWidth: 160, padding: "8px 12px" }}
                        value={requestTheme}
                        onChange={(e) => void handleRequestThemeChange(e.target.value as ThemeId)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                      >
                        {THEMES.map((theme) => (
                          <option key={theme.id} value={theme.id}>{theme.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Control which libraries are available for searching and requesting. When both are disabled, guests cannot request songs. Host can always add songs manually.
                  </p>
                </div>

                {/* yt-dlp Section */}
                <div style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="download" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />yt-dlp Integration</h3>
                  
                  {/* Allow Downloads Toggle */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={allowDownloads}
                        onChange={(e) => handleAllowDownloadsToggle(e.target.checked)}
                        disabled={!auth.sessionToken || !auth.isLoggedIn}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>Allow Downloads</span>
                    </label>
                    <p style={{ margin: "4px 0 0 26px", fontSize: 13, color: "var(--color-text-muted)" }}>
                      Enable downloading of external content using yt-dlp
                    </p>
                  </div>

                  {/* yt-dlp content - disabled if downloads not allowed */}
                  <div className={!allowDownloads ? 'disabled-overlay' : ''}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                        Version: {ytdlpVersion || "Checking..."}
                      </span>
                      <button
                        className="btn-icon primary"
                        onClick={updateYtdlp}
                        disabled={ytdlpUpdating || !auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                        title={ytdlpUpdating ? "Updating yt-dlp" : "Update yt-dlp"}
                        aria-label={ytdlpUpdating ? "Updating yt-dlp" : "Update yt-dlp"}
                        aria-busy={ytdlpUpdating}
                      >
                        {ytdlpUpdating ? (
                          <>
                            <span className="loading-spinner" />
                          </>
                        ) : (
                          <MaterialIcon name="sync" />
                    )}
                  </button>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Download Location</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="/media/downloads"
                      value={downloadLocation}
                      onChange={(e) => setDownloadLocation(e.target.value)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                    />
                    <button
                      className="btn-icon"
                      onClick={openDownloadBrowser}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                      title="Browse folders"
                      aria-label="Browse download folders"
                    >
                      <MaterialIcon name="folder" />
                    </button>
                    <button
                      className="btn-icon primary"
                      onClick={scanDownloadLocation}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                      title="Scan download location for new files and remove missing ones"
                      aria-label="Scan download location"
                    >
                      <MaterialIcon name="search" />
                    </button>
                    <button
                      className="btn-icon success"
                      onClick={handleDownloadLocationChange}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !allowDownloads}
                      title="Save download location"
                      aria-label="Save download location"
                    >
                      <MaterialIcon name="check" />
                    </button>
                  </div>
                </div>
                  </div>
              </div>

              {/* Image Uploads */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="image" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Image Uploads</h3>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Image Upload Directory</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder="/media/images"
                      value={imageUploadsDir}
                      onChange={(e) => setImageUploadsDir(e.target.value)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                    />
                    <button
                      className="btn-icon"
                      onClick={openImageUploadsBrowser}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      title="Browse image upload folders"
                      aria-label="Browse image upload folders"
                    >
                      <MaterialIcon name="folder" />
                    </button>
                    <button
                      className="btn-icon success"
                      onClick={handleImageUploadsDirChange}
                      disabled={!auth.sessionToken || !auth.isLoggedIn || !imageUploadsDir.trim()}
                      title="Save image upload directory"
                      aria-label="Save image upload directory"
                    >
                      <MaterialIcon name="check" />
                    </button>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Player background images uploaded from the Host page are stored here and served through the app as image references.
                  </p>
                </div>
              </div>

              {/* Background Tasks */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="sync" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Background Tasks</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundTasksEnabled}
                      onChange={(e) => handleBackgroundTasksToggle(e.target.checked)}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable duration processing task</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundMediaScanEnabled}
                      onChange={(e) => handleSpecificBackgroundTaskToggle(
                        "admin.background_media_scan_enabled",
                        e.target.checked,
                        setBackgroundMediaScanEnabled,
                        "Background media library scan"
                      )}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable periodic media library scan</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundDownloadScanEnabled}
                      onChange={(e) => handleSpecificBackgroundTaskToggle(
                        "admin.background_download_scan_enabled",
                        e.target.checked,
                        setBackgroundDownloadScanEnabled,
                        "Background download folder scan"
                      )}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable periodic download folder scan</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={backgroundBreakMusicScanEnabled}
                      onChange={(e) => handleSpecificBackgroundTaskToggle(
                        "admin.background_break_music_scan_enabled",
                        e.target.checked,
                        setBackgroundBreakMusicScanEnabled,
                        "Background break music scan"
                      )}
                      disabled={!auth.sessionToken || !auth.isLoggedIn}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>Enable periodic break music scan</span>
                  </label>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                  Each task runs independently in the background. Duration processing fills in missing track lengths, while the scan tasks periodically look for new or removed files in the configured media, download, and break music folders.
                </p>
              </div>

              {/* Logging Level */}
              <div style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16 }}><MaterialIcon name="list_alt" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />Server Logging</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Log Level</label>
                  <select
                    className="form-input"
                    value={logLevel}
                    onChange={(e) => handleLogLevelChange(e.target.value as 'error' | 'warning' | 'info' | 'verbose')}
                    disabled={!auth.sessionToken || !auth.isLoggedIn}
                    style={{ cursor: "pointer", maxWidth: 200 }}
                  >
                    <option value="error">error</option>
                    <option value="warning">warning</option>
                    <option value="info">info</option>
                    <option value="verbose">verbose</option>
                  </select>
                </div>
              </div>
              </div>
            </div>
              </>
            )}
    </>
  );
}
