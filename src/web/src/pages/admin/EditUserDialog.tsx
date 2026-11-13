import MaterialIcon from "../../components/MaterialIcon";
import { getUserDisplayName } from "./shared";
import type { AdminState } from "./useAdmin";

// Edit a host or admin account.
export default function EditUserDialog({ admin }: { admin: AdminState }) {
  const {
    name,
    editingUser,
    setEditingUser,
    editUserRole,
    setEditUserRole,
    editUserActive,
    setEditUserActive,
    editUserPassword,
    setEditUserPassword,
    editUserError,
    handleUpdateUser,
  } = admin;

  return (
    <>
            {/* Edit User Modal */}
            {editingUser && (
              <>
                <div className="modal-backdrop" onClick={() => setEditingUser(null)} />
                <div className="modal" style={{ maxWidth: 480 }}>
                  <div className="modal-header">
                    <h3 className="modal-title"><MaterialIcon name="edit" style={{ fontSize: 22, verticalAlign: 'text-bottom', marginRight: 8 }} />Edit User: {getUserDisplayName(editingUser)}</h3>
                    <button className="btn ghost" onClick={() => setEditingUser(null)} style={{ padding: '4px 12px' }}><MaterialIcon name="close" /></button>
                  </div>
                  <form onSubmit={handleUpdateUser}>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-input" value={editUserRole} onChange={(e) => setEditUserRole(e.target.value as 'admin' | 'user')} style={{ cursor: 'pointer' }}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editUserActive} onChange={(e) => setEditUserActive(e.target.checked)} style={{ width: 16, height: 16 }} />
                        <span className="form-label" style={{ margin: 0 }}>Active</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password (leave blank to keep current)</label>
                      <input className="form-input" type="password" value={editUserPassword} onChange={(e) => setEditUserPassword(e.target.value)} placeholder="New password (optional)" autoComplete="new-password" />
                    </div>
                    {editUserError && <div className="error-msg">{editUserError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn primary" type="submit">Save Changes</button>
                      <button className="btn ghost" type="button" onClick={() => setEditingUser(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </>
            )}
    </>
  );
}
