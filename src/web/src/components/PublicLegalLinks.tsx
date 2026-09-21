import { API_BASE } from '../api'

export default function PublicLegalLinks() {
  return (
    <nav aria-label="Policies" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px', fontSize: 13 }}>
      <a href={`${API_BASE}/privacy`} target="_blank" rel="noreferrer" style={{ color: '#b7baff' }}>Privacy Policy</a>
      <a href={`${API_BASE}/terms`} target="_blank" rel="noreferrer" style={{ color: '#b7baff' }}>Terms of Service</a>
    </nav>
  )
}
