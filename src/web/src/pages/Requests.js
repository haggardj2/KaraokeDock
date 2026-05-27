import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
const MIN_KEY_ADJUSTMENT = -6;
const MAX_KEY_ADJUSTMENT = 6;
const MOBILE_BREAKPOINT = 640;
export default function Requests() {
    const [q, setQ] = useState('');
    const [requestedBy, setRequestedBy] = useState('');
    const [keyAdjustments, setKeyAdjustments] = useState(new Map());
    const [searchMode, setSearchMode] = useState('local');
    const [localRows, setLocalRows] = useState([]);
    const [karaokeNerdsRows, setKaraokeNerdsRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const [addingLocal, setAddingLocal] = useState(null);
    const [addingKaraokeNerds, setAddingKaraokeNerds] = useState(null);
    const [recentlyAdded, setRecentlyAdded] = useState(new Set());
    const [showNamePrompt, setShowNamePrompt] = useState(false);
    const [kindFilter, setKindFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [actionMenuOpen, setActionMenuOpen] = useState(null);
    const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState(null);
    const [keyAdjustmentView, setKeyAdjustmentView] = useState(null);
    const [lyricsPopupOpen, setLyricsPopupOpen] = useState(null);
    const [lyricsData, setLyricsData] = useState({});
    const searchTimeoutRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const actionMenuRef = useRef(null);
    const lyricsPopupRef = useRef(null);
    // Request acceptance settings
    const [requestAcceptance, setRequestAcceptance] = useState('local');
    const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
    const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
    useEffect(() => {
        // Close popup when clicking outside
        function handleDown(e) {
            if (actionMenuOpen) {
                const el = actionMenuRef.current;
                if (el && !el.contains(e.target)) {
                    setActionMenuOpen(null);
                    setActionMenuPosition(null);
                    setKeyAdjustmentView(null);
                }
            }
            if (lyricsPopupOpen) {
                const el = lyricsPopupRef.current;
                if (el && !el.contains(e.target)) {
                    setLyricsPopupOpen(null);
                }
            }
        }
        document.addEventListener('mousedown', handleDown);
        return () => document.removeEventListener('mousedown', handleDown);
    }, [actionMenuOpen, lyricsPopupOpen]);
    useEffect(() => {
        // Modern dark theme
        document.documentElement.style.cssText = `
      --color-bg-primary: #0a0a0f;
      --color-bg-secondary: #16161d;
      --color-bg-card: #1d1d27;
      --color-bg-hover: #252533;
      --color-accent: #6366f1;
      --color-accent-hover: #7c7ff3;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-text-primary: #ffffff;
      --color-text-secondary: #a1a1aa;
      --color-text-muted: #71717a;
      --color-border: rgba(255, 255, 255, 0.08);
      --color-border-focus: rgba(99, 102, 241, 0.5);
    `;
        document.body.style.cssText = `
      background: linear-gradient(135deg, #0a0a0f 0%, #16161d 100%);
      color: #ffffff;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    `;
        // Hide navigation
        const nav = document.querySelector('nav');
        const prevNavDisplay = nav ? nav.style.display : '';
        if (nav)
            nav.style.display = 'none';
        // Load saved name
        const savedName = localStorage.getItem('karaoke-name');
        if (savedName)
            setRequestedBy(savedName);
        // Load settings for request acceptance
        async function loadSettings() {
            try {
                const settings = await api('/api/settings/public');
                const acceptance = settings['requests.acceptance'] || 'local';
                const localEnabled = settings['libraries.local_enabled'] !== false;
                const externalEnabled = settings['libraries.external_enabled'] !== false;
                setRequestAcceptance(acceptance);
                setLocalLibraryEnabled(localEnabled);
                setExternalLibraryEnabled(externalEnabled);
                // Set initial search mode based on what's enabled
                if (localEnabled) {
                    setSearchMode('local');
                }
                else if (externalEnabled) {
                    setSearchMode('karaoke-nerds');
                }
            }
            catch (err) {
                console.error('Failed to load settings:', err);
                // Default to allowing everything if we can't load settings
            }
        }
        loadSettings();
        return () => {
            document.documentElement.style.cssText = '';
            document.body.style.cssText = '';
            if (nav)
                nav.style.display = prevNavDisplay;
            if (searchTimeoutRef.current)
                clearTimeout(searchTimeoutRef.current);
            if (toastTimeoutRef.current)
                clearTimeout(toastTimeoutRef.current);
        };
    }, []);
    useLayoutEffect(() => {
        if (!actionMenuOpen)
            return;
        if (window.innerWidth <= MOBILE_BREAKPOINT)
            return;
        if (!actionMenuAnchor)
            return;
        // Wait a frame so the portal'd menu is in the DOM and measurable
        requestAnimationFrame(() => {
            const menuEl = actionMenuRef.current;
            if (!menuEl)
                return;
            const gap = 8;
            const menuRect = menuEl.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            // 1) Prefer below the button...
            let top = actionMenuAnchor.bottom + gap;
            // ...but if it overflows bottom, open above.
            if (top + menuRect.height + gap > vh) {
                top = actionMenuAnchor.top - menuRect.height - gap;
            }
            // Clamp vertically into viewport
            top = Math.max(gap, Math.min(top, vh - menuRect.height - gap));
            // 2) Open to the LEFT of the button:
            // align the menu's right edge with the button's right edge
            let left = actionMenuAnchor.right - menuRect.width;
            // Clamp horizontally into viewport
            left = Math.max(gap, Math.min(left, vw - menuRect.width - gap));
            setActionMenuPosition({
                top,
                left,
                width: actionMenuAnchor.width
            });
        });
    }, [actionMenuOpen, actionMenuAnchor]);
    // Save name to localStorage
    useEffect(() => {
        if (requestedBy.trim()) {
            localStorage.setItem('karaoke-name', requestedBy.trim());
        }
    }, [requestedBy]);
    // Helper function to adjust key
    const adjustKey = useCallback((trackKey, delta) => {
        setKeyAdjustments(prev => {
            const next = new Map(prev);
            const currentKey = next.get(trackKey) ?? 0;
            const newKey = currentKey + delta;
            if (newKey >= MIN_KEY_ADJUSTMENT && newKey <= MAX_KEY_ADJUSTMENT) {
                next.set(trackKey, newKey);
            }
            return next;
        });
    }, []);
    // Helper function to calculate and set action menu position
    const handleActionMenuToggle = useCallback((e, trackKey, currentlyOpen) => {
        e.stopPropagation();
        const wasOpen = currentlyOpen === trackKey;
        if (!wasOpen) {
            // Only calculate position for desktop
            if (window.innerWidth > MOBILE_BREAKPOINT) {
                const rect = e.currentTarget.getBoundingClientRect();
                setActionMenuAnchor({
                    top: rect.top,
                    left: rect.left,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width
                });
                // Let useLayoutEffect measure the actual menu size and decide final placement
                setActionMenuPosition({
                    top: rect.bottom + 8,
                    left: rect.left,
                    width: rect.width
                });
            }
            else {
                setActionMenuAnchor(null);
                setActionMenuPosition(null);
            }
        }
        setActionMenuOpen(prev => prev === trackKey ? null : trackKey);
        if (wasOpen)
            setActionMenuAnchor(null);
    }, []);
    // Function to fetch lyrics
    const fetchLyrics = useCallback(async (trackKey, artist, title) => {
        // Set loading state
        setLyricsData(prev => ({
            ...prev,
            [trackKey]: { loading: true, lyrics: null, error: null }
        }));
        try {
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error('Lyrics not found');
            }
            const data = await response.json();
            setLyricsData(prev => ({
                ...prev,
                [trackKey]: { loading: false, lyrics: data.lyrics || 'No lyrics available', error: null }
            }));
        }
        catch (err) {
            const errorMessage = (err instanceof Error && err.name === 'AbortError')
                ? 'Request timeout - please try again'
                : 'Lyrics not found';
            setLyricsData(prev => ({
                ...prev,
                [trackKey]: { loading: false, lyrics: null, error: errorMessage }
            }));
        }
    }, []);
    // Local library search
    const doLocalSearch = useCallback(async () => {
        if (!q.trim()) {
            setLocalRows([]);
            return;
        }
        setBusy(true);
        try {
            let url = `/api/search?q=${encodeURIComponent(q.trim())}`;
            if (kindFilter !== 'all') {
                url += `&kind=${kindFilter}`;
            }
            const r = await api(url);
            setLocalRows(Array.isArray(r) ? r : []);
        }
        catch (err) {
            console.error('Search error:', err);
            setLocalRows([]);
        }
        finally {
            setBusy(false);
        }
    }, [q, kindFilter]);
    // Karaoke Nerds search
    const doKaraokeNerdsSearch = useCallback(async () => {
        if (!q.trim()) {
            setKaraokeNerdsRows([]);
            return;
        }
        setBusy(true);
        try {
            const r = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(q.trim())}`);
            setKaraokeNerdsRows(Array.isArray(r) ? r : []);
        }
        catch (err) {
            console.error('Karaoke Nerds search error:', err);
            setKaraokeNerdsRows([]);
        }
        finally {
            setBusy(false);
        }
    }, [q]);
    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        const delay = searchMode === 'local' ? 300 : 500;
        searchTimeoutRef.current = setTimeout(() => {
            if (searchMode === 'local') {
                doLocalSearch();
            }
            else {
                doKaraokeNerdsSearch();
            }
        }, delay);
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [q, searchMode, doLocalSearch, doKaraokeNerdsSearch]);
    // DON'T clear results when switching modes - just trigger new search
    useEffect(() => {
        if (q.trim()) {
            if (searchMode === 'local') {
                doLocalSearch();
            }
            else {
                doKaraokeNerdsSearch();
            }
        }
    }, [searchMode]);
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✓' : '⚠'}</div>
      <div class="toast-message">${message}</div>
    `;
        document.body.appendChild(toast);
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        toastTimeoutRef.current = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };
    async function enqueueLocal(id, songTitle) {
        const name = requestedBy.trim();
        if (!name) {
            setShowNamePrompt(true);
            document.getElementById('singer-name-input')?.focus();
            return;
        }
        const trackKey = `local-${id}`;
        const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;
        setAddingLocal(id);
        try {
            await api('/api/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackId: id,
                    requestedBy: name,
                    keyAdjustment: keyAdjustment
                })
            });
            // Mark as recently added
            setRecentlyAdded(prev => new Set(prev).add(trackKey));
            setTimeout(() => {
                setRecentlyAdded(prev => {
                    const next = new Set(prev);
                    next.delete(trackKey);
                    return next;
                });
            }, 3000);
            const keyText = keyAdjustment !== 0 ? ` (Key: ${keyAdjustment > 0 ? '+' : ''}${keyAdjustment})` : '';
            showToast(`🎤 "${songTitle}" added for ${name}${keyText}`);
        }
        catch (err) {
            showToast('Failed to add song.  Please try again.', 'error');
            console.error(err);
        }
        finally {
            setAddingLocal(null);
        }
    }
    async function enqueueKaraokeNerds(track) {
        const name = requestedBy.trim();
        if (!name) {
            setShowNamePrompt(true);
            document.getElementById('singer-name-input')?.focus();
            return;
        }
        const trackKey = `kn-${track.url}`;
        const keyAdjustment = keyAdjustments.get(trackKey) ?? 0;
        setAddingKaraokeNerds(track.url);
        try {
            await api('/api/karaoke-nerds/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: track.title,
                    artist: track.artist,
                    url: track.url,
                    requestedBy: name,
                    keyAdjustment: keyAdjustment
                })
            });
            // Mark as recently added
            setRecentlyAdded(prev => new Set(prev).add(trackKey));
            setTimeout(() => {
                setRecentlyAdded(prev => {
                    const next = new Set(prev);
                    next.delete(trackKey);
                    return next;
                });
            }, 3000);
            const keyText = keyAdjustment !== 0 ? ` (Key: ${keyAdjustment > 0 ? '+' : ''}${keyAdjustment})` : '';
            showToast(`🎤 "${track.title}" added for ${name}${keyText}`);
        }
        catch (err) {
            showToast('Failed to add song. Please try again.', 'error');
            console.error(err);
        }
        finally {
            setAddingKaraokeNerds(null);
        }
    }
    return (_jsxs("div", { className: "requests-page", children: [_jsx("style", { children: `
        /* Import Inter font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ripple {
          to {
            transform: scale(1. 5);
            opacity: 0;
          }
        }

        @keyframes toastSlide {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Base styles */
        .requests-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        .container {
          max-width: 768px;
          margin: 0 auto;
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          color: var(--color-text-secondary);
          font-size: clamp(14px, 2.5vw, 16px);
          margin: 0;
        }

        /* Cards */
        .card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          animation: fadeInUp 0.6s ease backwards;
          overflow: hidden;
        }

        .card:nth-child(2) {
          animation-delay: 0.1s;
        }

        .card:nth-child(3) {
          animation-delay: 0.2s;
        }

        /* Singer Input Card */
        .singer-card {
          position: relative;
          overflow: hidden;
        }
        
        .singer-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #6366f1, #a855f7, #ec4899, #6366f1);
          background-size: 300% 300%;
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.3s ease;
          animation: gradient 4s ease infinite;
          z-index: -1;
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .singer-card. has-name::before {
          opacity: 0.3;
        }

        .input-group {
          margin-bottom: 16px;
        }

        . input-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
          transition: color 0.3s ease;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .input-field {
          width: 100%;
          padding: 14px 16px;
          padding-left: 44px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }

        .input-field:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .input-field::placeholder {
          color: var(--color-text-muted);
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          transition: transform 0.3s ease;
        }

        .input-field:focus + .input-icon {
          transform: translateY(-50%) scale(1.1);
        }

        /* Singer Badge */
        .singer-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 100px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          animation: slideIn 0.3s ease;
        }

        .singer-badge-icon {
          font-size: 18px;
          animation: pulse 2s ease infinite;
        }

        /* Name Prompt */
        .name-prompt {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideIn 0.3s ease;
        }

        .name-prompt-icon {
          font-size: 20px;
          animation: pulse 1.5s ease infinite;
        }

        .name-prompt-text {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }

        /* Search Mode Toggle - FIXED SELECTORS WITHOUT SPACES */
        .search-mode-toggle {
          display: flex;
          flex-direction: row;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin-bottom: 20px;
        }

        .mode-button {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: var(--color-bg-secondary);
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid var(--color-border);
        }

        /* Active state - NO SPACES IN SELECTOR */
        .mode-button.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0. 3);
        }

        /* Active state for Karaoke Nerds - NO SPACES IN SELECTOR */
        .mode-button.active. karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        . mode-button:not(.active):hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }

        .mode-icon {
          font-size: 16px;
        }

        /* Search Input */
        .search-wrapper {
          position: relative;
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px;
          padding-left: 48px;
          padding-right: 48px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 16px;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: all 0.3s ease;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-2px);
        }

        .search-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: var(--color-text-muted);
          transition: color 0.3s ease;
        }

        .search-input:focus ~ .search-icon {
          color: var(--color-accent);
        }

        . search-clear {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          font-size: 20px;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          line-height: 1;
        }

        .search-clear. visible {
          opacity: 1;
          visibility: visible;
        }

        .search-clear:hover {
          color: var(--color-text-primary);
        }

        /* Search Filters */
        .search-filters {
          margin-top: 16px;
          animation: fadeInUp 0.3s ease;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: fit-content;
        }

        .filter-toggle:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
        }

        .filter-icon {
          font-size: 16px;
        }

        .filter-chevron {
          font-size: 10px;
          margin-left: 4px;
          transition: transform 0.3s ease;
        }

        .filter-options {
          margin-top: 12px;
          padding: 16px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          animation: slideIn 0.3s ease;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-chip {
          padding: 8px 14px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          color: var(--color-text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filter-chip:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          color: var(--color-text-primary);
          transform: translateY(-1px);
        }

        .filter-chip.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-color: transparent;
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .filter-chip.active:hover {
          background: linear-gradient(135deg, #7c7ff3, #8b91f9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 16px;
        }

        . loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        . loading-text {
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 500;
        }

        /* Results Header */
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--color-border);
          animation: fadeInUp 0.3s ease;
        }

        .results-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .active-filter-badge {
          padding: 4px 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Results - UPDATED WITH RIGHT-SIDE SMALL BUTTON */
        .results-container {
          animation: fadeInUp 0.4s ease;
        }

        .result-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        . result-card:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .result-number {
          min-width: 36px;
          height: 36px;
          background: var(--color-accent);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          color: white;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-title {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-text-primary);
        }

        .result-artist {
          font-size: 14px;
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 6px;
        }

        . result-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: inline-block;
          padding: 2px 6px;
          background: var(--color-bg-primary);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--color-text-muted);
        }

        .meta-tag. brand {
          background: rgba(124, 58, 237, 0.2);
          color: #a855f7;
        }

        /* Add Button - Smaller and on the right */
        .add-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 80px;
        }

        .add-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .add-button:active::before {
          width: 200px;
          height: 200px;
        }

        . add-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .add-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        . add-button.karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        . add-button.karaoke-nerds:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0. 4);
        }

        . add-button.success {
          background: var(--color-success);
          pointer-events: none;
        }

        .add-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        . button-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* Button Container - Flex container for key button and add button */
        .button-container {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        /* Action Menu Button - Single button to open menu */
        .action-menu-button {
          padding: 8px 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .action-menu-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }

        .action-menu-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .action-menu-button.karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
        }

        .action-menu-button.karaoke-nerds:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
        }

        .action-menu-button.success {
          background: var(--color-success);
          pointer-events: none;
        }

        /* Action Menu Overlay for mobile */
        .action-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999;
          animation: fadeIn 0.3s ease;
          display: none;
        }

        @media (max-width: 640px) {
          .action-menu-overlay {
            display: block;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Action Menu Container - Desktop popup */
        .action-menu {
          position: fixed;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 8px;
          min-width: 200px;
          z-index: 1001;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideInDown 0.2s ease;
        }

        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile: Bottom sheet */
        @media (max-width: 640px) {
          .action-menu {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: auto;
            border-radius: 20px 20px 0 0;
            padding: 20px;
            padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
            animation: slideInUp 0.3s ease;
            max-width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1001;
          }

          @keyframes slideInUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        }

        .action-menu-header {
          padding: 8px 12px;
          border-bottom: 1px solid var(--color-border);
          margin-bottom: 8px;
        }

        .action-menu-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .action-menu-subtitle {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 4px 0 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .action-menu-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .action-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .action-menu-item:hover {
          background: var(--color-bg-hover);
        }

        .action-menu-item-icon {
          font-size: 20px;
          width: 24px;
          text-align: center;
        }

        .action-menu-item-content {
          flex: 1;
          min-width: 0;
        }

        .action-menu-item-label {
          display: block;
          font-weight: 600;
        }

        .action-menu-item-description {
          display: block;
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 2px;
        }

        .action-menu-item-value {
          font-size: 12px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .action-menu-item.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .action-menu-item.primary:hover {
          background: linear-gradient(135deg, #7c7ff3, #9d6ff7);
        }

        .action-menu-item.primary .action-menu-item-description {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Key Adjustment View within Action Menu */
        .key-adjustment-view {
          padding: 16px 12px;
          border-top: 1px solid var(--color-border);
          margin-top: 4px;
        }

        .key-adjustment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .key-adjustment-back {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .key-adjustment-back:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .key-adjustment-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .key-adjustment-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px 0;
        }

        .key-adjustment-button {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          border: 2px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .key-adjustment-button:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: scale(1.05);
        }

        .key-adjustment-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .key-adjustment-display {
          min-width: 100px;
          text-align: center;
        }

        .key-adjustment-value {
          font-weight: 700;
          font-size: 24px;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .key-adjustment-label {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }

        /* Mobile optimizations for action menu */
        @media (max-width: 640px) {
          .action-menu-item {
            padding: 16px;
          }

          .action-menu-header {
            padding: 12px 0;
            margin-bottom: 12px;
          }

          .action-menu-title {
            font-size: 16px;
          }

          .key-adjustment-controls {
            padding: 24px 0;
          }

          .key-adjustment-button {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }

          .key-adjustment-value {
            font-size: 28px;
          }
        }

        /* Lyrics Button */
        .lyrics-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text-primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }

        .lyrics-button:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        /* Lyrics Popup/Modal */
        .lyrics-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
          animation: fadeInUp 0.3s ease;
        }

        .lyrics-popup {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: slideIn 0.3s ease;
          z-index: 1201;
        }

        .lyrics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--color-border);
        }

        .lyrics-title-info {
          flex: 1;
          min-width: 0;
        }

        .lyrics-popup-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lyrics-popup-artist {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .lyrics-close-button {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-primary);
          font-size: 20px;
          line-height: 1;
          transition: all 0.3s ease;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .lyrics-close-button:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
        }

        .lyrics-content {
          color: var(--color-text-primary);
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .lyrics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 16px;
        }

        .lyrics-error {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-text-secondary);
        }

        .lyrics-error-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          animation: fadeInUp 0.5s ease;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
          animation: pulse 2s ease infinite;
        }

        .empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        }

        .empty-message {
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        /* Toast Notifications */
        .toast-notification {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(100%);
          background: var(--color-success);
          color: white;
          padding: 14px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 14px;
          z-index: 1300;
          opacity: 0;
          transition: all 0.3s ease;
          max-width: calc(100vw - 48px);
        }

        .toast-notification. show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }

        .toast-notification.error {
          background: var(--color-danger);
        }

        .toast-icon {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .requests-page {
            padding: 12px;
          }

          .card {
            padding: 16px;
            border-radius: 16px;
          }

          . search-mode-toggle {
            position: sticky;
            top: 0;
            z-index: 10;
            backdrop-filter: blur(10px);
            margin-bottom: 16px;
          }

          .result-card {
            padding: 10px;
          }

          .result-number {
            min-width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .result-title {
            font-size: 15px;
          }

          . result-artist {
            font-size: 13px;
          }

          .add-button {
            padding: 7px 14px;
            font-size: 13px;
            min-width: 70px;
          }

          .action-menu-button {
            padding: 7px 14px;
            font-size: 13px;
            min-width: 70px;
          }

          .empty-icon {
            font-size: 48px;
          }
        }

        @media (max-width: 380px) {
          .header-title {
            font-size: 24px;
          }

          .card {
            padding: 14px;
          }

          .mode-button {
            font-size: 13px;
            padding: 10px 8px;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0. 01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          . card {
            border-width: 2px;
          }

          .input-field,
          .search-input {
            border-width: 2px;
          }

          .add-button {
            border: 2px solid white;
          }
        }
      ` }), _jsxs("div", { className: "container", children: [_jsxs("div", { className: "header", children: [_jsx("h1", { className: "header-title", children: "\uD83C\uDFA4 Request a Song" }), _jsx("p", { className: "header-subtitle", children: "Find your favorite songs and rock the stage!" })] }), _jsxs("div", { className: `card singer-card ${requestedBy.trim() ? 'has-name' : ''}`, children: [showNamePrompt && !requestedBy.trim() && (_jsxs("div", { className: "name-prompt", children: [_jsx("span", { className: "name-prompt-icon", children: "\u26A0\uFE0F" }), _jsx("span", { className: "name-prompt-text", children: "Please enter your name to add songs to the queue" })] })), _jsxs("div", { className: "input-group", children: [_jsx("label", { className: "input-label required", htmlFor: "singer-name-input", children: "Your Name" }), _jsxs("div", { className: "input-wrapper", children: [_jsx("input", { id: "singer-name-input", className: "input-field", type: "text", placeholder: "Enter your name...", value: requestedBy, onChange: (e) => {
                                                    setRequestedBy(e.target.value);
                                                    setShowNamePrompt(false);
                                                }, autoComplete: "name", autoCapitalize: "words" }), _jsx("span", { className: "input-icon", children: "\uD83D\uDC64" })] })] }), requestedBy.trim() && (_jsxs("div", { className: "singer-badge", children: [_jsx("span", { className: "singer-badge-icon", children: "\uD83C\uDFB5" }), _jsxs("span", { children: ["Ready to sing as ", _jsx("strong", { children: requestedBy.trim() })] })] }))] }), _jsxs("div", { className: "card", children: [(localLibraryEnabled || externalLibraryEnabled) && (_jsxs("div", { className: "search-mode-toggle", children: [localLibraryEnabled && (_jsxs("button", { className: `mode-button ${searchMode === 'local' ? 'active local' : ''}`, onClick: () => setSearchMode('local'), children: [_jsx("img", { src: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg", alt: "Local Library", className: "mode-icon", style: { width: "20px", height: "20px", marginRight: "6px" } }), _jsx("span", { children: "Local Library" })] })), externalLibraryEnabled && (_jsxs("button", { className: `mode-button ${searchMode === 'karaoke-nerds' ? 'active karaoke-nerds' : ''}`, onClick: () => setSearchMode('karaoke-nerds'), children: [_jsx("img", { src: "https://karaokenerds.com/Content/Icons/favicon.ico", alt: "Karaoke Nerds", style: { width: "20px", height: "20px", marginRight: "6px" } }), _jsx("span", { children: "Karaoke Nerds" })] }))] })), (!localLibraryEnabled && !externalLibraryEnabled) ? (_jsxs("div", { style: {
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: 'var(--color-text-secondary)'
                                }, children: [_jsx("div", { style: { fontSize: '48px', marginBottom: '16px' }, children: "\uD83C\uDFA4" }), _jsx("div", { style: { fontSize: '18px', fontWeight: 500 }, children: "We are not accepting requests at this time." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "search-wrapper", children: [_jsx("input", { className: "search-input", type: "search", placeholder: searchMode === 'local' ? 'Search local songs...' : 'Search online catalog...', value: q, onChange: (e) => setQ(e.target.value), autoComplete: "off", autoCorrect: "off", spellCheck: "false" }), _jsx("span", { className: "search-icon", children: "\uD83D\uDD0D" })] }), searchMode === 'local' && (_jsxs("div", { className: "search-filters", children: [_jsxs("button", { className: "filter-toggle", onClick: () => setShowFilters(!showFilters), "aria-label": "Toggle filters", children: [_jsx("span", { className: "filter-icon", children: "\u2699\uFE0F" }), _jsx("span", { children: "Filters" }), _jsx("span", { className: "filter-chevron", children: showFilters ? '▼' : '▶' })] }), showFilters && (_jsx("div", { className: "filter-options", children: _jsxs("div", { className: "filter-group", children: [_jsx("label", { className: "filter-label", children: "Format" }), _jsxs("div", { className: "filter-chips", children: [_jsx("button", { className: `filter-chip ${kindFilter === 'all' ? 'active' : ''}`, onClick: () => setKindFilter('all'), children: _jsx("span", { children: "All Formats" }) }), _jsx("button", { className: `filter-chip ${kindFilter === 'mp4' ? 'active' : ''}`, onClick: () => setKindFilter('mp4'), children: _jsx("span", { children: "\uD83C\uDFAC MP4 Video" }) }), _jsx("button", { className: `filter-chip ${kindFilter === 'cdgmp3' ? 'active' : ''}`, onClick: () => setKindFilter('cdgmp3'), children: _jsx("span", { children: "\uD83D\uDCC0 CDG+MP3" }) })] })] }) }))] })), busy ? (_jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "loading-spinner" }), _jsx("div", { className: "loading-text", children: searchMode === 'local' ? 'Searching local library...' : 'Searching Karaoke Nerds...' })] })) : searchMode === 'local' && localRows.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "results-header", children: [_jsxs("span", { className: "results-count", children: [localRows.length, " ", localRows.length === 1 ? 'song' : 'songs', " found"] }), kindFilter !== 'all' && (_jsx("span", { className: "active-filter-badge", children: kindFilter === 'mp4' ? '🎬 MP4' : '📀 CDG+MP3' }))] }), _jsx("div", { className: "results-container", children: localRows.map((row, idx) => {
                                                    const trackKey = `local-${row.id}`;
                                                    const isRecentlyAdded = recentlyAdded.has(trackKey);
                                                    const currentKey = keyAdjustments.get(trackKey) ?? 0;
                                                    return (_jsxs("div", { className: "result-card", children: [_jsx("div", { className: "result-number", children: idx + 1 }), _jsxs("div", { className: "result-info", children: [_jsx("div", { className: "result-title", children: row.title || 'Unknown Title' }), _jsx("div", { className: "result-artist", children: row.artist || 'Unknown Artist' }), _jsxs("div", { className: "result-meta", children: [row.disc_id && _jsxs("span", { className: "meta-tag", children: ["\uD83D\uDCC0 ", row.disc_id] }), row.kind && _jsx("span", { className: "meta-tag", children: row.kind.toUpperCase() })] })] }), _jsx("div", { className: "button-container", children: _jsxs("div", { style: { position: 'relative', width: '100%' }, children: [_jsx("button", { className: `action-menu-button ${isRecentlyAdded ? 'success' : ''}`, onClick: (e) => {
                                                                                if (!isRecentlyAdded && addingLocal !== row.id) {
                                                                                    handleActionMenuToggle(e, trackKey, actionMenuOpen);
                                                                                }
                                                                            }, disabled: addingLocal === row.id || isRecentlyAdded, children: addingLocal === row.id ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "button-spinner" }), _jsx("span", { children: "Adding" })] })) : isRecentlyAdded ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "Added" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u22EF" }), _jsx("span", { children: "Options" })] })) }), actionMenuOpen === trackKey && createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: "action-menu-overlay", onClick: () => setActionMenuOpen(null) }), _jsxs("div", { className: "action-menu", ref: actionMenuRef, onClick: (e) => e.stopPropagation(), style: actionMenuPosition ? {
                                                                                        top: `${actionMenuPosition.top}px`,
                                                                                        left: `${actionMenuPosition.left}px`,
                                                                                        width: 'max-content',
                                                                                        minWidth: `${actionMenuPosition.width}px`
                                                                                    } : undefined, children: [_jsxs("div", { className: "action-menu-header", children: [_jsx("h3", { className: "action-menu-title", children: row.title || 'Unknown Title' }), _jsx("p", { className: "action-menu-subtitle", children: row.artist || 'Unknown Artist' })] }), keyAdjustmentView === trackKey ? (_jsxs("div", { className: "key-adjustment-view", children: [_jsxs("div", { className: "key-adjustment-header", children: [_jsxs("button", { className: "key-adjustment-back", onClick: () => setKeyAdjustmentView(null), children: [_jsx("span", { children: "\u2190" }), _jsx("span", { children: "Back" })] }), _jsx("span", { className: "key-adjustment-title", children: "Adjust Key" })] }), _jsxs("div", { className: "key-adjustment-controls", children: [_jsx("button", { className: "key-adjustment-button", onClick: () => adjustKey(trackKey, -1), disabled: (keyAdjustments.get(trackKey) ?? 0) <= MIN_KEY_ADJUSTMENT, "aria-label": "Lower key", children: "\u2212" }), _jsxs("div", { className: "key-adjustment-display", children: [_jsxs("div", { className: "key-adjustment-value", children: ["\uD83C\uDFB9 ", currentKey > 0 ? `+${currentKey}` : currentKey] }), _jsx("div", { className: "key-adjustment-label", children: "Semitones" })] }), _jsx("button", { className: "key-adjustment-button", onClick: () => adjustKey(trackKey, 1), disabled: (keyAdjustments.get(trackKey) ?? 0) >= MAX_KEY_ADJUSTMENT, "aria-label": "Raise key", children: "+" })] })] })) : (_jsxs("div", { className: "action-menu-items", children: [_jsxs("button", { className: "action-menu-item primary", onClick: () => {
                                                                                                        setActionMenuOpen(null);
                                                                                                        enqueueLocal(row.id, row.title || 'Unknown');
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "+" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Add to Queue" }), _jsx("span", { className: "action-menu-item-description", children: "Request this song" })] })] }), _jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setKeyAdjustmentView(trackKey);
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83C\uDFB9" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Adjust Key" }), _jsx("span", { className: "action-menu-item-description", children: "Change pitch" })] }), _jsx("span", { className: "action-menu-item-value", children: currentKey > 0 ? `+${currentKey}` : currentKey })] }), _jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const artist = row.artist || 'Unknown Artist';
                                                                                                        const title = row.title || 'Unknown Title';
                                                                                                        setActionMenuOpen(null);
                                                                                                        setLyricsPopupOpen(trackKey);
                                                                                                        if (!lyricsData[trackKey]) {
                                                                                                            fetchLyrics(trackKey, artist, title);
                                                                                                        }
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83D\uDCC4" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "View Lyrics" }), _jsx("span", { className: "action-menu-item-description", children: "See song words" })] })] })] }))] })] }), document.body)] }) })] }, row.id));
                                                }) })] })) : searchMode === 'karaoke-nerds' && karaokeNerdsRows.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "results-header", children: _jsxs("span", { className: "results-count", children: [karaokeNerdsRows.length, " ", karaokeNerdsRows.length === 1 ? 'song' : 'songs', " found"] }) }), _jsx("div", { className: "results-container", children: karaokeNerdsRows.map((track, idx) => {
                                                    const trackKey = `kn-${track.url}`;
                                                    const isRecentlyAdded = recentlyAdded.has(trackKey);
                                                    const currentKey = keyAdjustments.get(trackKey) ?? 0;
                                                    return (_jsxs("div", { className: "result-card", children: [_jsx("div", { className: "result-number", children: idx + 1 }), _jsxs("div", { className: "result-info", children: [_jsx("div", { className: "result-title", children: track.title }), _jsx("div", { className: "result-artist", children: track.artist || 'Unknown Artist' }), _jsxs("div", { className: "result-meta", children: [track.brand && _jsxs("span", { className: "meta-tag brand", children: ["\uD83C\uDFB5 ", track.brand] }), _jsx("span", { className: "meta-tag", children: "\uD83C\uDF10 Online" })] })] }), _jsx("div", { className: "button-container", children: _jsxs("div", { style: { position: 'relative', width: '100%' }, children: [_jsx("button", { className: `action-menu-button karaoke-nerds ${isRecentlyAdded ? 'success' : ''}`, onClick: (e) => {
                                                                                if (!isRecentlyAdded && addingKaraokeNerds !== track.url) {
                                                                                    handleActionMenuToggle(e, trackKey, actionMenuOpen);
                                                                                }
                                                                            }, disabled: addingKaraokeNerds === track.url || isRecentlyAdded, children: addingKaraokeNerds === track.url ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "button-spinner" }), _jsx("span", { children: "Adding" })] })) : isRecentlyAdded ? (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2713" }), _jsx("span", { children: "Added" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u22EF" }), _jsx("span", { children: "Options" })] })) }), actionMenuOpen === trackKey && createPortal(_jsxs(_Fragment, { children: [_jsx("div", { className: "action-menu-overlay", onClick: () => setActionMenuOpen(null) }), _jsxs("div", { className: "action-menu", ref: actionMenuRef, onClick: (e) => e.stopPropagation(), style: actionMenuPosition ? {
                                                                                        top: `${actionMenuPosition.top}px`,
                                                                                        left: `${actionMenuPosition.left}px`,
                                                                                        width: 'max-content',
                                                                                        minWidth: `${actionMenuPosition.width}px`
                                                                                    } : undefined, children: [_jsxs("div", { className: "action-menu-header", children: [_jsx("h3", { className: "action-menu-title", children: track.title }), _jsx("p", { className: "action-menu-subtitle", children: track.artist || 'Unknown Artist' })] }), _jsxs("div", { className: "action-menu-items", children: [_jsxs("button", { className: "action-menu-item primary", onClick: () => {
                                                                                                        setActionMenuOpen(null);
                                                                                                        enqueueKaraokeNerds(track);
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "+" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "Add to Queue" }), _jsx("span", { className: "action-menu-item-description", children: "Request this song" })] })] }), _jsxs("button", { className: "action-menu-item", onClick: (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const artist = track.artist || 'Unknown Artist';
                                                                                                        const title = track.title;
                                                                                                        setActionMenuOpen(null);
                                                                                                        setLyricsPopupOpen(trackKey);
                                                                                                        if (!lyricsData[trackKey]) {
                                                                                                            fetchLyrics(trackKey, artist, title);
                                                                                                        }
                                                                                                    }, children: [_jsx("span", { className: "action-menu-item-icon", children: "\uD83D\uDCC4" }), _jsxs("div", { className: "action-menu-item-content", children: [_jsx("span", { className: "action-menu-item-label", children: "View Lyrics" }), _jsx("span", { className: "action-menu-item-description", children: "See song words" })] })] })] })] })] }), document.body)] }) })] }, track.url || idx));
                                                }) })] })) : q.trim() ? (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDFB5" }), _jsx("div", { className: "empty-title", children: "No results found" }), _jsx("div", { className: "empty-message", children: searchMode === 'karaoke-nerds'
                                                    ? `No songs found on Karaoke Nerds for "${q}"`
                                                    : `No songs found in library for "${q}"` })] })) : (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83C\uDFA4" }), _jsx("div", { className: "empty-title", children: "Ready to search? " }), _jsx("div", { className: "empty-message", children: searchMode === 'karaoke-nerds'
                                                    ? 'Browse thousands of karaoke tracks online'
                                                    : 'Search our local karaoke library' })] }))] }))] })] }), lyricsPopupOpen && (() => {
                // Find the track data for the popup
                let artist = 'Unknown Artist';
                let title = 'Unknown Title';
                if (lyricsPopupOpen.startsWith('local-')) {
                    const trackId = parseInt(lyricsPopupOpen.replace('local-', ''));
                    const track = localRows.find(r => r.id === trackId);
                    if (track) {
                        artist = track.artist || 'Unknown Artist';
                        title = track.title || 'Unknown Title';
                    }
                }
                else if (lyricsPopupOpen.startsWith('kn-')) {
                    const trackUrl = lyricsPopupOpen.replace('kn-', '');
                    const track = karaokeNerdsRows.find(t => t.url === trackUrl);
                    if (track) {
                        artist = track.artist || 'Unknown Artist';
                        title = track.title;
                    }
                }
                const data = lyricsData[lyricsPopupOpen];
                return (_jsx("div", { className: "lyrics-popup-overlay", onClick: () => setLyricsPopupOpen(null), children: _jsxs("div", { className: "lyrics-popup", ref: lyricsPopupRef, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "lyrics-header", children: [_jsxs("div", { className: "lyrics-title-info", children: [_jsx("h2", { className: "lyrics-popup-title", children: title }), _jsx("p", { className: "lyrics-popup-artist", children: artist })] }), _jsx("button", { className: "lyrics-close-button", onClick: () => setLyricsPopupOpen(null), "aria-label": "Close", children: "\u00D7" })] }), data?.loading ? (_jsxs("div", { className: "lyrics-loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("div", { className: "loading-text", children: "Loading lyrics..." })] })) : data?.error ? (_jsxs("div", { className: "lyrics-error", children: [_jsx("div", { className: "lyrics-error-icon", children: "\uD83D\uDE14" }), _jsx("div", { children: data.error })] })) : data?.lyrics ? (_jsx("div", { className: "lyrics-content", children: data.lyrics })) : null] }) }));
            })()] }));
}
