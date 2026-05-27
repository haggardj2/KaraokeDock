// web/src/pages/KaraokeNerds.tsx
import React, { useEffect, useState } from 'react'
import { api } from '../api'

type KaraokeNerdsTrack = {
  title: string
  artist: string
  url: string
  brand?: string
  source: 'karaoke-nerds'
}

export default function KaraokeNerds() {
  const [q, setQ] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [results, setResults] = useState<KaraokeNerdsTrack[]>([])
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.style.colorScheme = 'dark';
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#0b0b0e';
    document.body.style.color = '#e5e7eb';
    return () => {
      document.documentElement.style.colorScheme = '';
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  async function doSearch() {
    if (!q.trim()) { 
      setResults([])
      return 
    }
    setBusy(true)
    try {
      const r = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(q.trim())}`)
      setResults(Array.isArray(r) ? r : [])
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally { 
      setBusy(false) 
    }
  }

  useEffect(() => {
    const t = setTimeout(doSearch, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  async function addToQueue(track: KaraokeNerdsTrack) {
    // Require name when adding to queue
    const name = requestedBy.trim()
    if (!name) {
      alert('Please enter your name before adding a song to the queue')
      document.getElementById('requested-by-input')?.focus()
      return
    }
    
    setAdding(track.url)
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
      
    } catch (err) {
      alert('Failed to add to queue. Please try again.')
      console.error(err)
    } finally {
      setAdding(null)
    }
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
          background: #7c3aed; 
          color: #e5e7eb; 
          transition: all 0.2s;
          font-size: 14px;
        }
        .btn:hover:not(:disabled) {
          background: #8b5cf6;
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
          background: rgba(124,58,237,.15);
          border: 1px solid rgba(124,58,237,.3);
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
        .info-banner {
          background: rgba(124,58,237,.1);
          border: 1px solid rgba(124,58,237,.3);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 14px;
          color: rgba(229,231,235,.9);
        }
      `}</style>

      <div className="card">
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>🌐 Karaoke Nerds Search</h1>
        
        <div className="info-banner">
          <strong>🎵 Web Karaoke:</strong> Search and play songs from KaraokeNerds.com directly in your browser!
        </div>
        
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
            Search Karaoke Nerds
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
            🔍 Searching Karaoke Nerds...
          </div>
        )}

        {/* Results table */}
        {results.length > 0 && (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Title</th>
                <th style={{ width: '30%' }}>Artist</th>
                <th style={{ width: '15%' }}>Brand</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((track, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 500 }}>{track.title || '—'}</td>
                  <td style={{ color: 'rgba(229,231,235,.8)' }}>{track.artist || '—'}</td>
                  <td style={{ fontSize: 12, color: 'rgba(229,231,235,.6)' }}>
                    {track.brand || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn" 
                      onClick={() => addToQueue(track)}
                      disabled={adding === track.url}
                    >
                      {adding === track.url ? '...' : '+ Add'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {!results.length && !busy && q.trim() && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'rgba(229,231,235,.5)' 
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
            <div>No songs found on Karaoke Nerds for "{q}"</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>Try different search terms</div>
          </div>
        )}

        {!q.trim() && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px', 
            color: 'rgba(229,231,235,.5)' 
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>Search Web Karaoke</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>
              Enter your name above, then search for songs from Karaoke Nerds!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
