// web/src/pages/Requests.tsx
import React, { useEffect, useState } from 'react'
import { api } from '../api'

type SearchRow = { 
  id: number; 
  title: string | null; 
  artist: string | null; 
  disc_id: string | null;
  kind: 'mp4' | 'cdgmp3' | 'zip' | 'mp3' 
}

type KaraokeNerdsTrack = {
  title: string
  artist: string
  url: string
  brand?: string
  source: 'karaoke-nerds'
}

export default function Requests() {
  const [q, setQ] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [searchMode, setSearchMode] = useState<'local' | 'karaoke-nerds'>('local')
  const [localRows, setLocalRows] = useState<SearchRow[]>([])
  const [karaokeNerdsRows, setKaraokeNerdsRows] = useState<KaraokeNerdsTrack[]>([])
  const [busy, setBusy] = useState(false)
  const [addingLocal, setAddingLocal] = useState<number | null>(null)
  const [addingKaraokeNerds, setAddingKaraokeNerds] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.style.colorScheme = 'dark';
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#0b0b0e';
    document.body.style.color = '#e5e7eb';
    
    // Hide navigation on mount
    const nav = document.querySelector('nav');
    const prevNavDisplay = nav ? (nav as HTMLElement).style.display : '';
    if (nav) (nav as HTMLElement).style.display = 'none';
    
    return () => {
      document.documentElement.style.colorScheme = '';
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      // Restore navigation on unmount
      if (nav) (nav as HTMLElement).style.display = prevNavDisplay;
    };
  }, []);

  // Local library search
  async function doLocalSearch() {
    if (!q.trim()) { setLocalRows([]); return }
    setBusy(true)
    try {
      const r = await api(`/api/search?q=${encodeURIComponent(q.trim())}`)
      setLocalRows(Array.isArray(r) ? r : [])
    } finally { setBusy(false) }
  }

  // Karaoke Nerds search
  async function doKaraokeNerdsSearch() {
    if (!q.trim()) { 
      setKaraokeNerdsRows([])
      return 
    }
    setBusy(true)
    try {
      const r = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(q.trim())}`)
      setKaraokeNerdsRows(Array.isArray(r) ? r : [])
    } catch (err) {
      console.error('Karaoke Nerds search error:', err)
      setKaraokeNerdsRows([])
    } finally { 
      setBusy(false) 
    }
  }

  // Trigger search based on mode
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchMode === 'local') {
        doLocalSearch()
      } else {
        doKaraokeNerdsSearch()
      }
    }, searchMode === 'local' ? 250 : 500) // KaraokeNerds uses longer delay
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, searchMode])

  // Clear results when switching modes
  useEffect(() => {
    setLocalRows([])
    setKaraokeNerdsRows([])
  }, [searchMode])

  async function enqueueLocal(id: number) {
    // Require name when adding to queue
    const name = requestedBy.trim()
    if (!name) {
      alert('Please enter your name before adding a song to the queue')
      document.getElementById('requested-by-input')?.focus()
      return
    }
    
    setAddingLocal(id)
    try {
      await api('/api/queue', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          trackId: id,
          requestedBy: name 
        }) 
      })
      
      // Success feedback
      showSuccessMessage(name)
      
    } catch (err) {
      alert('Failed to add to queue. Please try again.')
      console.error(err)
    } finally {
      setAddingLocal(null)
    }
  }

  async function enqueueKaraokeNerds(track: KaraokeNerdsTrack) {
    // Require name when adding to queue
    const name = requestedBy.trim()
    if (!name) {
      alert('Please enter your name before adding a song to the queue')
      document.getElementById('requested-by-input')?.focus()
      return
    }
    
    setAddingKaraokeNerds(track.url)
    try {
      await api('/api/karaoke-nerds/add', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          title: track.title,
          artist: track.artist,
          url: track.url,
          requestedBy: name 
        }) 
      })
      
      // Success feedback
      showSuccessMessage(name)
      
    } catch (err) {
      alert('Failed to add to queue. Please try again.')
      console.error(err)
    } finally {
      setAddingKaraokeNerds(null)
    }
  }

  function showSuccessMessage(name: string) {
    const successDiv = document.createElement('div')
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      font-weight: 600;
    `
    successDiv.textContent = `✓ Song added to queue for ${name}`
    document.body.appendChild(successDiv)
    
    setTimeout(() => {
      successDiv.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => document.body.removeChild(successDiv), 300)
    }, 3000)
  }

  // Save name to localStorage for convenience
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-name')
    if (saved) setRequestedBy(saved)
  }, [])

  useEffect(() => {
    if (requestedBy.trim()) {
      localStorage.setItem('karaoke-name', requestedBy.trim())
    }
  }, [requestedBy])

  return (
    <div style={{
      padding: 16, 
      maxWidth: 1100, 
      margin: '0 auto', 
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .card { 
          background: rgba(17,20,24,.75); 
          border: 1px solid rgba(255,255,255,.08); 
          border-radius: 14px; 
          padding: 20px; 
          backdrop-filter: blur(4px); 
        }
        .input { 
          border: 1px solid rgba(255,255,255,.14); 
          border-radius: 10px; 
          padding: 12px 14px; 
          background: #0f141a; 
          color: #e5e7eb; 
          outline: none; 
          width: 100%; 
          font-size: 16px;
          transition: border-color 0.2s;
        }
        .input:focus {
          border-color: rgba(59,130,246,.5);
        }
        .input::placeholder {
          color: rgba(229,231,235,.4);
        }
        .btn { 
          appearance: none; 
          border: 1px solid rgba(255,255,255,.12); 
          border-radius: 10px; 
          padding: 8px 16px; 
          font-weight: 600; 
          cursor: pointer; 
          background: #1d4ed8; 
          color: #e5e7eb; 
          transition: all 0.2s;
          font-size: 14px;
        }
        .btn:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px; 
        }
        th { 
          padding: 12px 10px; 
          border-bottom: 2px solid rgba(255,255,255,.12); 
          text-align: left; 
          font-weight: 600;
          color: rgba(229,231,235,.9);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td { 
          padding: 12px 10px; 
          border-bottom: 1px solid rgba(255,255,255,.06); 
          text-align: left; 
        }
        tr:hover {
          background: rgba(255,255,255,.03);
        }
        .name-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(59,130,246,.15);
          border: 1px solid rgba(59,130,246,.3);
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 500;
        }
        .field-group {
          margin-bottom: 16px;
        }
        .label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(229,231,235,.8);
        }
        .required-star {
          color: #ef4444;
          margin-left: 2px;
        }
        .toggle-switch {
          display: flex;
          gap: 8px;
          background: rgba(17,20,24,.9);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          padding: 4px;
          width: fit-content;
        }
        .toggle-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: rgba(229,231,235,.6);
        }
        .toggle-btn.active {
          background: #1d4ed8;
          color: #e5e7eb;
        }
        .toggle-btn:hover:not(.active) {
          background: rgba(255,255,255,.05);
          color: rgba(229,231,235,.8);
        }
        .info-banner {
          background: rgba(124,58,237,.1);
          border: 1px solid rgba(124,58,237,.3);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 14px;
          color: rgba(229,231,235,.9);
        }
        
        /* Mobile responsive improvements */
        @media (max-width: 768px) {
          .card {
            padding: 16px;
            overflow-x: auto;
          }
          
          h1 {
            font-size: 22px !important;
          }
          
          table {
            width: 100%;
            min-width: 400px;
          }
          
          th, td {
            padding: 8px 4px;
            font-size: 12px;
          }
          
          .btn {
            padding: 8px 10px;
            font-size: 12px;
          }
          
          .toggle-switch {
            width: 100%;
            justify-content: stretch;
          }
          
          .toggle-btn {
            flex: 1;
            padding: 12px;
            font-size: 13px;
          }
          
          .field-group {
            margin-bottom: 20px;
          }
        }
        
        @media (max-width: 480px) {
          .card {
            padding: 12px;
          }
          
          h1 {
            font-size: 20px !important;
          }
          
          table {
            font-size: 11px;
            min-width: 350px;
          }
          
          th {
            font-size: 9px;
            padding: 6px 3px;
          }
          
          td {
            padding: 8px 3px;
          }
          
          .btn {
            padding: 8px 10px;
            font-size: 11px;
            white-space: nowrap;
          }
          
          .toggle-btn {
            padding: 14px 8px;
            font-size: 12px;
          }
          
          .input {
            padding: 14px 12px;
          }
        }
      `}</style>

      <div className="card">
        <h1 style={{ marginTop: 0, marginBottom: 24 }}>🎤 Karaoke Requests</h1>
        
        {/* Search mode toggle */}
        <div style={{ marginBottom: 20 }}>
          <div className="toggle-switch">
            <button
              className={`toggle-btn ${searchMode === 'local' ? 'active' : ''}`}
              onClick={() => setSearchMode('local')}
            >
              📚 Local Library
            </button>
            <button
              className={`toggle-btn ${searchMode === 'karaoke-nerds' ? 'active' : ''}`}
              onClick={() => setSearchMode('karaoke-nerds')}
            >
              🌐 Karaoke Nerds
            </button>
          </div>
        </div>

        {/* Info banner for Karaoke Nerds */}
        {searchMode === 'karaoke-nerds' && (
          <div className="info-banner">
            <strong>🎵 Web Karaoke:</strong> Search and play songs from KaraokeNerds.com directly in your browser!
          </div>
        )}
        
        {/* Name field */}
        <div className="field-group">
          <label className="label" htmlFor="requested-by-input">
            Your Name
            <span className="required-star">*</span>
            <span style={{ fontSize: 12, color: 'rgba(229,231,235,.5)', marginLeft: 8 }}>
              (required to add songs)
            </span>
          </label>
          <input 
            id="requested-by-input"
            className="input" 
            placeholder="Enter your name..." 
            value={requestedBy} 
            onChange={e => setRequestedBy(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {requestedBy.trim() && (
            <div className="name-badge">
              <span>🎵</span>
              <span>Singing as: <strong>{requestedBy.trim()}</strong></span>
            </div>
          )}
        </div>

        {/* Search field */}
        <div className="field-group">
          <label className="label" htmlFor="search-input">
            {searchMode === 'local' ? 'Search Local Library' : 'Search Karaoke Nerds'}
          </label>
          <input 
            id="search-input"
            className="input" 
            placeholder="Search by song title or artist..." 
            value={q} 
            onChange={e => setQ(e.target.value)} 
          />
        </div>

        {busy && (
          <div style={{ marginTop: 12, color: 'rgba(229,231,235,.6)' }}>
            🔍 {searchMode === 'local' ? 'Searching...' : 'Searching Karaoke Nerds...'}
          </div>
        )}

        {/* Local library results */}
        {searchMode === 'local' && localRows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Artist</th>
                <th>Disc ID</th>
                <th style={{ textAlign: 'center', width: 70 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {localRows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.title || '—'}</td>
                  <td style={{ color: 'rgba(229,231,235,.8)' }}>{r.artist || '—'}</td>
                  <td style={{ 
                    fontSize: 11, 
                    color: 'rgba(229,231,235,.6)',
                    fontFamily: 'monospace'
                  }}>
                    {r.disc_id || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn" 
                      onClick={() => enqueueLocal(r.id)}
                      disabled={addingLocal === r.id}
                    >
                      {addingLocal === r.id ? '...' : '+ Add'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Karaoke Nerds results */}
        {searchMode === 'karaoke-nerds' && karaokeNerdsRows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Artist</th>
                <th>Brand</th>
                <th style={{ textAlign: 'center', width: 70 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {karaokeNerdsRows.map((track, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 500 }}>{track.title || '—'}</td>
                  <td style={{ color: 'rgba(229,231,235,.8)' }}>{track.artist || '—'}</td>
                  <td style={{ fontSize: 11, color: 'rgba(229,231,235,.6)' }}>
                    {track.brand || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn" 
                      style={{ background: '#7c3aed' }}
                      onClick={() => enqueueKaraokeNerds(track)}
                      disabled={addingKaraokeNerds === track.url}
                      onMouseEnter={e => {
                        if (!addingKaraokeNerds) {
                          (e.currentTarget as HTMLButtonElement).style.background = '#8b5cf6'
                        }
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = '#7c3aed'
                      }}
                    >
                      {addingKaraokeNerds === track.url ? '...' : '+ Add'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {/* No results message */}
        {!busy && q.trim() && 
         ((searchMode === 'local' && !localRows.length) || 
          (searchMode === 'karaoke-nerds' && !karaokeNerdsRows.length)) && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'rgba(229,231,235,.5)' 
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
            <div>No songs found{searchMode === 'karaoke-nerds' ? ' on Karaoke Nerds' : ''} for "{q}"</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
              {searchMode === 'karaoke-nerds' ? 'Try different search terms' : 'Try searching for artist name or song title'}
            </div>
          </div>
        )}

        {/* Welcome message when no search */}
        {!q.trim() && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'rgba(229,231,235,.5)' 
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {searchMode === 'local' ? '🎤' : '🌐'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>Ready to sing?</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
              {searchMode === 'local' 
                ? 'Enter your name above, then search for your favorite songs!' 
                : 'Enter your name above, then search for songs from Karaoke Nerds!'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}