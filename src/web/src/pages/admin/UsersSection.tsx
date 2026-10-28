import SingerAvatar from "../../components/SingerAvatar";
import MaterialIcon from "../../components/MaterialIcon";
import { getUserDisplayName } from "./shared";
import type { AdminState } from "./useAdmin";

// Host and admin accounts.
export default function UsersSection({ admin }: { admin: AdminState }) {
  const {
    name,
    activeSection,
    users,
    setMergeUser,
    usersLoadError,
    showCreateUser,
    setShowCreateUser,
    newUserUsername,
    setNewUserUsername,
    newUserPassword,
    setNewUserPassword,
    newUserRole,
    setNewUserRole,
    userError,
    setUserError,
    setEditingUser,
    setEditUserRole,
    setEditUserActive,
    setEditUserPassword,
    setEditUserError,
    refreshUsers,
    handleCreateUser,
    handleDeleteUser,
  } = admin;

  return (
    <>
            {activeSection === "users" && (
              <>
            {/* User Manager Card */}
            <div className="card">
              <div className="card-header">
                <h2><MaterialIcon name="group" style={{ fontSize: 24, verticalAlign: 'text-bottom', marginRight: 8 }} />User Manager</h2>
              </div>
              <div className="card-content">
                {usersLoadError && (
                  <div className="error-msg" role="alert">
                    {usersLoadError} <button className="btn ghost" onClick={() => void refreshUsers()}>Retry</button>
                  </div>
                )}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-icon primary"
                    title="Create new user"
                    aria-label="Create new user"
                    onClick={() => { setShowCreateUser(true); setUserError(""); }}
                  >
                    <MaterialIcon name="add" />
                  </button>
                </div>

                {/* Create User Form */}
                {showCreateUser && (
                  <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create New User</h3>
                    <form onSubmit={handleCreateUser}>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" type="text" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value)} required minLength={3} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="form-input" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')} style={{ cursor: 'pointer' }}>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {userError && <div className="error-msg">{userError}</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn primary" type="submit">Create</button>
                        <button className="btn ghost" type="button" onClick={() => { setShowCreateUser(false); setUserError(""); }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Users List */}
                {users.length === 0 ? (
                  <div className="empty-state">
                    <MaterialIcon name="person" className="empty-icon" />
                    <div className="empty-text">No users yet</div>
                  </div>
                ) : (
                  <div className="library-list">
                    {users.map((user) => (
                      <div key={user.id} className="library-item">
                        <div className="library-header">
                          <div style={{ flexShrink: 0, marginRight: 12 }}>
                            <SingerAvatar name={getUserDisplayName(user)}
                              profile={{ imageUrl: user.picture, focusX: 50, focusY: 50 }} size={40} />
                          </div>
                          <div className="library-info">
                            <div className="library-name" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {getUserDisplayName(user)}
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 999,
                                background: user.role === 'admin' ? 'var(--color-accent-soft)' : 'color-mix(in srgb, var(--color-text-secondary) 20%, transparent)',
                                color: user.role === 'admin' ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                                fontWeight: 600,
                              }}>{user.role}</span>
                              {!user.is_active && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontWeight: 600 }}>inactive</span>}
                              {user.oidc_subject && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-success-soft)', color: 'var(--color-success)', fontWeight: 600 }}>SSO</span>}
                              {user.social_provider && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--color-success-soft)', color: 'var(--color-success)', fontWeight: 600 }}>{user.social_provider === 'google' ? 'Google' : 'Facebook'}</span>}
                            </div>
                            <div className="user-meta">
                              {getUserDisplayName(user) !== user.username && (
                                <span>{user.username} •</span>
                              )}
                              <span className="user-meta-date">Created: {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                            {!!user.linkedLogins?.length && <div className="user-meta">
                              Linked sign-ins: {user.linkedLogins.map(login => `${login.provider === 'google' ? 'Google' : 'Facebook'} (${login.username})${login.isActive ? '' : ' - disabled'}`).join(', ')}
                            </div>}
                          </div>
                          <div className="library-actions">
                            <button
                              className="btn-icon"
                              title="Merge a social login into this account"
                              aria-label={`Merge singer and logins into ${getUserDisplayName(user)}`}
                              disabled={!user.is_active || !!usersLoadError}
                              onClick={() => setMergeUser(user)}
                            ><MaterialIcon name="merge" /></button>
                            <button
                              className="btn-icon"
                              title="Edit user"
                              onClick={() => {
                                setEditingUser(user);
                                setEditUserRole(user.role);
                                setEditUserActive(user.is_active);
                                setEditUserPassword("");
                                setEditUserError("");
                              }}
                            ><MaterialIcon name="edit" /></button>
                            <button
                              className="btn-icon danger"
                              title="Delete user"
                              onClick={() => handleDeleteUser(user)}
                            ><MaterialIcon name="delete" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
              </>
            )}
    </>
  );
}
