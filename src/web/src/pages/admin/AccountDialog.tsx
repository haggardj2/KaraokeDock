import MaterialIcon from "../../components/MaterialIcon";
import type { AdminState } from "./useAdmin";

// Change the signed-in admin's username or password.
export default function AccountDialog({ admin }: { admin: AdminState }) {
  const {
    auth,
    name,
    busy,
    banner,
    showAccountManagement,
    setShowAccountManagement,
    changingPassword,
    setChangingPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    setPasswordError,
    changingUsername,
    setChangingUsername,
    newUsername,
    setNewUsername,
    usernamePassword,
    setUsernamePassword,
    usernameError,
    setUsernameError,
    handleChangePassword,
    handleChangeUsername,
  } = admin;

  return (
    <>
            {/* Account Management Modal */}
            {showAccountManagement && (
              <>
                <div className="modal-backdrop" onClick={() => setShowAccountManagement(false)} />
                <div className="modal">
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="lock" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Account Settings</h3>
                    <button
                      className="btn ghost"
                      onClick={() => setShowAccountManagement(false)}
                      style={{ padding: "4px 12px" }}
                    >
                      <MaterialIcon name="close" />
                    </button>
                  </div>

                  {auth.isDefaultPassword && (
                    <div className="banner warning" style={{ marginBottom: 16 }}>
                      <MaterialIcon name="warning" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 6 }} />
                      You are using the default password. Please change it for security.
                    </div>
                  )}

                  <p style={{ color: "var(--color-text-secondary)", marginBottom: 20, fontSize: 14 }}>
                    Change your username and password.
                  </p>

                  {!changingUsername && !changingPassword && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
                      <button
                        className="btn"
                        style={{ minWidth: 180, justifyContent: "center", flex: 1 }}
                        onClick={() => setChangingUsername(true)}
                      >
                        <MaterialIcon name="person" /> Change Username
                      </button>
                      <button
                        className="btn"
                        style={{ minWidth: 180, justifyContent: "center", flex: 1 }}
                        onClick={() => setChangingPassword(true)}
                      >
                        <MaterialIcon name="lock" /> Change Password
                      </button>
                    </div>
                  )}

                  {/* Username Change Section */}
                  {changingUsername && (
                    <div style={{ marginBottom: 20 }}>
                      <form
                        onSubmit={handleChangeUsername}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          background: "var(--color-bg-secondary)",
                          padding: 16,
                          borderRadius: 12,
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">New Username</label>
                          <input
                            className="form-input"
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter new username (min 3 characters)"
                            autoComplete="username"
                            required
                            minLength={3}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">
                            Current Password (to confirm)
                          </label>
                          <input
                            className="form-input"
                            type="password"
                            value={usernamePassword}
                            onChange={(e) => setUsernamePassword(e.target.value)}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            required
                          />
                        </div>
                        {usernameError && (
                          <div className="error-msg" style={{ marginBottom: 0 }}>{usernameError}</div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn success"
                            type="submit"
                            disabled={busy}
                          >
                            <MaterialIcon name="check" /> Change Username
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              setChangingUsername(false);
                              setNewUsername("");
                              setUsernamePassword("");
                              setUsernameError("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Password Change Section */}
                  {changingPassword && (
                    <form
                      onSubmit={handleChangePassword}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        background: "var(--color-bg-secondary)",
                        padding: 16,
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Current Password</label>
                        <input
                          className="form-input"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">New Password</label>
                        <input
                          className="form-input"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 8 characters)"
                          autoComplete="new-password"
                          required
                          minLength={8}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Confirm New Password</label>
                        <input
                          className="form-input"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          required
                        />
                      </div>
                      {passwordError && (
                        <div className="error-msg" style={{ marginBottom: 0 }}>{passwordError}</div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn success" type="submit" disabled={busy}>
                          <MaterialIcon name="check" /> Change Password
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setChangingPassword(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                            setPasswordError("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
    </>
  );
}
