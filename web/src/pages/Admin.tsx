import React, { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE, api } from '../api'

type Library = { id: number; name: string; path: string }
type Stats = { artists: number; tracks: number; queued: number; lastScan?: any }
type FolderItem = { name: string; path: string; isDirectory: boolean }

export default function Admin() {
  const [libs, setLibs] = useState<Library[]>([])
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [adminToken, setToken] = useState(localStorage.getItem('adminToken') || '')
  const [stats, setStats] = useState<Stats | null>(null)
  const [banner, setBanner] = useState<string>('')
  const [showBrowser, setShowBrowser] = useState(false)
  const [currentBrowsePath, setCurrentBrowsePath] = useState('/media')
  const [folderContents, setFolderContents] = useState<FolderItem[]>([])
  const [browseError, setBrowseError] = useState<string>('')
  const esRef = useRef<EventSource | null>(null)
  
  // Login state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  
  // Token management
  const [editingToken, setEditingToken] = useState(false)
  const [newToken, setNewToken] = useState('')

  const headers = useMemo(() => ({ 'x-admin-token': adminToken, 'Content-Type': 'application/json' }), [adminToken])

  async function refreshLibs() {
    setLibs(await api('/api/libraries'))
  }
  async function refreshStats() {
    if (!adminToken) return
    const s = await api('/api/admin/stats', { headers })
    setStats(s)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setBusy(true)
    
    try {
      const result = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      })
      
      if (result.ok) {
        setIsLoggedIn(true)
        // Note: User will need to set an admin token after first login
      } else {
        setLoginError('Invalid username or password')
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  
  async function saveToken() {
    if (!newToken.trim()) {
      alert('Token cannot be empty')
      return
    }
    
    setBusy(true)
    try {
      // Include username/password for authentication if admin token is not yet set
      const body: any = { token: newToken.trim() }
      if (!adminToken) {
        body.username = loginUsername
        body.password = loginPassword
      }
      
      await api('/api/admin/token', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
      
      setToken(newToken.trim())
      localStorage.setItem('adminToken', newToken.trim())
      setEditingToken(false)
      setBanner('Admin token updated successfully')
      setTimeout(() => setBanner(''), 3000)
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save token. Please check your authentication.'
      alert(errorMsg)
      console.error('Token save error:', err)
    } finally {
      setBusy(false)
    }
  }


  async function browseFolders(browsePath: string) {
    if (!adminToken) return
    
    setBrowseError('')
    try {
      const contents = await api(`/api/browse?path=${encodeURIComponent(browsePath)}`, { headers })
      setFolderContents(contents || [])
      setCurrentBrowsePath(browsePath)
    } catch (err) {
      setBrowseError('Unable to access this directory')
      setFolderContents([])
    }
  }

  useEffect(() => {
    // dark mode styling similar to other pages
    document.documentElement.style.colorScheme = 'dark';
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#0b0b0e';
    document.body.style.color = '#e5e7eb';

    refreshLibs();
    
    // Check if we have a stored token and try to use it
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setToken(storedToken);
      refreshStats().then(() => {
        setIsLoggedIn(true)
      }).catch(() => {
        // Token invalid, need to log in again
        setIsLoggedIn(false)
      })
    }

    // Hook up SSE for scan notifications
    try {
    const es = new EventSource(`${API_BASE}/api/scan/events`);
      esRef.current = es;

      es.addEventListener('hello', (e: any) => {
        // optional initial ping
      });
      es.addEventListener('scan_start', () => {
        setBanner('Scanning libraries…');
      });
      es.addEventListener('scan_progress', (evt: any) => {
        try {
          const data = JSON.parse(evt.data || '{}');
          if (data?.state === 'scanning') setBanner(`Scanning library #${data.libraryId}…`);
          if (data?.state === 'done') setBanner(`Scanned library #${data.libraryId}`);
          if (data?.state === 'error') setBanner(`Scan error on library #${data.libraryId}: ${data.error}`);
        } catch {}
      });
      es.addEventListener('scan_done', async (evt: any) => {
        setBanner('Scan finished ✔');
        // Pull fresh counts so Admin can verify inserts actually happened
        await refreshStats();
        // Clear banner after a beat
        setTimeout(() => setBanner(''), 3000);
      });

      es.onerror = () => {
        // Silent: will auto-retry EventSource
      };
    } catch {
      // ignore
    }

    return () => {
      esRef.current?.close();
      document.documentElement.style.colorScheme = '';
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (adminToken) localStorage.setItem('adminToken', adminToken);
  }, [adminToken]);

  async function addLibrary() {
    if (!adminToken) return alert('Set Admin token first');
    if (!name.trim()) return alert('Library name is required');
    if (!path.trim()) return alert('Library path is required');
    
    setBusy(true);
    try {
      await api('/api/libraries', { method:'POST', headers, body: JSON.stringify({ name: name.trim(), path: path.trim() }) });
      await refreshLibs()
      setName('')
      setPath('')
    } finally { setBusy(false) }
  }

  async function deleteLibrary(id: number) {
    if (!adminToken) return alert('Set Admin token first');
    if (!confirm('Remove this library? (Tracks remain until Clear DB)')) return;
    setBusy(true);
    try {
      await api(`/api/libraries/${id}`, { method: 'DELETE', headers });
      await refreshLibs()
    } finally { setBusy(false) }
  }

  async function scanAll() {
    if (!adminToken) return alert('Set Admin token first');
    setBusy(true);
    setBanner('Scanning libraries…');
    try {
      await api('/api/scan', { method: 'POST', headers, body: JSON.stringify({}) })
      // Result will arrive via SSE as scan_done; we don't alert here.
    } finally { setBusy(false) }
  }

  async function scanOne(id: number) {
    if (!adminToken) return alert('Set Admin token first');
    setBusy(true);
    setBanner(`Scanning library #${id}…`);
    try {
      await api('/api/scan', { method: 'POST', headers, body: JSON.stringify({ libraryId: id }) })
    } finally { setBusy(false) }
  }

  async function clearDb() {
    if (!adminToken) return alert('Set Admin token first');
    if (!confirm('This will clear queue, tracks, and artists (libraries remain). Continue?')) return;
    setBusy(true);
    try {
      const r = await api('/api/admin/clear-db', { method: 'POST', headers: { 'x-admin-token': adminToken } })
      setBanner(`DB cleared (artists ${r.before.artists}→${r.after.artists}, tracks ${r.before.tracks}→${r.after.tracks}, queue ${r.before.queue}→${r.after.queue})`);
      await refreshStats();
      setTimeout(() => setBanner(''), 4000);
    } finally { setBusy(false) }
  }

  const openBrowser = () => {
    setShowBrowser(true)
    setCurrentBrowsePath(path || '/media')
    browseFolders(path || '/media')
  }

  const selectFolder = (folderPath: string) => {
    setPath(folderPath)
    setShowBrowser(false)
  }

  const navigateUp = () => {
    const parentPath = currentBrowsePath.split('/').slice(0, -1).join('/') || '/'
    browseFolders(parentPath)
  }

  return (
    <div style={{padding:16, maxWidth:1000, margin:'0 auto', fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'}}>
      <style>{`
        .card { background: rgba(17,20,24,.75); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:16px; backdrop-filter: blur(4px); }
        .add-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: rgba(255,255,255,.03); border-radius: 10px; margin-bottom: 16px; }
        .form-row { display: flex; gap: 12px; align-items: center; }
        .form-field { flex: 1; }
        .field-label { display: block; margin-bottom: 6px; font-size: 13px; color: rgba(229,231,235,.7); font-weight: 500; }
        .btn { appearance:none; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; background:#1d4ed8; color:#e5e7eb; transition: all 0.2s; }
        .btn:hover:not(:disabled) { background:#2563eb; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn.warn { background:#b91c1c; }
        .btn.warn:hover:not(:disabled) { background:#ef4444; }
        .btn.ghost { background:transparent; }
        .btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,.1); }
        .btn.success { background:#059669; }
        .btn.success:hover:not(:disabled) { background:#10b981; }
        .muted { opacity:.8; font-size:12px; color:#cbd5e1; }
        .input { border:1px solid rgba(255,255,255,.14); border-radius:10px; padding:10px 12px; background:#0f141a; color:#e5e7eb; outline:none; width:100%; }
        .input:focus { border-color: rgba(59,130,246,.5); }
        .list { display:grid; gap:10px; }
        .librow { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:12px 14px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background: rgba(17,20,24,.75); }
        .actions { display:flex; gap:8px; }
        .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .banner { position:sticky; top:0; z-index:10; margin-bottom:12px; padding:10px 12px; border:1px solid rgba(255,255,255,.12); border-radius:10px; background:#0b3b0f; color:#d1fae5; }
        .stats { display:flex; gap:12px; flex-wrap:wrap; }
        .pill { padding:6px 10px; border-radius:999px; background:#111827; border:1px solid rgba(255,255,255,.08); color:#e5e7eb; }
        
        .modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #111827; border: 1px solid rgba(255,255,255,.2); border-radius: 12px; padding: 24px; max-width: 800px; width: 90%; max-height: 80vh; display: flex; flex-direction: column; }
        .browser-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .browser-path { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(0,0,0,0.4); border-radius: 8px; font-family: monospace; font-size: 14px; }
        .browser-container { background: #0a0a0a; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 8px; height: 400px; overflow-y: auto; margin-bottom: 16px; }
        .folder-item { padding: 10px 12px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 10px; transition: all 0.2s; border: 1px solid transparent; }
        .folder-item:hover { background: rgba(59,130,246,.15); border-color: rgba(59,130,246,.3); }
        .folder-icon { font-size: 18px; }
        .folder-name { flex: 1; }
        .breadcrumb { display: flex; gap: 6px; align-items: center; }
        .breadcrumb-sep { opacity: 0.5; }
        .breadcrumb-part { cursor: pointer; color: #3b82f6; }
        .breadcrumb-part:hover { text-decoration: underline; }
        .browser-footer { display: flex; gap: 12px; justify-content: flex-end; }
        .error-msg { color: #ef4444; padding: 8px 12px; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); border-radius: 6px; margin-bottom: 12px; }
        
        .login-container { display: flex; align-items: center; justify-content: center; min-height: 70vh; }
        .login-card { max-width: 400px; width: 100%; }
        
        @media (max-width: 800px) { 
          .form-row { flex-direction: column; }
          .toolbar { flex-direction: column; width: 100%; }
          .toolbar .input { width: 100%; }
        }
      `}</style>

      {banner && <div className="banner">{banner}</div>}

      <h1 style={{margin:'6px 0 12px', fontSize:'clamp(20px, 3vw, 30px)', color:'#e5e7eb'}}>🎛️ Admin Dashboard</h1>

      {!isLoggedIn ? (
        <div className="login-container">
          <div className="card login-card">
            <h2 style={{marginTop:0, marginBottom:20, textAlign:'center'}}>Admin Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-field" style={{marginBottom:16}}>
                <label className="field-label">Username</label>
                <input 
                  className="input"
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-field" style={{marginBottom:16}}>
                <label className="field-label">Password</label>
                <input 
                  className="input"
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {loginError && (
                <div className="error-msg" style={{marginBottom:16}}>
                  {loginError}
                </div>
              )}
              <button className="btn" type="submit" disabled={busy} style={{width:'100%'}}>
                {busy ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Stats and Controls Card */}
          <div className="card" style={{marginBottom:12}}>
            <div className="toolbar" style={{marginBottom:10}}>
              <button className="btn" onClick={scanAll} disabled={busy || !adminToken}>🔍 Scan All</button>
              <button className="btn warn" onClick={clearDb} disabled={busy || !adminToken}>🗑️ Clear DB</button>
              <button className="btn ghost" onClick={refreshStats} disabled={!adminToken}>🔄 Refresh</button>
              {busy && <span className="muted">Working…</span>}
            </div>
            <div className="stats">
              <div className="pill">🎤 Artists: {stats?.artists ?? '—'}</div>
              <div className="pill">🎵 Tracks: {stats?.tracks ?? '—'}</div>
              <div className="pill">📋 Queue: {stats?.queued ?? '—'}</div>
              <div className="pill">⏰ Last Scan: {stats?.lastScan?.finishedAt ? new Date(stats.lastScan.finishedAt).toLocaleString() : 'Never'}</div>
            </div>
          </div>

          {/* Token Management Card */}
          <div className="card" style={{marginBottom:12}}>
            <h3 style={{margin:'0 0 12px', fontSize:18}}>🔑 Admin Token Management</h3>
            <p className="muted" style={{marginBottom:12}}>
              The admin token is used to authenticate API requests from the Host page. 
              You can change it here without needing to restart the server.
            </p>
            {!editingToken ? (
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <div className="input" style={{flex:1, fontFamily:'monospace'}}>
                  {adminToken || '(not set)'}
                </div>
                <button className="btn" onClick={() => { setEditingToken(true); setNewToken(adminToken); }}>
                  ✏️ Edit Token
                </button>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                <input 
                  className="input"
                  type="text"
                  value={newToken}
                  onChange={e => setNewToken(e.target.value)}
                  placeholder="Enter new admin token"
                  autoFocus
                />
                <div style={{display:'flex', gap:8}}>
                  <button className="btn success" onClick={saveToken} disabled={busy || !newToken.trim()}>
                    ✓ Save Token
                  </button>
                  <button className="btn ghost" onClick={() => { setEditingToken(false); setNewToken(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

      <h2 style={{margin:'16px 0 8px'}}>📚 Media Libraries</h2>
      <div className="card" style={{marginBottom:12}}>
        {/* Add Library Form */}
        <div className="add-form">
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Library Name</label>
              <input 
                className="input" 
                placeholder="e.g., Main Collection" 
                value={name} 
                onChange={e=>setName(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Folder Path</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  className="input" 
                  placeholder="e.g., /media/karaoke" 
                  value={path} 
                  onChange={e=>setPath(e.target.value)} 
                />
                <button 
                  className="btn ghost" 
                  onClick={openBrowser} 
                  disabled={!adminToken}
                  title="Browse folders"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📁 Browse
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-row">
            <button 
              className="btn success" 
              onClick={addLibrary} 
              disabled={busy || !adminToken || !name.trim() || !path.trim()}
              style={{ width: '100%' }}
            >
              ➕ Add Library
            </button>
          </div>
        </div>

        {/* Libraries List */}
        <div className="list">
          {libs.map(l => (
            <div key={l.id} className="librow">
              <div style={{minWidth:0}}>
                <div style={{fontWeight:700, color:'#e5e7eb', fontSize: 16}}>{l.name}</div>
                <div className="muted" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily: 'monospace'}}>
                  📁 {l.path}
                </div>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={()=>scanOne(l.id)} disabled={busy || !adminToken}>🔍 Scan</button>
                <button className="btn warn" onClick={()=>deleteLibrary(l.id)} disabled={busy || !adminToken}>❌ Remove</button>
              </div>
            </div>
          ))}
          {!libs.length && (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
              <div>No libraries configured yet.</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Add a media library above to get started.</div>
            </div>
          )}
        </div>
      </div>

      {/* Folder Browser Modal */}
      {showBrowser && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setShowBrowser(false) }}>
          <div className="modal-content">
            <div className="browser-header">
              <h3 style={{ margin: 0 }}>📁 Select Media Folder</h3>
              <button 
                className="btn ghost" 
                onClick={() => setShowBrowser(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div className="browser-path">
              <span>📍 Current Path:</span>
              <div className="breadcrumb">
                {currentBrowsePath.split('/').filter(Boolean).map((part, idx, arr) => {
                  const partPath = '/' + arr.slice(0, idx + 1).join('/')
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="breadcrumb-sep">/</span>}
                      <span 
                        className="breadcrumb-part"
                        onClick={() => browseFolders(partPath)}
                      >
                        {part}
                      </span>
                    </React.Fragment>
                  )
                })}
                {currentBrowsePath === '/' && <span>/</span>}
              </div>
            </div>

            {browseError && (
              <div className="error-msg">
                ⚠️ {browseError}
              </div>
            )}

            <div className="browser-container">
              {currentBrowsePath !== '/' && (
                <div className="folder-item" onClick={navigateUp}>
                  <span className="folder-icon">⬆️</span>
                  <span className="folder-name">..</span>
                  <span className="muted">(parent directory)</span>
                </div>
              )}
              
              {folderContents
                .filter(item => item.isDirectory)
                .map(item => (
                  <div 
                    key={item.path}
                    className="folder-item"
                    onClick={() => browseFolders(item.path)}
                  >
                    <span className="folder-icon">📁</span>
                    <span className="folder-name">{item.name}</span>
                  </div>
                ))}
              
              {folderContents.filter(item => item.isDirectory).length === 0 && !browseError && (
                <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>
                  No subfolders in this directory
                </div>
              )}
            </div>

            <div className="browser-footer">
              <input
                className="input"
                value={currentBrowsePath}
                readOnly
                style={{ flex: 1, marginRight: 12 }}
              />
              <button 
                className="btn success"
                onClick={() => selectFolder(currentBrowsePath)}
              >
                ✓ Select This Folder
              </button>
              <button 
                className="btn ghost"
                onClick={() => setShowBrowser(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}