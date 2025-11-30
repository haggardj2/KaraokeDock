import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Player from './pages/Player'
import Requests from './pages/Requests'
import Host from './pages/Host'
import Admin from './pages/Admin'

function Nav() {
  return (
    <nav style={{display:'flex', gap:12, padding:12, borderBottom:'1px solid #ddd'}}>
      <Link to="/player">Player</Link>
      <Link to="/requests">Request</Link>
      <Link to="/host">Host</Link>
      <Link to="/admin">Admin</Link>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Requests />} />
        <Route path="/player" element={<Player />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/host" element={<Host />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

