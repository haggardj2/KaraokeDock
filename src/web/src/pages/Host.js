import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// web/src/pages/Host.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api, API_BASE, getWsUrl } from '../api';
import { useAuth } from '../auth-context';
import { parseBooleanSetting } from '../utils/settings';
import { clearStoredSessionToken, writeStoredSessionToken } from '../session-token';
const LOCAL_SEARCH_DELAY_MS = 300;
const KARAOKE_NERDS_SEARCH_DELAY_MS = 500;
const DEFAULT_BREAK_COLUMNS = {
    song: true,
    artist: true,
    genre: true,
    length: true,
    path: true,
};
const BREAK_COLUMNS_STORAGE_KEY = 'host.breakMusicColumns';
const HOST_CONTROL_BUTTON_COUNT = 6;
function getInitialBreakColumns() {
    if (typeof window === 'undefined')
        return DEFAULT_BREAK_COLUMNS;
    try {
        const raw = window.localStorage.getItem(BREAK_COLUMNS_STORAGE_KEY);
        if (!raw)
            return DEFAULT_BREAK_COLUMNS;
        const parsed = JSON.parse(raw);
        return {
            song: !!parsed?.song,
            artist: !!parsed?.artist,
            genre: !!parsed?.genre,
            length: !!parsed?.length,
            path: !!parsed?.path,
        };
    }
    catch {
        return DEFAULT_BREAK_COLUMNS;
    }
}
export default function Host() {
    const auth = useAuth();
    const [queue, setQueue] = useState([]);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [oidcConfig, setOidcConfig] = useState(null);
    const [banner, setBanner] = useState('');
    const [busy, setBusy] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoPlayDelay, setAutoPlayDelay] = useState(5);
    const [currentTime, setCurrentTime] = useState(0);
    const [actualDuration, setActualDuration] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [replacingId, setReplacingId] = useState(null);
    const [replaceSearchMode, setReplaceSearchMode] = useState('local');
    const [replaceUrl, setReplaceUrl] = useState('');
    const [replaceTitle, setReplaceTitle] = useState('');
    const [replaceArtist, setReplaceArtist] = useState('');
    const [replaceDiscId, setReplaceDiscId] = useState('');
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);
    const [overlayVisible, setOverlayVisible] = useState(true);
    const [overlayHeight, setOverlayHeight] = useState(90);
    const [qrSize, setQrSize] = useState(60);
    const [customMessage, setCustomMessage] = useState('');
    const [showRoller, setShowRoller] = useState(true);
    const [showQrCode, setShowQrCode] = useState(true);
    const [hideSingerQueue, setHideSingerQueue] = useState(false);
    const [showPlayerWindowControl, setShowPlayerWindowControl] = useState(false);
    const [showAccountManagement, setShowAccountManagement] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [changingUsername, setChangingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernamePassword, setUsernamePassword] = useState('');
    const [usernameError, setUsernameError] = useState('');
    // Manual request modal state
    const [showManualRequest, setShowManualRequest] = useState(false);
    const [manualRequestMode, setManualRequestMode] = useState('local');
    const [manualRequestQuery, setManualRequestQuery] = useState('');
    const [manualRequestResults, setManualRequestResults] = useState([]);
    const [manualRequestName, setManualRequestName] = useState('');
    const [manualRequestUrl, setManualRequestUrl] = useState('');
    const [manualRequestTitle, setManualRequestTitle] = useState('');
    const [manualRequestArtist, setManualRequestArtist] = useState('');
    const [manualRequestDiscId, setManualRequestDiscId] = useState('');
    // Library availability settings
    const [localLibraryEnabled, setLocalLibraryEnabled] = useState(true);
    const [externalLibraryEnabled, setExternalLibraryEnabled] = useState(true);
    // Download settings
    const [allowDownloads, setAllowDownloads] = useState(true);
    const [downloadingTrack, setDownloadingTrack] = useState(null);
    const [breakMusicPaused, setBreakMusicPaused] = useState(false);
    const [breakMusicTrack, setBreakMusicTrack] = useState(null);
    const [breakMusicRemainingSec, setBreakMusicRemainingSec] = useState(null);
    const [breakMusicCrossfadeSec, setBreakMusicCrossfadeSec] = useState(3);
    const [breakMusicVolumePercent, setBreakMusicVolumePercent] = useState(100);
    const [breakMusicResumeDelay, setBreakMusicResumeDelay] = useState(2);
    const [showBreakPlaylistModal, setShowBreakPlaylistModal] = useState(false);
    const [breakSearchQuery, setBreakSearchQuery] = useState('');
    const [breakLibraryTracks, setBreakLibraryTracks] = useState([]);
    const [breakPlaylistTracks, setBreakPlaylistTracks] = useState([]);
    const [breakPlaylistTrackIds, setBreakPlaylistTrackIds] = useState([]);
    const [breakDraggedTrackId, setBreakDraggedTrackId] = useState(null);
    const [breakDraggedPlaylistIndex, setBreakDraggedPlaylistIndex] = useState(null);
    const [breakColumns, setBreakColumns] = useState(() => getInitialBreakColumns());
    const [breakColumnWidths, setBreakColumnWidths] = useState({
        song: 220,
        artist: 180,
        genre: 140,
        length: 96,
        path: 320,
    });
    const [breakPlaylists, setBreakPlaylists] = useState([]);
    const [activeBreakPlaylistId, setActiveBreakPlaylistId] = useState(null);
    const [selectedBreakPlaylistId, setSelectedBreakPlaylistId] = useState('');
    const [breakPlaylistIndex, setBreakPlaylistIndex] = useState(0);
    const [breakSort, setBreakSort] = useState({ column: 'artist', direction: 'asc' });
    const [showBreakColumnMenu, setShowBreakColumnMenu] = useState(false);
    const [breakLibraryPanePercent, setBreakLibraryPanePercent] = useState(62);
    // Rotation settings
    const [activeRotationId, setActiveRotationId] = useState(null);
    const [rotationType, setRotationType] = useState('strict_round_robin');
    const [savingRotationType, setSavingRotationType] = useState(false);
    const [showRotationInfo, setShowRotationInfo] = useState(false);
    // Nested singer queue state
    const [queueState, setQueueState] = useState(null);
    const [selectedSingerId, setSelectedSingerId] = useState(null);
    const [selectedSingerHistory, setSelectedSingerHistory] = useState(null);
    const [singerModalOpen, setSingerModalOpen] = useState(false);
    const [singerModalLoading, setSingerModalLoading] = useState(false);
    const [singerDraggedId, setSingerDraggedId] = useState(null);
    const [singerDragOverId, setSingerDragOverId] = useState(null);
    const [modalSongDraggedId, setModalSongDraggedId] = useState(null);
    const [modalSongDragOverId, setModalSongDragOverId] = useState(null);
    const wsRef = useRef(null);
    const autoPlayTimerRef = useRef(null);
    const songTimerRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const manualRequestSearchTimeoutRef = useRef(null);
    const autoPlayDelayRef = useRef(autoPlayDelay);
    const autoPlayEnabledRef = useRef(autoPlay);
    const lastWebSocketUpdateRef = useRef(0);
    const explicitStopRef = useRef(false);
    const autoPlayScheduledRef = useRef(false);
    const wsHeartbeatRef = useRef(null);
    const durationSetForSongRef = useRef(false);
    const breakPlaylistTracksRef = useRef([]);
    const breakColumnMenuRef = useRef(null);
    const breakManagerLayoutRef = useRef(null);
    const breakPlaylistSyncRequestRef = useRef(0);
    const breakVolumeSaveTimeoutRef = useRef(null);
    const headers = useMemo(() => ({ 'x-session-token': auth.sessionToken, 'Content-Type': 'application/json' }), [auth.sessionToken]);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const oidcCode = params.get('oidc_code');
        const oidcError = params.get('oidc_error');
        if (oidcCode) {
            api('/api/auth/oidc/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: oidcCode })
            })
                .then((result) => {
                auth.setSessionToken(result.sessionToken);
                writeStoredSessionToken(result.sessionToken);
                auth.setIsLoggedIn(true);
                auth.setRole(result.role || 'user');
                auth.setProfile({
                    username: result.username || '',
                    displayName: result.displayName || '',
                    picture: result.picture || ''
                });
                window.history.replaceState({}, '', window.location.pathname);
            })
                .catch((err) => {
                setLoginError(`SSO login failed: ${String(err?.message || 'Unable to complete login')}`);
                window.history.replaceState({}, '', window.location.pathname);
            });
        }
        else if (oidcError) {
            setLoginError(`SSO login failed: ${decodeURIComponent(oidcError)}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
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
        refreshQueue();
        refreshQueueState();
        api('/api/auth/oidc/config')
            .then((cfg) => setOidcConfig(cfg))
            .catch(() => { });
        return () => {
            document.documentElement.style.cssText = '';
            document.body.style.cssText = '';
            if (searchTimeoutRef.current)
                clearTimeout(searchTimeoutRef.current);
            if (manualRequestSearchTimeoutRef.current)
                clearTimeout(manualRequestSearchTimeoutRef.current);
            if (breakVolumeSaveTimeoutRef.current)
                clearTimeout(breakVolumeSaveTimeoutRef.current);
        };
    }, []);
    async function handleLogin(e) {
        e.preventDefault();
        setLoginError('');
        setBusy(true);
        try {
            const result = await api('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUsername, password: loginPassword })
            });
            if (result.ok && result.sessionToken) {
                auth.setSessionToken(result.sessionToken);
                writeStoredSessionToken(result.sessionToken);
                auth.setIsLoggedIn(true);
                auth.setRole(result.role || 'user');
                setLoginPassword('');
                auth.setIsDefaultPassword(result.isDefaultPassword || false);
                auth.setProfile({
                    username: result.username || '',
                    displayName: result.displayName || '',
                    picture: result.picture || ''
                });
                if (result.isDefaultPassword) {
                    setBanner('⚠️ You are using the default password. Please change it in Account Settings.');
                }
            }
            else {
                setLoginError('Invalid password');
            }
        }
        catch (err) {
            setLoginError('Login failed.  Please try again.');
        }
        finally {
            setBusy(false);
        }
    }
    // Validate session on mount
    useEffect(() => {
        async function validateSession() {
            if (!auth.sessionToken) {
                auth.setIsLoggedIn(false);
                return;
            }
            try {
                const result = await api('/api/auth/validate', {
                    headers: { 'x-session-token': auth.sessionToken }
                });
                if (result.valid) {
                    auth.setIsLoggedIn(true);
                    auth.setRole(result.role || 'user');
                    auth.setProfile({
                        username: result.username || '',
                        displayName: result.displayName || '',
                        picture: result.picture || ''
                    });
                }
                else {
                    auth.setIsLoggedIn(false);
                    auth.setSessionToken('');
                    auth.clearProfile();
                    clearStoredSessionToken();
                }
            }
            catch (err) {
                auth.setIsLoggedIn(false);
                auth.setSessionToken('');
                auth.clearProfile();
                clearStoredSessionToken();
            }
        }
        validateSession();
    }, [auth.sessionToken]);
    useEffect(() => {
        const handleShowAccountManagement = () => {
            setShowAccountManagement(true);
        };
        window.addEventListener('showAccountManagement', handleShowAccountManagement);
        return () => {
            window.removeEventListener('showAccountManagement', handleShowAccountManagement);
        };
    }, []);
    async function handleChangePassword(e) {
        e.preventDefault();
        setPasswordError('');
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters long');
            return;
        }
        setBusy(true);
        try {
            await api('/api/auth/change-password', {
                method: 'POST',
                headers,
                body: JSON.stringify({ currentPassword, newPassword })
            });
            setBanner('Password changed successfully');
            setChangingPassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            auth.setIsDefaultPassword(false);
        }
        catch (err) {
            setPasswordError(err?.message || 'Failed to change password');
        }
        finally {
            setBusy(false);
        }
    }
    async function handleChangeUsername(e) {
        e.preventDefault();
        setUsernameError('');
        if (!newUsername.trim() || newUsername.trim().length < 3) {
            setUsernameError('Username must be at least 3 characters long');
            return;
        }
        if (!usernamePassword) {
            setUsernameError('Please enter your current password to confirm');
            return;
        }
        const trimmedUsername = newUsername.trim();
        setBusy(true);
        try {
            await api('/api/auth/change-username', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    newUsername: trimmedUsername,
                    currentPassword: usernamePassword
                }),
            });
            setBanner('Username changed successfully');
            setChangingUsername(false);
            setNewUsername('');
            setUsernamePassword('');
            setUsernameError('');
            auth.setProfile({ username: trimmedUsername, displayName: trimmedUsername });
        }
        catch (err) {
            setUsernameError(err?.message || 'Failed to change username');
        }
        finally {
            setBusy(false);
        }
    }
    // Load library availability settings
    useEffect(() => {
        async function loadSettings() {
            // Only load settings if authenticated
            if (!auth.sessionToken || !auth.isLoggedIn) {
                return;
            }
            try {
                const settings = await api('/api/admin/settings', { headers });
                const localEnabled = parseBooleanSetting(settings['libraries.local_enabled']);
                const externalEnabled = parseBooleanSetting(settings['libraries.external_enabled']);
                const downloadsAllowed = parseBooleanSetting(settings['ytdlp.allow_downloads']);
                setLocalLibraryEnabled(localEnabled);
                setExternalLibraryEnabled(externalEnabled);
                setAllowDownloads(downloadsAllowed);
                // Switch to an enabled mode, preferring local
                if (localEnabled) {
                    setReplaceSearchMode('local');
                }
                else if (externalEnabled) {
                    setReplaceSearchMode('karaoke-nerds');
                }
                // If both are disabled, leave current mode (it won't be used anyway)
            }
            catch (err) {
                console.error('Failed to load settings:', err);
            }
        }
        loadSettings();
        loadBreakMusicState();
    }, [auth.sessionToken, auth.isLoggedIn, headers]);
    async function loadBreakMusicState() {
        try {
            const state = await api('/api/break-music/state');
            const nextPlaylistIndex = Number(state.playlistIndex);
            setBreakMusicPaused(!!state.paused);
            setBreakMusicTrack(state.currentTrack || null);
            setBreakMusicRemainingSec(typeof state.remainingSec === 'number' ? state.remainingSec : null);
            setBreakPlaylistTrackIds(Array.isArray(state.playlistTrackIds) ? state.playlistTrackIds : []);
            setBreakPlaylistIndex(Number.isFinite(nextPlaylistIndex) ? nextPlaylistIndex : 0);
            if (typeof state.crossfadeSeconds === 'number') {
                setBreakMusicCrossfadeSec(state.crossfadeSeconds);
            }
            if (typeof state.volumePercent === 'number') {
                setBreakMusicVolumePercent(Math.max(0, Math.min(100, Math.round(state.volumePercent))));
            }
            if (typeof state.resumeDelaySec === 'number') {
                setBreakMusicResumeDelay(Math.max(0, Math.min(30, Math.round(state.resumeDelaySec))));
            }
            setBreakPlaylists(state.playlists || []);
            const nextActivePlaylistId = Number.isFinite(Number(state.activePlaylistId)) ? Number(state.activePlaylistId) : null;
            setActiveBreakPlaylistId(nextActivePlaylistId);
            setSelectedBreakPlaylistId(nextActivePlaylistId != null ? String(nextActivePlaylistId) : '');
        }
        catch (err) {
            console.error('Failed to load break music state:', err);
        }
    }
    async function updateBreakCrossfade(seconds) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        await api('/api/break-music/settings', {
            method: 'POST',
            headers,
            body: JSON.stringify({ crossfadeSeconds: seconds }),
        });
    }
    async function updateBreakVolume(volumePercent) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        await api('/api/break-music/settings', {
            method: 'POST',
            headers,
            body: JSON.stringify({ volumePercent }),
        });
    }
    async function updateBreakResumeDelay(resumeDelaySec) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        await api('/api/break-music/settings', {
            method: 'POST',
            headers,
            body: JSON.stringify({ resumeDelaySec }),
        });
    }
    function scheduleBreakVolumeUpdate(volumePercent) {
        if (breakVolumeSaveTimeoutRef.current) {
            clearTimeout(breakVolumeSaveTimeoutRef.current);
        }
        breakVolumeSaveTimeoutRef.current = setTimeout(() => {
            void updateBreakVolume(volumePercent);
            breakVolumeSaveTimeoutRef.current = null;
        }, 160);
    }
    async function controlBreakMusic(action) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        await api('/api/break-music/control', {
            method: 'POST',
            headers,
            body: JSON.stringify({ action }),
        });
        await loadBreakMusicState();
    }
    async function loadBreakMusicLibrary(query = '') {
        if (!auth.sessionToken || !auth.isLoggedIn) {
            console.warn('Cannot load break music library without authentication');
            return [];
        }
        try {
            const result = await api(`/api/break-music/search?q=${encodeURIComponent(query)}`, { headers });
            const tracks = Array.isArray(result) ? result : [];
            setBreakLibraryTracks(tracks);
            return tracks;
        }
        catch {
            setBreakLibraryTracks([]);
            return [];
        }
    }
    async function openBreakMusicManager() {
        setShowBreakPlaylistModal(true);
        const tracks = await loadBreakMusicLibrary('');
        const byId = new Map(tracks.map((t) => [t.id, t]));
        const next = breakPlaylistTrackIds
            .map((id) => byId.get(id))
            .filter((v) => !!v);
        setBreakPlaylistTracks(next);
        breakPlaylistTracksRef.current = next;
    }
    async function refreshBreakMusicManager() {
        const tracks = await loadBreakMusicLibrary('');
        const byId = new Map(tracks.map((t) => [t.id, t]));
        const next = breakPlaylistTracksRef.current.map((t) => byId.get(t.id) || t);
        setBreakPlaylistTracks(next);
        breakPlaylistTracksRef.current = next;
    }
    async function saveBreakPlaylist() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        if (breakPlaylistTracks.length === 0)
            return;
        const existingName = breakPlaylists.find((playlist) => String(playlist.id) === selectedBreakPlaylistId)?.name || '';
        const enteredName = window.prompt('Save playlist as:', existingName);
        if (enteredName === null)
            return;
        const name = enteredName.trim();
        if (!name) {
            window.alert('Playlist name is required.');
            return;
        }
        const result = await api('/api/break-music/playlists', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name,
                trackIds: breakPlaylistTracks.map((t) => t.id),
            }),
        });
        await loadBreakMusicState();
        if (result?.playlistId) {
            setSelectedBreakPlaylistId(String(result.playlistId));
        }
    }
    async function loadBreakPlaylist(playlistId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        await api('/api/break-music/playlists/load', {
            method: 'POST',
            headers,
            body: JSON.stringify({ playlistId }),
        });
        setSelectedBreakPlaylistId(String(playlistId));
        await loadBreakMusicState();
        await refreshBreakMusicManager();
    }
    async function syncBreakActivePlaylist(nextTracks) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const requestId = ++breakPlaylistSyncRequestRef.current;
        try {
            const result = await api('/api/break-music/playlist/active', {
                method: 'POST',
                headers,
                body: JSON.stringify({ trackIds: nextTracks.map((t) => t.id) }),
            });
            if (requestId !== breakPlaylistSyncRequestRef.current)
                return;
            const nextPlaylistIndex = Number(result?.playlistIndex);
            setBreakPlaylistTrackIds(Array.isArray(result?.trackIds) ? result.trackIds : []);
            setBreakPlaylistIndex(Number.isFinite(nextPlaylistIndex) ? nextPlaylistIndex : 0);
            setBreakMusicTrack(result?.currentTrack || null);
            await loadBreakMusicState();
        }
        catch (err) {
            console.error('Failed to sync active break playlist:', err);
            if (requestId === breakPlaylistSyncRequestRef.current) {
                setBanner('⚠️ Failed to update active break playlist');
                setTimeout(() => setBanner(''), 4000);
            }
        }
    }
    function setBreakPlaylistTracksAndSync(nextTracks) {
        setBreakPlaylistTracks(nextTracks);
        breakPlaylistTracksRef.current = nextTracks;
        void syncBreakActivePlaylist(nextTracks);
    }
    function addBreakTrackToPlaylist(track) {
        const playlist = breakPlaylistTracksRef.current;
        const hasIndexedCurrentTrack = breakMusicTrack != null &&
            breakPlaylistIndex >= 0 &&
            breakPlaylistIndex < playlist.length &&
            playlist[breakPlaylistIndex]?.id === breakMusicTrack.id;
        const insertAt = hasIndexedCurrentTrack ? breakPlaylistIndex + 1 : playlist.length;
        const next = [...playlist];
        next.splice(insertAt, 0, track);
        setBreakPlaylistTracksAndSync(next);
    }
    function removeBreakTrackFromPlaylist(index) {
        const playlist = breakPlaylistTracksRef.current;
        if (index < 0 || index >= playlist.length)
            return;
        const next = playlist.filter((_, i) => i !== index);
        setBreakPlaylistTracksAndSync(next);
    }
    function clearBreakPlaylist() {
        setBreakPlaylistTracksAndSync([]);
    }
    function addAllBreakTracksToPlaylist() {
        const toAdd = sortedFilteredBreakLibraryTracks;
        if (toAdd.length === 0)
            return;
        const playlist = breakPlaylistTracksRef.current;
        const existingIds = new Set(playlist.map((t) => t.id));
        const newTracks = toAdd.filter((t) => !existingIds.has(t.id));
        if (newTracks.length === 0)
            return;
        const hasIndexedCurrentTrack = breakMusicTrack != null &&
            breakPlaylistIndex >= 0 &&
            breakPlaylistIndex < playlist.length &&
            playlist[breakPlaylistIndex]?.id === breakMusicTrack.id;
        const insertAt = hasIndexedCurrentTrack ? breakPlaylistIndex + 1 : playlist.length;
        const next = [...playlist];
        next.splice(insertAt, 0, ...newTracks);
        setBreakPlaylistTracksAndSync(next);
    }
    function shuffleBreakPlaylist() {
        const playlist = [...breakPlaylistTracksRef.current];
        if (playlist.length < 2)
            return;
        for (let i = playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
        }
        // Pin the currently playing track at position 0 so that after it finishes,
        // playback continues through the full new shuffled order from the beginning.
        if (breakMusicTrack) {
            const currentIdx = playlist.findIndex((t) => t.id === breakMusicTrack.id);
            if (currentIdx > 0) {
                const [current] = playlist.splice(currentIdx, 1);
                playlist.unshift(current);
            }
        }
        setBreakPlaylistTracksAndSync(playlist);
    }
    function moveBreakTrackInPlaylist(index, direction) {
        const playlist = breakPlaylistTracksRef.current;
        const target = index + direction;
        if (target < 0 || target >= playlist.length)
            return;
        const next = [...playlist];
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item);
        setBreakPlaylistTracksAndSync(next);
    }
    function moveBreakTrackToPlaylistIndex(fromIndex, targetIndex) {
        const playlist = breakPlaylistTracksRef.current;
        if (fromIndex < 0 ||
            fromIndex >= playlist.length ||
            targetIndex < 0 ||
            targetIndex >= playlist.length ||
            fromIndex === targetIndex) {
            return;
        }
        const next = [...playlist];
        const [item] = next.splice(fromIndex, 1);
        next.splice(targetIndex, 0, item);
        setBreakPlaylistTracksAndSync(next);
    }
    const filteredBreakLibraryTracks = useMemo(() => {
        const q = breakSearchQuery.trim().toLowerCase();
        if (!q)
            return breakLibraryTracks;
        return breakLibraryTracks.filter((track) => {
            const hay = [
                track.title || '',
                track.artist || '',
                track.genre || '',
                track.file_path || '',
            ].join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [breakLibraryTracks, breakSearchQuery]);
    const breakPlaylistDurationMs = useMemo(() => breakPlaylistTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0), [breakPlaylistTracks]);
    const currentBreakPlaylistRowIndex = useMemo(() => {
        if (!breakMusicTrack)
            return -1;
        const indexedTrackId = breakPlaylistTracks[breakPlaylistIndex]?.id;
        if (indexedTrackId === breakMusicTrack.id)
            return breakPlaylistIndex;
        return breakPlaylistTracks.findIndex((item) => item.id === breakMusicTrack.id);
    }, [breakMusicTrack, breakPlaylistTracks, breakPlaylistIndex]);
    const activeBreakPlaylistName = useMemo(() => {
        if (activeBreakPlaylistId == null)
            return '';
        return breakPlaylists.find((playlist) => playlist.id === activeBreakPlaylistId)?.name || '';
    }, [activeBreakPlaylistId, breakPlaylists]);
    useEffect(() => {
        if (!showBreakPlaylistModal || breakLibraryTracks.length === 0)
            return;
        const byId = new Map(breakLibraryTracks.map((t) => [t.id, t]));
        const next = breakPlaylistTrackIds
            .map((id) => byId.get(id))
            .filter((v) => !!v);
        setBreakPlaylistTracks(next);
        breakPlaylistTracksRef.current = next;
    }, [showBreakPlaylistModal, breakPlaylistTrackIds, breakLibraryTracks]);
    useEffect(() => {
        if (!showBreakColumnMenu)
            return;
        const onPointerDown = (event) => {
            if (!breakColumnMenuRef.current?.contains(event.target)) {
                setShowBreakColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [showBreakColumnMenu]);
    useEffect(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(BREAK_COLUMNS_STORAGE_KEY, JSON.stringify(breakColumns));
    }, [breakColumns]);
    function formatDurationMs(ms) {
        if (!ms || ms <= 0)
            return '—';
        return formatTime(Math.floor(ms / 1000));
    }
    function toggleBreakColumn(column) {
        setBreakColumns((prev) => ({ ...prev, [column]: !prev[column] }));
    }
    function breakColumnEnabled(column) {
        return !!breakColumns[column];
    }
    function updateBreakColumnWidth(column, width) {
        setBreakColumnWidths((prev) => ({ ...prev, [column]: width }));
    }
    function getBreakColumnLimits(column) {
        if (column === 'length')
            return { min: 72, max: 180 };
        if (column === 'path')
            return { min: 180, max: 640 };
        return { min: 100, max: 420 };
    }
    function startBreakColumnResize(column, event) {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startWidth = breakColumnWidths[column];
        const { min, max } = getBreakColumnLimits(column);
        const onMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const width = Math.min(max, Math.max(min, startWidth + delta));
            updateBreakColumnWidth(column, width);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }
    function toggleBreakSort(column) {
        setBreakSort((prev) => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: 'asc' };
        });
    }
    const sortedFilteredBreakLibraryTracks = useMemo(() => {
        const tracks = [...filteredBreakLibraryTracks];
        const directionMultiplier = breakSort.direction === 'asc' ? 1 : -1;
        const compareText = (a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });
        tracks.sort((a, b) => {
            let result = 0;
            if (breakSort.column === 'song')
                result = compareText(a.title, b.title);
            else if (breakSort.column === 'artist')
                result = compareText(a.artist, b.artist) || compareText(a.title, b.title);
            else if (breakSort.column === 'genre')
                result = compareText(a.genre, b.genre) || compareText(a.title, b.title);
            else if (breakSort.column === 'length')
                result = (a.duration_ms || 0) - (b.duration_ms || 0);
            else if (breakSort.column === 'path')
                result = compareText(a.file_path, b.file_path);
            return result * directionMultiplier;
        });
        return tracks;
    }, [filteredBreakLibraryTracks, breakSort]);
    function buildBreakGridTemplate() {
        const cols = [];
        cols.push('48px');
        if (breakColumnEnabled('song'))
            cols.push(`minmax(140px, ${breakColumnWidths.song}px)`);
        if (breakColumnEnabled('artist'))
            cols.push(`minmax(120px, ${breakColumnWidths.artist}px)`);
        if (breakColumnEnabled('genre'))
            cols.push(`minmax(100px, ${breakColumnWidths.genre}px)`);
        if (breakColumnEnabled('length'))
            cols.push(`${breakColumnWidths.length}px`);
        if (breakColumnEnabled('path'))
            cols.push(`minmax(180px, ${breakColumnWidths.path}px)`);
        return cols.join(' ');
    }
    function canDropOnBreakPlaylist(ev) {
        return ev.dataTransfer.types?.includes('text/plain') || breakDraggedTrackId !== null || breakDraggedPlaylistIndex !== null;
    }
    function getBreakDraggedTrackId(ev) {
        const raw = ev.dataTransfer.getData('text/plain');
        const parsed = Number(raw);
        if (Number.isFinite(parsed))
            return parsed;
        return breakDraggedTrackId;
    }
    function startBreakPaneResize(event) {
        event.preventDefault();
        const layout = breakManagerLayoutRef.current;
        if (!layout)
            return;
        const bounds = layout.getBoundingClientRect();
        const onMove = (moveEvent) => {
            const relative = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
            const clamped = Math.max(35, Math.min(80, relative));
            setBreakLibraryPanePercent(clamped);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }
    function closeBreakMusicManager() {
        setShowBreakColumnMenu(false);
        setShowBreakPlaylistModal(false);
    }
    // Update refs when state changes
    useEffect(() => {
        autoPlayDelayRef.current = autoPlayDelay;
    }, [autoPlayDelay]);
    useEffect(() => {
        autoPlayEnabledRef.current = autoPlay;
        if (autoPlay) {
            explicitStopRef.current = false;
        }
    }, [autoPlay]);
    async function updateAutoPlaySettings(enabled, delay) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        try {
            await api('/api/autoplay/settings', {
                method: 'POST',
                headers,
                body: JSON.stringify({ enabled, delay })
            });
        }
        catch (err) {
            console.error('Failed to update autoplay settings:', err);
        }
    }
    async function refreshQueue() {
        const q = await api('/api/queue');
        setQueue(q || []);
    }
    async function refreshQueueState() {
        try {
            const state = await api('/api/queue/state');
            setQueueState(state || null);
        }
        catch (err) {
            console.error('Failed to load queue state:', err);
        }
    }
    async function openSingerModal(singerId) {
        setSelectedSingerId(singerId);
        setSingerModalOpen(true);
        setSingerModalLoading(true);
        setSelectedSingerHistory(null);
        try {
            const history = await api(`/api/singers/${singerId}/history`, { headers });
            setSelectedSingerHistory(history || null);
        }
        catch (err) {
            console.error('Failed to load singer history:', err);
        }
        finally {
            setSingerModalLoading(false);
        }
    }
    function closeSingerModal() {
        setSingerModalOpen(false);
        setSelectedSingerId(null);
        setSelectedSingerHistory(null);
    }
    async function handleModalSongDrop(targetQueueId) {
        setModalSongDragOverId(null);
        if (!modalSongDraggedId || modalSongDraggedId === targetQueueId || !selectedSingerId) {
            setModalSongDraggedId(null);
            return;
        }
        if (!auth.sessionToken || !auth.isLoggedIn || !selectedSingerHistory) {
            setModalSongDraggedId(null);
            return;
        }
        const songs = selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued');
        const fromIdx = songs.findIndex(s => s.queueId === modalSongDraggedId);
        const toIdx = songs.findIndex(s => s.queueId === targetQueueId);
        if (fromIdx < 0 || toIdx < 0) {
            setModalSongDraggedId(null);
            return;
        }
        const reordered = [...songs];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        try {
            await api(`/api/singers/${selectedSingerId}/song-order`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ queueIds: reordered.map(s => s.queueId) }),
            });
            await refreshQueueState();
            const history = await api(`/api/singers/${selectedSingerId}/history`, { headers });
            setSelectedSingerHistory(history || null);
        }
        catch (err) {
            console.error('Failed to reorder singer queue:', err);
        }
        finally {
            setModalSongDraggedId(null);
        }
    }
    async function handleModalSongMoveInQueue(queueId, direction) {
        if (!selectedSingerHistory || !selectedSingerId)
            return;
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const songs = selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued');
        const idx = songs.findIndex(s => s.queueId === queueId);
        if (idx < 0)
            return;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= songs.length)
            return;
        const reordered = [...songs];
        [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
        try {
            await api(`/api/singers/${selectedSingerId}/song-order`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ queueIds: reordered.map(s => s.queueId) }),
            });
            await refreshQueueState();
            const history = await api(`/api/singers/${selectedSingerId}/history`, { headers });
            setSelectedSingerHistory(history || null);
        }
        catch (err) {
            console.error('Failed to reorder singer queue:', err);
        }
    }
    async function restoreSongToQueue(queueId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api(`/api/queue/${queueId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: 'queued' }),
            });
            await refreshQueueState();
            // Reload singer history if a modal is open
            if (selectedSingerId) {
                const history = await api(`/api/singers/${selectedSingerId}/history`, { headers });
                setSelectedSingerHistory(history || null);
            }
        }
        catch (err) {
            console.error('Failed to restore song to queue:', err);
        }
        finally {
            setBusy(false);
        }
    }
    async function removeSongFromQueue(queueId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api(`/api/queue/${queueId}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: 'removed' }),
            });
            await refreshQueueState();
            // Reload singer history if a modal is open
            if (selectedSingerId) {
                const history = await api(`/api/singers/${selectedSingerId}/history`, { headers });
                setSelectedSingerHistory(history || null);
            }
        }
        catch (err) {
            console.error('Failed to remove song from queue:', err);
        }
        finally {
            setBusy(false);
        }
    }
    async function moveSinger(singerId, direction) {
        if (!auth.sessionToken || !auth.isLoggedIn || !queueState?.activeRotation)
            return;
        const rotationId = queueState.activeRotation.id;
        const singers = queueState.queueOrder;
        const idx = singers.findIndex(s => s.singerId === singerId);
        if (idx < 0)
            return;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= singers.length)
            return;
        // Swap positions
        const currentPos = singers[idx].position ?? idx + 1;
        const targetPos = singers[targetIdx].position ?? targetIdx + 1;
        try {
            await api(`/api/rotations/${rotationId}/singers/${singerId}/position`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ position: targetPos }),
            });
            await api(`/api/rotations/${rotationId}/singers/${singers[targetIdx].singerId}/position`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ position: currentPos }),
            });
            await refreshQueueState();
        }
        catch (err) {
            console.error('Failed to move singer:', err);
        }
    }
    function handleSingerDragStart(singerId) {
        setSingerDraggedId(singerId);
    }
    function handleSingerDragEnd() {
        setSingerDraggedId(null);
        setSingerDragOverId(null);
    }
    function handleSingerDragOver(e, singerId) {
        e.preventDefault();
        setSingerDragOverId(singerId);
    }
    async function handleSingerDrop(e, targetSingerId) {
        e.preventDefault();
        setSingerDragOverId(null);
        if (!singerDraggedId || singerDraggedId === targetSingerId) {
            setSingerDraggedId(null);
            return;
        }
        if (!auth.sessionToken || !auth.isLoggedIn || !queueState?.activeRotation) {
            setSingerDraggedId(null);
            return;
        }
        const rotationId = queueState.activeRotation.id;
        const singers = queueState.queueOrder;
        const fromIdx = singers.findIndex(s => s.singerId === singerDraggedId);
        const toIdx = singers.findIndex(s => s.singerId === targetSingerId);
        if (fromIdx < 0 || toIdx < 0) {
            setSingerDraggedId(null);
            return;
        }
        // Build new order
        const reordered = [...singers];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        // Assign sequential positions starting from the minimum existing position
        const minPos = Math.min(...singers.map(s => s.position ?? 999));
        try {
            for (let i = 0; i < reordered.length; i++) {
                await api(`/api/rotations/${rotationId}/singers/${reordered[i].singerId}/position`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ position: minPos + i }),
                });
            }
            await refreshQueueState();
        }
        catch (err) {
            console.error('Failed to reorder singers:', err);
        }
        finally {
            setSingerDraggedId(null);
        }
    }
    function formatTimeAgo(dateStr) {
        if (!dateStr)
            return 'Never';
        const d = new Date(dateStr);
        const diff = Date.now() - d.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1)
            return 'Just now';
        if (mins < 60)
            return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24)
            return `${hrs}h ago`;
        return d.toLocaleDateString();
    }
    useEffect(() => {
        api('/api/autoplay/settings')
            .then((settings) => {
            setAutoPlay(settings.enabled);
            setAutoPlayDelay(settings.delay);
        })
            .catch(() => { });
    }, []);
    // Fetch initial overlay settings
    useEffect(() => {
        api('/api/overlay/settings')
            .then((settings) => {
            setOverlayVisible(settings.visible);
            setOverlayHeight(settings.height);
            setQrSize(settings.qrSize);
            setCustomMessage(settings.customMessage || '');
            setShowRoller(settings.showRoller ?? true);
            setShowQrCode(settings.showQrCode ?? true);
            setHideSingerQueue(settings.hideSingerQueue ?? false);
        })
            .catch(() => { });
    }, []);
    async function updateOverlaySettings(visible, height, qrSizeVal, message, rollerVal, qrCodeVal, hideSingerQueueVal) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        try {
            await api('/api/overlay/settings', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    visible,
                    height,
                    qrSize: qrSizeVal,
                    customMessage: message ?? customMessage,
                    showRoller: rollerVal ?? showRoller,
                    showQrCode: qrCodeVal ?? showQrCode,
                    hideSingerQueue: hideSingerQueueVal ?? hideSingerQueue
                })
            });
        }
        catch (err) {
            console.error('Failed to update overlay settings:', err);
        }
    }
    // Fetch active rotation settings
    useEffect(() => {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        api('/api/rotations', { headers })
            .then((rotations) => {
            if (rotations && rotations.length > 0) {
                const active = rotations.find(r => r.status === 'active') || rotations[0];
                setActiveRotationId(String(active.id));
                setRotationType(active.config?.type || active.type || 'strict_round_robin');
            }
        })
            .catch((err) => { console.error('Failed to load rotation settings:', err); });
    }, [auth.sessionToken, auth.isLoggedIn, headers]);
    async function updateRotationType(newType) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setSavingRotationType(true);
        try {
            let rotId = activeRotationId;
            if (!rotId) {
                // Auto-create a default rotation if none exists
                const created = await api('/api/rotations', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: 'Default Rotation', config: { type: newType } }),
                });
                rotId = String(created.id);
                setActiveRotationId(rotId);
            }
            else {
                await api(`/api/rotations/${rotId}/config`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ type: newType }),
                });
            }
            setRotationType(newType);
            await refreshQueue();
            await refreshQueueState();
        }
        catch (err) {
            console.error('Failed to update rotation type:', err);
        }
        finally {
            setSavingRotationType(false);
        }
    }
    // WebSocket for real-time updates - FIXED to auto-refresh queue
    useEffect(() => {
        function connectWs() {
            try {
                wsRef.current = new WebSocket(getWsUrl(auth.sessionToken || undefined));
                wsRef.current.onmessage = (ev) => {
                    try {
                        const msg = JSON.parse(ev.data);
                        if (msg.type === 'queue.updated' ||
                            msg.type === 'player.updated' ||
                            msg.type === 'player.play' ||
                            msg.type === 'player.next' ||
                            msg.type === 'player.stop') {
                            refreshQueue(); // Auto-refresh queue on updates
                            refreshQueueState();
                        }
                        else if (msg.type === 'break_music.updated') {
                            loadBreakMusicState();
                        }
                        else if (msg.type === 'player.timing') {
                            if (typeof msg.currentTime === 'number') {
                                setCurrentTime(msg.currentTime);
                                lastWebSocketUpdateRef.current = Date.now();
                            }
                            // Handle duration updates - allow updating if:
                            // 1. Duration hasn't been set yet, OR
                            // 2. New duration is significantly different (>10% change)
                            // This allows correcting initial incorrect durations (e.g., fragmented CDG streams)
                            // while preventing small fluctuations from causing updates
                            if (typeof msg.duration === 'number' &&
                                !isNaN(msg.duration) && isFinite(msg.duration) && msg.duration > 0) {
                                if (!durationSetForSongRef.current) {
                                    // First duration update for this song
                                    durationSetForSongRef.current = true;
                                    setActualDuration(msg.duration);
                                }
                                else {
                                    // Duration already set - only update if significantly different
                                    setActualDuration((prevDuration) => {
                                        if (prevDuration === null || prevDuration === 0) {
                                            return msg.duration;
                                        }
                                        // Calculate percentage difference
                                        const percentDiff = Math.abs(msg.duration - prevDuration) / prevDuration;
                                        // Update if difference is > 10% (allows correcting wrong initial durations)
                                        if (percentDiff > 0.1) {
                                            console.log(`Duration updated from ${prevDuration}s to ${msg.duration}s (${(percentDiff * 100).toFixed(1)}% change)`);
                                            return msg.duration;
                                        }
                                        return prevDuration;
                                    });
                                }
                            }
                        }
                        else if (msg.type === 'autoplay.settings') {
                            if (typeof msg.enabled === 'boolean') {
                                setAutoPlay(msg.enabled);
                            }
                            if (typeof msg.delay === 'number') {
                                setAutoPlayDelay(msg.delay);
                            }
                        }
                    }
                    catch { }
                };
                wsRef.current.onclose = () => {
                    console.log('WebSocket closed, reconnecting...');
                    wsRef.current = null;
                    // Clear heartbeat timer
                    if (wsHeartbeatRef.current) {
                        clearInterval(wsHeartbeatRef.current);
                        wsHeartbeatRef.current = null;
                    }
                    setTimeout(connectWs, 1000);
                };
                wsRef.current.onerror = (err) => {
                    console.error('WebSocket error:', err);
                };
                wsRef.current.onopen = () => {
                    console.log('WebSocket connected');
                    // Start heartbeat - send a message every 45 seconds to keep connection alive
                    // This is in addition to server's ping/pong mechanism
                    wsHeartbeatRef.current = setInterval(() => {
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            // Send a lightweight heartbeat message
                            wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
                        }
                    }, 45000);
                };
            }
            catch {
                setTimeout(connectWs, 1500);
            }
        }
        connectWs();
        return () => {
            if (wsHeartbeatRef.current) {
                clearInterval(wsHeartbeatRef.current);
            }
            wsRef.current?.close();
        };
    }, [auth.sessionToken]);
    const currentPlaying = useMemo(() => {
        return queue.find(r => r.status === 'playing');
    }, [queue]);
    const playNextSong = useCallback(async () => {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const nextQueued = queue.find(r => r.status === 'queued');
        if (!nextQueued)
            return;
        console.log('Autoplay: Playing next song:', nextQueued.title);
        setBusy(true);
        try {
            await api('/api/player/play', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id: nextQueued.id })
            });
        }
        catch (err) {
            console.error('Autoplay failed:', err);
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }, [auth.sessionToken, headers, queue, auth.isLoggedIn]);
    // Song timer management - DISABLED: Server now handles autoplay via /player/timing endpoint
    // This ensures autoplay works even when Host page is not open
    // The Host page now serves as a monitor and manual control interface only
    useEffect(() => {
        // Reset state whenever the currently playing song ID changes (including when it goes to null)
        // This effect only triggers when currentPlaying?.id changes, not on every re-render
        setCurrentTime(0);
        setActualDuration(null);
        durationSetForSongRef.current = false; // Reset the ref so duration can be set for new song
        lastWebSocketUpdateRef.current = 0;
        if (currentPlaying) {
            console.log('Now playing:', currentPlaying.title);
        }
    }, [currentPlaying?.id]);
    useEffect(() => {
        return () => {
            if (autoPlayTimerRef.current) {
                clearTimeout(autoPlayTimerRef.current);
            }
            if (songTimerRef.current) {
                clearInterval(songTimerRef.current);
            }
        };
    }, []);
    useEffect(() => {
        if (breakMusicPaused || breakMusicRemainingSec == null || breakMusicRemainingSec <= 0)
            return;
        const timer = setInterval(() => {
            setBreakMusicRemainingSec((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
        }, 1000);
        return () => clearInterval(timer);
    }, [breakMusicPaused, breakMusicRemainingSec]);
    // Search for replacement songs - FIXED to handle both local and karaoke-nerds
    async function searchSongs(query) {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            if (replaceSearchMode === 'local') {
                const results = await api(`/api/search?q=${encodeURIComponent(query)}`);
                setSearchResults(results || []);
            }
            else {
                const results = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(query)}`);
                setSearchResults(results || []);
            }
        }
        catch {
            setSearchResults([]);
        }
    }
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        const searchDelay = replaceSearchMode === 'local' ? LOCAL_SEARCH_DELAY_MS : KARAOKE_NERDS_SEARCH_DELAY_MS;
        searchTimeoutRef.current = setTimeout(() => searchSongs(searchQuery), searchDelay);
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, replaceSearchMode]);
    // Auto-fetch video title when URL is entered in replace mode
    useEffect(() => {
        if (replaceSearchMode === 'url' && replaceUrl.trim() && !replaceTitle) {
            const timer = setTimeout(async () => {
                const title = await fetchVideoTitle(replaceUrl);
                setReplaceTitle(title);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [replaceUrl, replaceSearchMode, replaceTitle]);
    // Auto-fetch video title when URL is entered in manual request mode
    useEffect(() => {
        if (manualRequestMode === 'url' && manualRequestUrl.trim() && !manualRequestTitle) {
            const timer = setTimeout(async () => {
                const title = await fetchVideoTitle(manualRequestUrl);
                setManualRequestTitle(title);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [manualRequestUrl, manualRequestMode, manualRequestTitle]);
    async function replaceSong(queueId, newTrackId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const queueItem = queue.find(r => r.id === queueId);
        if (!queueItem)
            return;
        setBusy(true);
        try {
            await api('/api/queue/delete', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id: queueId })
            });
            await api('/api/queue', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    trackId: newTrackId,
                    requestedBy: queueItem.requested_by
                })
            });
            setReplacingId(null);
            setSearchQuery('');
            setSearchResults([]);
            setReplaceSearchMode('local');
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function replaceSongWithKaraokeNerds(queueId, track) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const queueItem = queue.find(r => r.id === queueId);
        if (!queueItem)
            return;
        setBusy(true);
        try {
            await api('/api/queue/delete', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id: queueId })
            });
            await api('/api/karaoke-nerds/add', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: track.title,
                    artist: track.artist,
                    url: track.url,
                    requestedBy: queueItem.requested_by
                })
            });
            setReplacingId(null);
            setSearchQuery('');
            setSearchResults([]);
            setReplaceSearchMode('local');
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    function formatTime(seconds) {
        if (!seconds || !isFinite(seconds))
            return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    // Manual request search functionality
    async function searchManualRequest(query) {
        if (!query.trim()) {
            setManualRequestResults([]);
            return;
        }
        try {
            if (manualRequestMode === 'local') {
                const results = await api(`/api/search?q=${encodeURIComponent(query)}`);
                setManualRequestResults(results || []);
            }
            else if (manualRequestMode === 'external') {
                const results = await api(`/api/karaoke-nerds/search?q=${encodeURIComponent(query)}`);
                setManualRequestResults(results || []);
            }
        }
        catch {
            setManualRequestResults([]);
        }
    }
    // Effect to handle manual request search with debouncing
    useEffect(() => {
        if (manualRequestMode === 'url') {
            setManualRequestResults([]);
            return;
        }
        if (manualRequestSearchTimeoutRef.current) {
            clearTimeout(manualRequestSearchTimeoutRef.current);
        }
        const searchDelay = manualRequestMode === 'local' ? LOCAL_SEARCH_DELAY_MS : KARAOKE_NERDS_SEARCH_DELAY_MS;
        manualRequestSearchTimeoutRef.current = setTimeout(() => searchManualRequest(manualRequestQuery), searchDelay);
        return () => {
            if (manualRequestSearchTimeoutRef.current) {
                clearTimeout(manualRequestSearchTimeoutRef.current);
            }
        };
    }, [manualRequestQuery, manualRequestMode]);
    // Add manual request to queue - Local track
    async function addManualRequestLocal(trackId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api('/api/queue', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    trackId,
                    requestedBy: manualRequestName || null
                })
            });
            // Close modal and reset state
            setShowManualRequest(false);
            setManualRequestQuery('');
            setManualRequestResults([]);
            setManualRequestName('');
            setManualRequestMode('local');
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    // Add manual request to queue - External (Karaoke Nerds) track
    async function addManualRequestExternal(track) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api('/api/karaoke-nerds/add', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: track.title,
                    artist: track.artist,
                    url: track.url,
                    requestedBy: manualRequestName || null
                })
            });
            // Close modal and reset state
            setShowManualRequest(false);
            setManualRequestQuery('');
            setManualRequestResults([]);
            setManualRequestName('');
            setManualRequestMode('local');
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    // Fetch video title from URL
    async function fetchVideoTitle(url) {
        try {
            const response = await api(`/api/video-metadata?url=${encodeURIComponent(url)}`);
            return response.title || url.split('/').pop()?.split('?')[0] || 'Video';
        }
        catch (err) {
            console.error('Failed to fetch video title:', err);
            return url.split('/').pop()?.split('?')[0] || 'Video';
        }
    }
    // Replace song with custom URL
    async function replaceSongWithUrl(queueId, url, title, artist) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        const queueItem = queue.find(r => r.id === queueId);
        if (!queueItem)
            return;
        setBusy(true);
        try {
            await api('/api/queue/delete', {
                method: 'POST',
                headers,
                body: JSON.stringify({ id: queueId })
            });
            await api('/api/karaoke-nerds/add', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: title || 'Video',
                    artist: artist || 'Unknown',
                    url,
                    requestedBy: queueItem.requested_by
                })
            });
            setReplacingId(null);
            setSearchQuery('');
            setSearchResults([]);
            setReplaceUrl('');
            setReplaceTitle('');
            setReplaceArtist('');
            setReplaceSearchMode('local');
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    // Add manual request to queue - Manual URL
    async function addManualRequestUrl() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        if (!manualRequestUrl.trim())
            return;
        setBusy(true);
        try {
            await api('/api/karaoke-nerds/add', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: manualRequestTitle || 'Video',
                    artist: manualRequestArtist || 'Unknown',
                    url: manualRequestUrl,
                    requestedBy: manualRequestName || null
                })
            });
            // Close modal and reset state
            setShowManualRequest(false);
            setManualRequestQuery('');
            setManualRequestResults([]);
            setManualRequestName('');
            setManualRequestUrl('');
            setManualRequestTitle('');
            setManualRequestArtist('');
            setManualRequestMode('local');
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    // Download video from external source
    async function downloadVideo(url, title, artist, brand, discId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        if (!allowDownloads) {
            alert('Downloads are disabled');
            return;
        }
        const trackKey = `${url}`;
        setDownloadingTrack(trackKey);
        setBusy(true);
        try {
            const response = await api('/api/admin/ytdlp/download', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    url,
                    title,
                    artist,
                    brand: brand || null,
                    discId: discId || null
                })
            });
            if (response.ok) {
                setBanner(`✔ Downloaded: ${artist} - ${title}`);
                setTimeout(() => setBanner(''), 5000);
            }
            else {
                setBanner(`⚠️ Download failed: ${response.error || 'Unknown error'}`);
                setTimeout(() => setBanner(''), 5000);
            }
        }
        catch (err) {
            console.error('Download failed:', err);
            setBanner(`⚠️ Download failed: ${err.message || 'Unknown error'}`);
            setTimeout(() => setBanner(''), 5000);
        }
        finally {
            setBusy(false);
            setDownloadingTrack(null);
        }
    }
    function closeDetails(e) {
        const el = e.currentTarget;
        const details = el.closest('details');
        if (details)
            details.removeAttribute('open');
    }
    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e, position) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverPosition(position);
    };
    const handleDragLeave = () => {
        setDragOverPosition(null);
    };
    const handleDrop = async (e, targetPosition) => {
        e.preventDefault();
        setDragOverPosition(null);
        if (!draggedItem || !auth.sessionToken || !auth.isLoggedIn || draggedItem.position === targetPosition) {
            setDraggedItem(null);
            return;
        }
        setBusy(true);
        try {
            await api('/api/queue/reorder', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: draggedItem.id,
                    newPosition: targetPosition
                })
            });
        }
        finally {
            setBusy(false);
            setDraggedItem(null);
            await refreshQueue();
        }
    };
    // FIXED: Play button to work properly - plays top of queue if nothing playing
    async function playTop() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        explicitStopRef.current = false;
        setBusy(true);
        try {
            await api('/api/player/play', { method: 'POST', headers });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function playThis(id) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        explicitStopRef.current = false;
        setBusy(true);
        try {
            await api('/api/player/play', { method: 'POST', headers, body: JSON.stringify({ id }) });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function next() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        explicitStopRef.current = false;
        setBusy(true);
        try {
            await api('/api/player/next', { method: 'POST', headers });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function stop() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            explicitStopRef.current = true;
            autoPlayScheduledRef.current = false;
            if (autoPlayTimerRef.current) {
                clearTimeout(autoPlayTimerRef.current);
                autoPlayTimerRef.current = null;
            }
            if (songTimerRef.current) {
                clearInterval(songTimerRef.current);
                songTimerRef.current = null;
            }
            setCurrentTime(0);
            lastWebSocketUpdateRef.current = 0;
            await api('/api/player/stop', { method: 'POST', headers });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function rename(id, requestedBy) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api('/api/queue/rename', { method: 'POST', headers, body: JSON.stringify({ id, requestedBy }) });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function updateKey(id, keyAdjustment) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api('/api/queue/update-key', { method: 'POST', headers, body: JSON.stringify({ id, keyAdjustment }) });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function remove(id) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        setBusy(true);
        try {
            await api('/api/queue/delete', { method: 'POST', headers, body: JSON.stringify({ id }) });
        }
        finally {
            setBusy(false);
            await refreshQueue();
        }
    }
    async function clearAll() {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        if (!confirm('⚠️ Clear ALL queues?\n\nThis will remove all songs from the queue AND remove all singers from the rotation. This cannot be undone.'))
            return;
        setBusy(true);
        try {
            await api('/api/queue/clear', { method: 'POST', headers });
            // Also remove all singers from the active rotation in parallel
            if (queueState?.activeRotation) {
                const rotationId = queueState.activeRotation.id;
                await Promise.allSettled(queueState.queueOrder.map(singer => api(`/api/rotations/${rotationId}/singers/${singer.singerId}`, { method: 'DELETE', headers })
                    .catch((err) => console.error(`Failed to remove singer ${singer.singerId} from rotation:`, err))));
            }
        }
        finally {
            setBusy(false);
            await refreshQueue();
            await refreshQueueState();
        }
    }
    async function removeSingerFromRotation(singerId) {
        if (!auth.sessionToken || !auth.isLoggedIn)
            return;
        if (!confirm('Remove this singer from the rotation? This will also delete their sang history and cannot be undone.'))
            return;
        setBusy(true);
        try {
            // Delete ALL queue entries for the singer (pending + history) and reset their stats
            await api(`/api/singers/${singerId}/history`, { method: 'DELETE', headers });
            // Remove from active rotation if one exists
            if (queueState?.activeRotation) {
                const rotationId = queueState.activeRotation.id;
                await api(`/api/rotations/${rotationId}/singers/${singerId}`, { method: 'DELETE', headers })
                    .catch((err) => console.error(`Failed to remove singer ${singerId} from rotation:`, err));
            }
            await refreshQueueState();
        }
        catch (err) {
            console.error('Failed to remove singer:', err);
        }
        finally {
            setBusy(false);
        }
    }
    const estimatedDuration = actualDuration
        ? actualDuration
        : (currentPlaying?.duration_ms
            ? currentPlaying.duration_ms / 1000
            : 210);
    return (_jsxs("div", { className: "host-page", children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes progressPulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .host-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          animation: fadeInUp 0.5s ease;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeInUp 0.6s ease;
        }

        .header-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #6366f1 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

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

        .status-bar {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .banner {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 14px 20px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        .now-playing {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
          }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          overflow: hidden;
          margin-top: 12px;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #6366f1);
          border-radius: 100px;
          transition: width 1s linear;
          position: relative;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s ease infinite;
        }
          
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .controls-grid {
          display: grid;
          gap: 12px;
        }

        .host-top-panels {
          display: grid;
          grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.1fr);
          gap: 16px;
          align-items: stretch;
        }

        .host-controls-card .control-btn {
          padding: 8px 10px;
          min-width: 40px;
          font-size: 16px;
          min-height: 36px;
        }

        .control-btn {
          padding: 14px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 14px;
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0. 3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .control-btn:hover:not(:disabled) {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn. primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
        }

        .control-btn. danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
        }

        .control-btn.success {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }

        .toggle-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toggle {
          position: relative;
          width: 48px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-bg-hover);
          transition: 0.4s;
          border-radius: 100px;
        }

        . toggle-slider::before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        . toggle input:checked + .toggle-slider {
          background: var(--color-success);
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .queue-item {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
          cursor: move;
        }

        .queue-item:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-accent);
          transform: translateX(4px);
        }

        . queue-item.playing {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(99, 102, 241, 0.1));
          border-color: rgba(16, 185, 129, 0.3);
        }

        .queue-item. drag-over {
          background: rgba(99, 102, 241, 0.2);
          border-color: var(--color-accent);
        }

        .queue-item-singer,
        .queue-item-title,
        .queue-item-artist {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }


        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 999;
        }

        /* Queue item actions: desktop buttons vs mobile context menu */
        .queue-item-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .queue-item-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .queue-item-singer {
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.95;
          margin-bottom: 2px;
        }

        .queue-item-title {
          font-size: 1.05rem;
          font-weight: 500;
          opacity: 0.9;
          line-height: 1.2;
        }

        .queue-item-artist {
          font-size: 0.85rem;
          font-weight: 400;
          opacity: 0.7;
          margin-top: 2px;
        }

        .queue-item.playing .queue-item-title {
          color: #a5b4fc;
          font-weight: 600;
        }


        .queue-item-actions.mobile {
          display: none;
        }

        .mobile-actions-menu {
          position: relative;
        }

        .mobile-actions-menu > summary {
          list-style: none;
        }
        .mobile-actions-menu > summary::-webkit-details-marker {
          display: none;
        }

        .mobile-actions-dropdown {
          position: absolute;
          right: 0;
          bottom: calc(100% + 12px);
          display: flex;
          gap: 8px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          z-index: 50;
        }

        @media (max-width: 640px) {
          .queue-item-actions.desktop {
            display: none;
          }
          .queue-item-actions.mobile {
            display: flex;
            justify-content: flex-end;
          }
        }

        .modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          z-index: 1000;
          max-width: 600px;
          width: 90%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .break-manager-modal {
          width: min(96vw, 1180px);
          max-width: 1180px;
          max-height: 90vh;
          height: min(90vh, 860px);
        }

        .break-manager-body {
          min-height: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .break-manager-toolbar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .break-manager-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .break-manager-layout {
          display: flex;
          min-height: 0;
          flex: 1;
          overflow: hidden;
        }

        .break-manager-panel {
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .break-manager-splitter {
          width: 10px;
          min-width: 10px;
          cursor: col-resize;
          border-radius: 8px;
          background: transparent;
          position: relative;
        }

        .break-manager-splitter::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--color-border);
        }

        .break-manager-card {
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          min-height: 0;
        }

        .break-playlist-row {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr) auto;
          gap: 8px;
          padding: 8px 10px;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 13px;
        }

        .break-playlist-row.dragging {
          opacity: 0.55;
        }

        .break-playlist-row.current {
          background: rgba(99, 102, 241, 0.16);
        }

        .break-table-header-cell {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .break-table-header-sort {
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          padding: 0;
          margin: 0;
          min-width: 0;
        }

        .break-table-header-resizer {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 12px;
          height: calc(100% + 12px);
          cursor: col-resize;
        }

        .break-columns-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 10;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          box-shadow: 0 10px 28px rgba(0,0,0,0.4);
          padding: 12px;
          min-width: 190px;
          display: grid;
          gap: 8px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-shrink: 0;
          min-width: 0;
        }

        .modal-header h3 {
          margin: 0;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

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

        .mode-button.active {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: white;
          border-color: transparent;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .mode-button.active. karaoke-nerds {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }

        . mode-button:not(.active):hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
          border-color: var(--color-accent);
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          outline: none;
          margin-bottom: 16px;
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .search-results {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: var(--color-bg-secondary);
          margin-bottom: 16px;
        }

        .search-result {
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .search-result:hover {
          background: var(--color-bg-hover);
        }

        .search-result:last-child {
          border-bottom: none;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: 12px;
          color: var(--color-text-primary);
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: var(--color-accent);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          margin-bottom: 8px;
        }

        . settings-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--color-border);
        }

        .settings-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .settings-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--color-text-primary);
        }

        .slider-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        . slider {
          flex: 1;
          height: 6px;
          background: var(--color-bg-secondary);
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          cursor: pointer;
          border-radius: 50%;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--color-accent);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .error-msg {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        . stat-pill {
          padding: 6px 14px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .host-top-panels {
            grid-template-columns: 1fr;
          }
           
          .controls-grid {
            display: flex !important;
            flex-direction: row !important;
            gap: 6px !important;
            grid-template-columns: none !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .controls-grid .control-btn {
            width: 44px !important;
            height: 44px !important;
            min-width: 0 !important;
            padding: 0 !important;
            flex: 1 1 0 !important;
            border-radius: 10px;

            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;

            line-height: 1 !important;
          }

          .controls-grid .control-btn > * {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .break-manager-modal {
            width: 95%;
            top: 0;
            transform: translate(-50%, 0);
            max-height: 100svh;
            height: 100svh;
            border-radius: 0 0 20px 20px;
          }

          .break-manager-modal .modal-header {
            position: sticky;
            top: 0;
            z-index: 10;
            background: var(--color-bg-card);
            padding-bottom: 4px;
          }

          .break-manager-layout {
            flex-direction: column;
          }

          .break-manager-layout .break-manager-panel {
            flex: 1 1 0 !important;
          }

          .break-manager-splitter {
            display: none;
          }
        }


        /* Even smaller screens */
        @media (max-width:  480px) {
          .host-top-panels {
            gap: 12px;
          }

          .controls-grid {
            gap:  4px !important;
          }
          
          .controls-grid .control-btn {
            min-width: 40px ! important;
            width: 40px !important;
            height:  40px !important;
          }
          
          .controls-grid .control-btn span {
            font-size: 18px !important;
          }
          
          .modal { width: 95%; padding: 20px; }
        }

        /* Very small screens */
        @media (max-width: 380px) {
          .controls-grid .control-btn {
            min-width: 38px !important;
            width: 38px !important;
            height: 38px !important;
          }
          
          .controls-grid .control-btn span {
            font-size:  16px !important;
          }
        }
        }
      ` }), _jsxs("div", { className: "container", children: [banner && (_jsx("div", { className: "banner", children: banner })), !auth.isLoggedIn ? (_jsxs("div", { className: "card", style: { maxWidth: 400, margin: '100px auto', overflow: 'hidden' }, children: [_jsx("h1", { style: { textAlign: 'center', marginBottom: 32 }, children: "\uD83C\uDFA4 Host Login" }), oidcConfig?.passwordLoginEnabled !== false && (_jsxs("form", { onSubmit: handleLogin, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Username" }), _jsx("input", { className: "form-input", type: "text", value: loginUsername, onChange: e => setLoginUsername(e.target.value), placeholder: "Enter host username", autoComplete: "username", required: true, style: {
                                                    width: '100%',
                                                    boxSizing: 'border-box'
                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Password" }), _jsx("input", { className: "form-input", type: "password", value: loginPassword, onChange: e => setLoginPassword(e.target.value), placeholder: "Enter host password", autoComplete: "current-password", required: true, autoFocus: true, style: {
                                                    width: '100%',
                                                    boxSizing: 'border-box'
                                                } })] }), loginError && _jsx("div", { className: "error-msg", children: loginError }), _jsx("button", { className: "control-btn primary", type: "submit", disabled: busy, style: {
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }, children: busy ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), " Logging in..."] })) : ('Login') })] })), loginError && oidcConfig?.passwordLoginEnabled === false && (_jsx("div", { className: "error-msg", children: loginError })), oidcConfig?.passwordLoginEnabled === false && !oidcConfig?.enabled && (_jsx("div", { className: "error-msg", style: { marginBottom: 16 }, children: "Username/password login is disabled and SSO is not enabled." })), oidcConfig?.enabled && (_jsxs(_Fragment, { children: [oidcConfig?.passwordLoginEnabled !== false && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }, children: [_jsx("div", { style: { flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' } }), _jsx("span", { style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: "or" }), _jsx("div", { style: { flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' } })] })), _jsx("a", { href: `${API_BASE}/api/auth/oidc/login?returnTo=%2Fhost`, className: "control-btn", style: {
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            textDecoration: 'none',
                                            background: oidcConfig.buttonColor,
                                            border: 'none'
                                        }, children: oidcConfig.buttonText })] })), _jsx("p", { style: {
                                    marginTop: 20,
                                    fontSize: 13,
                                    textAlign: 'center',
                                    color: 'var(--color-text-secondary)'
                                }, children: "Use the credentials configured in Admin settings" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "header", children: _jsx("h1", { className: "header-title", children: "Host Panel" }) }), _jsxs("div", { className: "host-top-panels", children: [_jsxs("div", { className: `card host-controls-card${currentPlaying ? ' now-playing' : ''}`, children: [currentPlaying && (_jsxs("div", { style: { marginBottom: 12 }, children: [_jsxs("div", { style: { fontWeight: 700, fontSize: 16, color: '#10b981', marginBottom: 2 }, children: ["\uD83C\uDFA4 ", currentPlaying.title || 'Unknown Title'] }), _jsxs("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4 }, children: [currentPlaying.artist || 'Unknown Artist', currentPlaying.requested_by && _jsxs("span", { style: { marginLeft: 8 }, children: ["\u00B7 ", _jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: currentPlaying.requested_by })] })] }), _jsx("div", { className: "progress-bar", style: { marginTop: 6 }, children: _jsx("div", { className: "progress-fill", style: { width: `${estimatedDuration > 0 ? Math.min(100, (currentTime / estimatedDuration) * 100) : 0}%` } }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }, children: [_jsx("span", { children: formatTime(currentTime) }), _jsx("span", { children: formatTime(estimatedDuration) })] }), autoPlay && (_jsxs("div", { style: { fontSize: 12, opacity: 0.7, marginTop: 6, textAlign: 'center',
                                                            padding: '4px 8px', background: 'rgba(16,185,129,0.1)',
                                                            borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }, children: ["\uD83D\uDD04 Auto-play enabled \u00B7 ", autoPlayDelay, "s delay"] }))] })), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { className: "control-btn success", onClick: playTop, disabled: busy, title: "Play", "aria-label": "Play", children: "\u25B6" }), _jsx("button", { className: "control-btn primary", onClick: next, disabled: busy, title: "Next", "aria-label": "Next", children: "\u23ED" }), _jsx("button", { className: "control-btn danger", onClick: stop, disabled: busy, title: "Stop", "aria-label": "Stop", children: "\u23F9" }), _jsx("button", { className: "control-btn", onClick: refreshQueue, disabled: busy, title: "Refresh", "aria-label": "Refresh", children: "\uD83D\uDD04" }), _jsx("button", { className: "control-btn danger", onClick: clearAll, disabled: busy, title: "Clear all", "aria-label": "Clear all", children: "\uD83D\uDDD1" }), _jsx("button", { className: "control-btn", onClick: () => setShowPlayerWindowControl(true), title: "Settings", "aria-label": "Settings", children: "\uD83C\uDF9B\uFE0F" })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }, children: [_jsx("h2", { style: { margin: 0 }, children: "\uD83C\uDFBC Break Music" }), _jsxs("div", { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }, children: [_jsx("button", { className: "control-btn", title: "Manage break music library and playlist", style: { padding: '8px 10px', minWidth: 40 }, onClick: openBreakMusicManager, disabled: busy, children: "\uD83D\uDEE0\uFE0F" }), _jsx("button", { className: "control-btn", title: "Play previous break playlist track", style: { padding: '8px 10px', minWidth: 40 }, onClick: () => controlBreakMusic('previous'), disabled: busy || breakPlaylistTrackIds.length === 0, children: "\u23EE\uFE0F" }), _jsx("button", { className: "control-btn", title: breakMusicPaused ? 'Resume break music' : 'Pause break music', style: { padding: '8px 10px', minWidth: 40 }, onClick: () => controlBreakMusic(breakMusicPaused ? 'resume' : 'pause'), disabled: busy || !breakMusicTrack, children: breakMusicPaused ? '▶️' : '⏸️' }), _jsx("button", { className: "control-btn", title: "Skip to next break playlist track", style: { padding: '8px 10px', minWidth: 40 }, onClick: () => controlBreakMusic('skip'), disabled: busy || breakPlaylistTrackIds.length === 0, children: "\u23ED\uFE0F" })] })] }), breakMusicTrack ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 8, fontSize: 15 }, children: [_jsx("strong", { children: breakMusicTrack.title }), " by ", _jsx("strong", { children: breakMusicTrack.artist || 'Unknown Artist' })] }), _jsxs("div", { style: { marginBottom: 10, color: 'var(--color-text-secondary)', fontSize: 14 }, children: ["Time remaining: ", breakMusicRemainingSec == null ? '—' : formatTime(breakMusicRemainingSec)] })] })) : (_jsx("div", { style: { marginBottom: 10, color: 'var(--color-text-secondary)', fontSize: 14 }, children: "No break track selected" })), activeBreakPlaylistName && (_jsxs("div", { role: "status", "aria-live": "polite", style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 4 }, children: ["Loaded playlist: ", _jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: activeBreakPlaylistName })] })), breakPlaylistTrackIds.length > 0 && (_jsxs("div", { role: "status", "aria-live": "polite", style: { color: 'var(--color-text-secondary)', fontSize: 13 }, children: ["Playlist tracks: ", breakPlaylistTrackIds.length] }))] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 }, children: [_jsx("h2", { style: { margin: 0 }, children: "\uD83C\uDFA4 Queue Order" }), _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center' }, children: [_jsxs("span", { className: "stat-pill", children: [queueState?.queueOrder.length ?? 0, " singers"] }), _jsxs("span", { className: "stat-pill", children: [queueState?.queueOrder.reduce((sum, s) => sum + s.queuedSongsCount, 0) ?? queue.filter(r => r.status === 'queued').length, " queued"] }), _jsx("button", { className: "control-btn primary", onClick: () => setShowManualRequest(true), disabled: busy, title: "Manually add a song to the queue", style: { padding: '8px 12px', fontSize: '16px', lineHeight: 1 }, children: "\u2795" })] })] }), (!queueState || queueState.queueOrder.length === 0) ? (_jsxs("div", { style: { textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16, opacity: 0.5 }, children: "\uD83C\uDFB5" }), _jsx("div", { children: "No singers in queue" }), _jsx("div", { style: { fontSize: 14, marginTop: 8 }, children: "Songs added from the Requests page will appear here automatically" })] })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: (() => {
                                            const tagged = queueState.queueOrder.map(s => ({
                                                ...s,
                                                isSinging: s.queuedSongs.some(q => q.status === 'playing'),
                                            }));
                                            const sorted = [...tagged].sort((a, b) => {
                                                if (a.isSinging && !b.isSinging)
                                                    return -1;
                                                if (!a.isSinging && b.isSinging)
                                                    return 1;
                                                return 0;
                                            });
                                            return sorted.map((singer, idx) => {
                                                const { isSinging } = singer;
                                                return (_jsx("div", { draggable: true, onDragStart: () => handleSingerDragStart(singer.singerId), onDragEnd: handleSingerDragEnd, onDragOver: e => handleSingerDragOver(e, singer.singerId), onDragLeave: () => setSingerDragOverId(null), onDrop: e => handleSingerDrop(e, singer.singerId), style: {
                                                        background: isSinging
                                                            ? 'rgba(16,185,129,0.12)'
                                                            : singerDragOverId === singer.singerId ? 'rgba(99,102,241,0.15)' : 'var(--color-bg-secondary)',
                                                        border: isSinging
                                                            ? '1.5px solid rgba(16,185,129,0.6)'
                                                            : singerDragOverId === singer.singerId
                                                                ? '1.5px solid var(--color-accent)'
                                                                : '1px solid var(--color-border)',
                                                        borderRadius: 12,
                                                        padding: '14px 16px',
                                                        opacity: singerDraggedId === singer.singerId ? 0.5 : 1,
                                                        cursor: 'grab',
                                                        transition: 'border-color 0.15s, background 0.15s',
                                                    }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, children: [_jsx("span", { style: {
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: 32,
                                                                    height: 32,
                                                                    borderRadius: 8,
                                                                    background: isSinging ? 'rgba(16,185,129,0.9)' : 'rgba(99, 102, 241, 0.9)',
                                                                    color: 'white',
                                                                    fontWeight: 700,
                                                                    flex: '0 0 auto',
                                                                    fontSize: 14,
                                                                }, children: isSinging ? '🎤' : idx + 1 }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { fontWeight: 700, fontSize: 16, color: isSinging ? 'rgba(16,185,129,1)' : 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }, children: [singer.displayName, isSinging && (_jsx("span", { style: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.2)', color: 'rgba(16,185,129,1)', letterSpacing: 0.5, textTransform: 'uppercase' }, children: "Now Singing" }))] }), _jsx("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }, children: singer.nextSong
                                                                            ? _jsxs(_Fragment, { children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: isSinging ? 'Singing:' : 'Next:' }), " ", singer.nextSong.title || 'Unknown', " \u2014 ", singer.nextSong.artist || 'Unknown'] })
                                                                            : _jsx("span", { style: { opacity: 0.6 }, children: "No queued song" }) }), _jsxs("div", { style: { display: 'flex', gap: 16, marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }, children: [_jsxs("span", { children: ["\uD83C\uDFB5 ", singer.queuedSongsCount, " queued"] }), _jsxs("span", { children: ["\u2705 ", singer.totalSongsSung, " sang"] }), singer.lastSangAt && _jsxs("span", { children: ["\uD83D\uDD50 ", formatTimeAgo(singer.lastSangAt)] })] })] }), _jsxs("div", { style: { display: 'flex', gap: 6, flex: '0 0 auto' }, children: [_jsx("button", { className: "control-btn", title: "View singer queue and history", onClick: () => openSingerModal(singer.singerId), style: { padding: '6px 10px', fontSize: 16, lineHeight: 1 }, children: "\uD83D\uDC41" }), _jsx("button", { className: "control-btn danger", title: "Remove singer from rotation", disabled: busy, onClick: () => removeSingerFromRotation(singer.singerId), style: { padding: '6px 10px', fontSize: 13 }, children: "\u2715" })] })] }) }, singer.singerId));
                                            });
                                        })() })), !queueState && queue.length > 0 && (_jsxs("div", { style: { marginTop: 16 }, children: [_jsx("div", { style: { color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 8 }, children: "(Flat queue \u2014 singer grouping unavailable)" }), queue.map(item => (_jsxs("div", { className: `queue-item ${item.status === 'playing' ? 'playing' : ''}`, children: [_jsx("span", { style: { fontWeight: 600 }, children: item.requested_by }), ' — ', item.title, " by ", item.artist] }, item.id)))] }))] }), singerModalOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: closeSingerModal }), _jsxs("div", { className: "modal", style: { maxWidth: 600 }, children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h3", { style: { margin: 0 }, children: ["\uD83C\uDFA4 ", selectedSingerHistory?.singer.displayName ?? (queueState?.queueOrder.find(s => s.singerId === selectedSingerId)?.displayName ?? 'Singer'), " \u2014 Queue & History"] }), _jsx("button", { className: "control-btn", style: { width: 40, height: 40, padding: 0 }, onClick: closeSingerModal, children: "\u2715" })] }), singerModalLoading ? (_jsx("div", { style: { textAlign: 'center', padding: '32px 0', color: 'var(--color-text-secondary)' }, children: "Loading\u2026" })) : selectedSingerHistory ? (_jsxs("div", { style: { flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap' }, children: [_jsxs("span", { className: "stat-pill", children: ["\uD83C\uDFB5 ", selectedSingerHistory.singer.totalSongsSung, " songs sung"] }), selectedSingerHistory.singer.lastSangAt && (_jsxs("span", { className: "stat-pill", children: ["\uD83D\uDD50 Last: ", formatTimeAgo(selectedSingerHistory.singer.lastSangAt)] })), _jsx("span", { className: "stat-pill", style: { background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)' }, children: selectedSingerHistory.singer.status })] }), _jsxs("div", { children: [_jsxs("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }, children: ["Queue (", selectedSingerHistory.queuedSongs.length, ")", selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued').length > 1 && (_jsx("span", { style: { fontWeight: 400, fontSize: 10, marginLeft: 8, opacity: 0.7 }, children: "drag to reorder" }))] }), selectedSingerHistory.queuedSongs.length === 0 ? (_jsx("div", { style: { color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 0', opacity: 0.7 }, children: "No songs queued" })) : (_jsx("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: _jsx("tbody", { children: (() => {
                                                                        const queuedOnly = selectedSingerHistory.queuedSongs.filter(s => s.status === 'queued');
                                                                        const queuedIdxMap = new Map(queuedOnly.map((s, idx) => [s.queueId, idx]));
                                                                        return selectedSingerHistory.queuedSongs.map((song, i) => {
                                                                            const isDraggable = song.status === 'queued';
                                                                            const queuedIdx = queuedIdxMap.get(song.queueId) ?? -1;
                                                                            return (_jsxs("tr", { draggable: isDraggable, onDragStart: () => isDraggable && setModalSongDraggedId(song.queueId), onDragEnd: () => setModalSongDraggedId(null), onDragOver: e => { if (isDraggable) {
                                                                                    e.preventDefault();
                                                                                    setModalSongDragOverId(song.queueId);
                                                                                } }, onDragLeave: () => setModalSongDragOverId(null), onDrop: () => handleModalSongDrop(song.queueId), style: {
                                                                                    background: modalSongDragOverId === song.queueId ? 'rgba(99,102,241,0.15)' : 'var(--color-bg-secondary)',
                                                                                    opacity: modalSongDraggedId === song.queueId ? 0.4 : 1,
                                                                                    cursor: isDraggable ? 'grab' : 'default',
                                                                                    transition: 'background 0.15s',
                                                                                }, children: [_jsx("td", { style: { padding: '8px 10px', width: 32, textAlign: 'center', borderBottom: '1px solid var(--color-border)' }, children: _jsx("span", { style: {
                                                                                                background: 'rgba(99,102,241,0.9)',
                                                                                                color: 'white',
                                                                                                borderRadius: 6,
                                                                                                width: 22,
                                                                                                height: 22,
                                                                                                display: 'inline-flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                fontSize: 11,
                                                                                                fontWeight: 700,
                                                                                            }, children: i + 1 }) }), _jsxs("td", { style: { padding: '8px 6px', borderBottom: '1px solid var(--color-border)' }, children: [_jsx("div", { style: { fontWeight: 600, color: 'var(--color-text-primary)' }, children: song.title || 'Unknown' }), _jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: song.artist || 'Unknown' })] }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }, children: song.keyAdjustment !== 0 && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-muted)' }, title: "Key adjustment", children: ["\uD83C\uDFB5", song.keyAdjustment > 0 ? '+' : '', song.keyAdjustment] })) }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }, children: _jsx("span", { style: {
                                                                                                padding: '2px 8px',
                                                                                                borderRadius: 100,
                                                                                                fontSize: 11,
                                                                                                background: song.status === 'playing' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.15)',
                                                                                                color: song.status === 'playing' ? '#10b981' : 'var(--color-accent)',
                                                                                            }, title: song.status === 'playing' ? 'Playing' : 'Queued', children: song.status === 'playing' ? '▶' : '🎵' }) }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', width: 36, borderBottom: '1px solid var(--color-border)' }, children: song.status === 'queued' && (_jsx("button", { onClick: () => removeSongFromQueue(song.queueId), title: "Remove song from queue", style: {
                                                                                                background: 'rgba(239,68,68,0.15)',
                                                                                                color: '#ef4444',
                                                                                                border: '1px solid rgba(239,68,68,0.3)',
                                                                                                borderRadius: 6,
                                                                                                cursor: 'pointer',
                                                                                                padding: '4px 8px',
                                                                                                fontSize: 13,
                                                                                                lineHeight: 1,
                                                                                            }, children: "\u2715" })) })] }, song.queueId));
                                                                        });
                                                                    })() }) }))] }), selectedSingerHistory.completedSongs.length > 0 && (_jsxs("div", { children: [_jsxs("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }, children: ["Sang History (", selectedSingerHistory.completedSongs.length, ")"] }), _jsx("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 }, children: _jsx("tbody", { children: selectedSingerHistory.completedSongs.map(song => (_jsxs("tr", { style: {
                                                                            background: 'var(--color-bg-secondary)',
                                                                        }, children: [_jsxs("td", { style: { padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }, children: [_jsx("div", { style: { fontWeight: 600, color: 'var(--color-text-primary)' }, children: song.title || 'Unknown' }), _jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: song.artist || 'Unknown' })] }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border)' }, children: song.completedAt && (_jsxs("span", { style: { fontSize: 11, color: 'var(--color-text-muted)' }, title: `Completed ${formatTimeAgo(song.completedAt)}`, children: ["\uD83D\uDD50 ", formatTimeAgo(song.completedAt)] })) }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', width: 36, borderBottom: '1px solid var(--color-border)' }, children: _jsx("span", { style: {
                                                                                        padding: '2px 8px',
                                                                                        borderRadius: 100,
                                                                                        fontSize: 11,
                                                                                        background: 'rgba(16,185,129,0.15)',
                                                                                        color: '#10b981',
                                                                                    }, title: "Completed", children: "\u2705" }) }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', width: 36, borderBottom: '1px solid var(--color-border)' }, children: _jsx("button", { className: "control-btn", style: { fontSize: 14, padding: '4px 8px', lineHeight: 1 }, disabled: busy, onClick: () => restoreSongToQueue(song.queueId), title: "Return this song to the queue", children: "\u21A9" }) })] }, song.queueId))) }) })] })), (selectedSingerHistory.skippedSongs.length > 0 || selectedSingerHistory.removedSongs.length > 0) && (_jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }, children: "Skipped / Removed" }), _jsx("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13, opacity: 0.7 }, children: _jsx("tbody", { children: [...selectedSingerHistory.skippedSongs, ...selectedSingerHistory.removedSongs].map(song => (_jsxs("tr", { style: {
                                                                            background: 'var(--color-bg-secondary)',
                                                                        }, children: [_jsxs("td", { style: { padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }, children: [_jsx("div", { style: { fontWeight: 600, color: 'var(--color-text-primary)' }, children: song.title || 'Unknown' }), _jsx("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: song.artist || 'Unknown' })] }), _jsx("td", { style: { padding: '8px 6px', textAlign: 'center', width: 36, borderBottom: '1px solid var(--color-border)' }, children: _jsx("span", { style: {
                                                                                        padding: '2px 8px',
                                                                                        borderRadius: 100,
                                                                                        fontSize: 11,
                                                                                        background: 'rgba(239,68,68,0.15)',
                                                                                        color: '#ef4444',
                                                                                    }, title: song.status === 'skipped' ? 'Skipped' : 'Removed', children: song.status === 'skipped' ? '⏭' : '✕' }) })] }, song.queueId))) }) })] })), selectedSingerHistory.completedSongs.length === 0 &&
                                                        selectedSingerHistory.skippedSongs.length === 0 &&
                                                        selectedSingerHistory.removedSongs.length === 0 && (_jsx("div", { style: { color: 'var(--color-text-secondary)', textAlign: 'center', padding: '10px 0' }, children: "No sang history on record for this singer." }))] })) : (_jsx("div", { style: { color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px 0' }, children: "Could not load singer history." }))] })] })), showAccountManagement && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => setShowAccountManagement(false) }), _jsxs("div", { className: "modal", style: { maxWidth: 560 }, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { style: { margin: 0 }, children: "\uD83D\uDD10 Account Settings" }), _jsx("button", { className: "control-btn", style: { width: 40, height: 40, padding: 0 }, onClick: () => setShowAccountManagement(false), children: "\u2715" })] }), auth.isDefaultPassword && (_jsx("div", { className: "banner", style: { marginBottom: 16 }, children: "\u26A0\uFE0F You are using the default password. Please change it for security." })), _jsx("p", { style: { color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 14 }, children: "Change your username and password." }), !changingUsername && !changingPassword && (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 20 }, children: [_jsxs("button", { className: "control-btn", style: { minWidth: 180, justifyContent: 'center', flex: 1 }, onClick: () => setChangingUsername(true), children: [_jsx("span", { children: "\uD83D\uDC64" }), " Change Username"] }), _jsxs("button", { className: "control-btn", style: { minWidth: 180, justifyContent: 'center', flex: 1 }, onClick: () => setChangingPassword(true), children: [_jsx("span", { children: "\uD83D\uDD12" }), " Change Password"] })] })), changingUsername && (_jsxs("form", { onSubmit: handleChangeUsername, style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 12,
                                                    background: 'var(--color-bg-secondary)',
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    border: '1px solid var(--color-border)',
                                                    marginBottom: 20,
                                                }, children: [_jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "New Username" }), _jsx("input", { className: "form-input", type: "text", value: newUsername, onChange: (e) => setNewUsername(e.target.value), placeholder: "Enter new username (min 3 characters)", autoComplete: "username", required: true, minLength: 3 })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "Current Password (to confirm)" }), _jsx("input", { className: "form-input", type: "password", value: usernamePassword, onChange: (e) => setUsernamePassword(e.target.value), placeholder: "Enter current password", autoComplete: "current-password", required: true })] }), usernameError && _jsx("div", { className: "error-msg", style: { marginBottom: 0 }, children: usernameError }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { className: "control-btn success", type: "submit", disabled: busy, children: [_jsx("span", { children: "\u2713" }), " Change Username"] }), _jsx("button", { type: "button", className: "control-btn", onClick: () => {
                                                                    setChangingUsername(false);
                                                                    setNewUsername('');
                                                                    setUsernamePassword('');
                                                                    setUsernameError('');
                                                                }, children: "Cancel" })] })] })), changingPassword && (_jsxs("form", { onSubmit: handleChangePassword, style: {
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 12,
                                                    background: 'var(--color-bg-secondary)',
                                                    padding: 16,
                                                    borderRadius: 12,
                                                    border: '1px solid var(--color-border)',
                                                }, children: [_jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "Current Password" }), _jsx("input", { className: "form-input", type: "password", value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), placeholder: "Enter current password", autoComplete: "current-password", required: true })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "New Password" }), _jsx("input", { className: "form-input", type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "Enter new password (min 8 characters)", autoComplete: "new-password", required: true, minLength: 8 })] }), _jsxs("div", { className: "form-group", style: { marginBottom: 0 }, children: [_jsx("label", { className: "form-label", children: "Confirm New Password" }), _jsx("input", { className: "form-input", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm new password", autoComplete: "new-password", required: true })] }), passwordError && _jsx("div", { className: "error-msg", style: { marginBottom: 0 }, children: passwordError }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { className: "control-btn success", type: "submit", disabled: busy, children: [_jsx("span", { children: "\u2713" }), " Change Password"] }), _jsx("button", { type: "button", className: "control-btn", onClick: () => {
                                                                    setChangingPassword(false);
                                                                    setCurrentPassword('');
                                                                    setNewPassword('');
                                                                    setConfirmPassword('');
                                                                    setPasswordError('');
                                                                }, children: "Cancel" })] })] }))] })] })), showPlayerWindowControl && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => setShowPlayerWindowControl(false) }), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { style: { margin: 0 }, children: "\uD83C\uDF9B\uFE0F Player Settings" }), _jsx("button", { style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: 24,
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            transition: 'all 0.3s ease'
                                                        }, onMouseEnter: e => e.currentTarget.style.background = 'var(--color-bg-hover)', onMouseLeave: e => e.currentTarget.style.background = 'transparent', onClick: () => setShowPlayerWindowControl(false), children: "\u2715" })] }), _jsxs("div", { style: { flex: 1, overflowY: 'auto', minHeight: 0 }, children: [_jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Auto-play Settings" }), _jsxs("div", { style: {
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '12px 0',
                                                                    marginBottom: autoPlay ? '16px' : '0'
                                                                }, children: [_jsx("span", { style: { fontSize: '15px', fontWeight: '500' }, children: "Auto-play" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsxs("label", { style: {
                                                                                    position: 'relative',
                                                                                    display: 'inline-block',
                                                                                    width: '48px',
                                                                                    height: '24px'
                                                                                }, children: [_jsx("input", { type: "checkbox", checked: autoPlay, onChange: e => {
                                                                                            const newEnabled = e.target.checked;
                                                                                            setAutoPlay(newEnabled);
                                                                                            updateAutoPlaySettings(newEnabled, autoPlayDelay);
                                                                                        }, style: { opacity: 0, width: 0, height: 0 } }), _jsx("span", { style: {
                                                                                            position: 'absolute',
                                                                                            cursor: 'pointer',
                                                                                            top: 0,
                                                                                            left: 0,
                                                                                            right: 0,
                                                                                            bottom: 0,
                                                                                            backgroundColor: autoPlay ? '#10b981' : '#374151',
                                                                                            transition: '. 4s',
                                                                                            borderRadius: '34px'
                                                                                        }, children: _jsx("span", { style: {
                                                                                                position: 'absolute',
                                                                                                content: '',
                                                                                                height: '16px',
                                                                                                width: '16px',
                                                                                                left: autoPlay ? '28px' : '4px',
                                                                                                bottom: '4px',
                                                                                                backgroundColor: 'white',
                                                                                                transition: '.4s',
                                                                                                borderRadius: '50%'
                                                                                            } }) })] }), _jsx("span", { style: {
                                                                                    color: autoPlay ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                                                                    fontSize: '14px',
                                                                                    fontWeight: '500',
                                                                                    minWidth: '60px'
                                                                                }, children: autoPlay ? 'Enabled' : 'Disabled' })] })] }), autoPlay && (_jsxs("div", { style: {
                                                                    padding: '16px',
                                                                    background: 'var(--color-bg-secondary)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-border)'
                                                                }, children: [_jsxs("label", { className: "form-label", style: { marginBottom: '12px' }, children: ["Delay between songs: ", _jsx("strong", { children: autoPlayDelay }), " seconds"] }), _jsxs("div", { className: "slider-control", children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "0s" }), _jsx("input", { type: "range", className: "slider", value: autoPlayDelay, onChange: e => {
                                                                                    const newDelay = parseInt(e.target.value);
                                                                                    setAutoPlayDelay(newDelay);
                                                                                }, onMouseUp: () => updateAutoPlaySettings(autoPlay, autoPlayDelay), onTouchEnd: () => updateAutoPlaySettings(autoPlay, autoPlayDelay), min: "0", max: "60", style: { margin: '0 12px', flex: 1 } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "60s" }), _jsxs("span", { style: {
                                                                                    minWidth: '50px',
                                                                                    textAlign: 'center',
                                                                                    padding: '4px 8px',
                                                                                    background: 'var(--color-bg-primary)',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: '600',
                                                                                    marginLeft: '12px'
                                                                                }, children: [autoPlayDelay, "s"] })] })] }))] }), _jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Break Music Crossfade" }), _jsxs("div", { style: {
                                                                    padding: '16px',
                                                                    background: 'var(--color-bg-secondary)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-border)'
                                                                }, children: [_jsxs("label", { className: "form-label", style: { marginBottom: '12px' }, children: ["Crossfade: ", _jsx("strong", { children: breakMusicCrossfadeSec }), " seconds"] }), _jsxs("div", { className: "slider-control", children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "0s" }), _jsx("input", { type: "range", className: "slider", value: breakMusicCrossfadeSec, min: "0", max: "15", onChange: e => setBreakMusicCrossfadeSec(parseInt(e.target.value)), onMouseUp: () => updateBreakCrossfade(breakMusicCrossfadeSec), onTouchEnd: () => updateBreakCrossfade(breakMusicCrossfadeSec), style: { margin: '0 12px', flex: 1 } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "15s" }), _jsxs("span", { style: {
                                                                                    minWidth: '50px',
                                                                                    textAlign: 'center',
                                                                                    padding: '4px 8px',
                                                                                    background: 'var(--color-bg-primary)',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: '600',
                                                                                    marginLeft: '12px'
                                                                                }, children: [breakMusicCrossfadeSec, "s"] })] })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Break Music Volume" }), _jsxs("div", { style: {
                                                                    padding: '16px',
                                                                    background: 'var(--color-bg-secondary)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-border)'
                                                                }, children: [_jsxs("label", { className: "form-label", style: { marginBottom: '12px' }, children: ["Volume: ", _jsxs("strong", { children: [breakMusicVolumePercent, "%"] })] }), _jsxs("div", { className: "slider-control", children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "0%" }), _jsx("input", { type: "range", className: "slider", value: breakMusicVolumePercent, min: "0", max: "100", onChange: e => {
                                                                                    const nextVolume = parseInt(e.target.value);
                                                                                    setBreakMusicVolumePercent(nextVolume);
                                                                                    scheduleBreakVolumeUpdate(nextVolume);
                                                                                }, style: { margin: '0 12px', flex: 1 } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "100%" }), _jsxs("span", { style: {
                                                                                    minWidth: '50px',
                                                                                    textAlign: 'center',
                                                                                    padding: '4px 8px',
                                                                                    background: 'var(--color-bg-primary)',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: '600',
                                                                                    marginLeft: '12px'
                                                                                }, children: [breakMusicVolumePercent, "%"] })] })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Break Music Resume Delay" }), _jsxs("div", { style: {
                                                                    padding: '16px',
                                                                    background: 'var(--color-bg-secondary)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-border)'
                                                                }, children: [_jsxs("label", { className: "form-label", style: { marginBottom: '12px' }, children: ["Delay after karaoke ends before resuming break music: ", _jsx("strong", { children: breakMusicResumeDelay }), " seconds"] }), _jsxs("div", { className: "slider-control", children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "0s" }), _jsx("input", { type: "range", className: "slider", value: breakMusicResumeDelay, min: "0", max: "30", onChange: e => setBreakMusicResumeDelay(parseInt(e.target.value)), onMouseUp: () => updateBreakResumeDelay(breakMusicResumeDelay), onTouchEnd: () => updateBreakResumeDelay(breakMusicResumeDelay), style: { margin: '0 12px', flex: 1 } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "30s" }), _jsxs("span", { style: {
                                                                                    minWidth: '50px',
                                                                                    textAlign: 'center',
                                                                                    padding: '4px 8px',
                                                                                    background: 'var(--color-bg-primary)',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    fontWeight: '600',
                                                                                    marginLeft: '12px'
                                                                                }, children: [breakMusicResumeDelay, "s"] })] })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Overlay Settings" }), _jsxs("div", { style: {
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '12px 0',
                                                                    marginBottom: overlayVisible ? '16px' : '0'
                                                                }, children: [_jsx("span", { style: { fontSize: '15px', fontWeight: '500' }, children: "Show Overlay" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsxs("label", { style: {
                                                                                    position: 'relative',
                                                                                    display: 'inline-block',
                                                                                    width: '48px',
                                                                                    height: '24px'
                                                                                }, children: [_jsx("input", { type: "checkbox", checked: overlayVisible, onChange: e => {
                                                                                            const newVisible = e.target.checked;
                                                                                            setOverlayVisible(newVisible);
                                                                                            updateOverlaySettings(newVisible, overlayHeight, qrSize);
                                                                                        }, style: { opacity: 0, width: 0, height: 0 } }), _jsx("span", { style: {
                                                                                            position: 'absolute',
                                                                                            cursor: 'pointer',
                                                                                            top: 0,
                                                                                            left: 0,
                                                                                            right: 0,
                                                                                            bottom: 0,
                                                                                            backgroundColor: overlayVisible ? '#10b981' : '#374151',
                                                                                            transition: '.4s',
                                                                                            borderRadius: '34px'
                                                                                        }, children: _jsx("span", { style: {
                                                                                                position: 'absolute',
                                                                                                content: '',
                                                                                                height: '16px',
                                                                                                width: '16px',
                                                                                                left: overlayVisible ? '28px' : '4px',
                                                                                                bottom: '4px',
                                                                                                backgroundColor: 'white',
                                                                                                transition: '.4s',
                                                                                                borderRadius: '50%'
                                                                                            } }) })] }), _jsx("span", { style: {
                                                                                    color: overlayVisible ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                                                                    fontSize: '14px',
                                                                                    fontWeight: '500',
                                                                                    minWidth: '60px'
                                                                                }, children: overlayVisible ? 'Visible' : 'Hidden' })] })] }), overlayVisible && (_jsxs("div", { style: {
                                                                    padding: '16px',
                                                                    background: 'var(--color-bg-secondary)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-border)'
                                                                }, children: [_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsxs("label", { className: "form-label", style: { marginBottom: '12px' }, children: ["Scroller Height: ", _jsxs("strong", { children: [overlayHeight, "px"] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "40px" }), _jsx("input", { type: "range", value: overlayHeight, onChange: e => setOverlayHeight(parseInt(e.target.value)), onMouseUp: () => updateOverlaySettings(overlayVisible, overlayHeight, qrSize), onTouchEnd: () => updateOverlaySettings(overlayVisible, overlayHeight, qrSize), min: "40", max: "150", style: {
                                                                                            flex: 1,
                                                                                            height: '6px',
                                                                                            background: 'var(--color-bg-primary)',
                                                                                            borderRadius: '3px',
                                                                                            outline: 'none',
                                                                                            WebkitAppearance: 'none'
                                                                                        } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "150px" }), _jsxs("span", { style: {
                                                                                            minWidth: '50px',
                                                                                            textAlign: 'center',
                                                                                            padding: '4px 8px',
                                                                                            background: 'var(--color-bg-primary)',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '13px',
                                                                                            fontWeight: '600'
                                                                                        }, children: [overlayHeight, "px"] })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "form-label", style: { marginBottom: '12px' }, children: ["QR Code Size: ", _jsxs("strong", { children: [qrSize, "px"] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "40px" }), _jsx("input", { type: "range", value: qrSize, onChange: e => setQrSize(parseInt(e.target.value)), onMouseUp: () => updateOverlaySettings(overlayVisible, overlayHeight, qrSize), onTouchEnd: () => updateOverlaySettings(overlayVisible, overlayHeight, qrSize), min: "40", max: "150", style: {
                                                                                            flex: 1,
                                                                                            height: '6px',
                                                                                            background: 'var(--color-bg-primary)',
                                                                                            borderRadius: '3px',
                                                                                            outline: 'none',
                                                                                            WebkitAppearance: 'none'
                                                                                        } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--color-text-secondary)' }, children: "150px" }), _jsxs("span", { style: {
                                                                                            minWidth: '50px',
                                                                                            textAlign: 'center',
                                                                                            padding: '4px 8px',
                                                                                            background: 'var(--color-bg-primary)',
                                                                                            borderRadius: '6px',
                                                                                            fontSize: '13px',
                                                                                            fontWeight: '600'
                                                                                        }, children: [qrSize, "px"] })] })] }), _jsxs("div", { style: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: '500' }, children: "Show Roller" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsxs("label", { style: { position: 'relative', display: 'inline-block', width: '48px', height: '24px' }, children: [_jsx("input", { type: "checkbox", checked: showRoller, onChange: e => {
                                                                                                            const val = e.target.checked;
                                                                                                            setShowRoller(val);
                                                                                                            updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, val, showQrCode);
                                                                                                        }, style: { opacity: 0, width: 0, height: 0 } }), _jsx("span", { style: {
                                                                                                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                                                                            backgroundColor: showRoller ? '#10b981' : '#374151',
                                                                                                            transition: '.4s', borderRadius: '34px'
                                                                                                        }, children: _jsx("span", { style: {
                                                                                                                position: 'absolute', height: '16px', width: '16px',
                                                                                                                left: showRoller ? '28px' : '4px', bottom: '4px',
                                                                                                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                                                                                            } }) })] }), _jsx("span", { style: {
                                                                                                    color: showRoller ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                                                                                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                                                                                                }, children: showRoller ? 'Visible' : 'Hidden' })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: '500' }, children: "Show QR Code" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsxs("label", { style: { position: 'relative', display: 'inline-block', width: '48px', height: '24px' }, children: [_jsx("input", { type: "checkbox", checked: showQrCode, onChange: e => {
                                                                                                            const val = e.target.checked;
                                                                                                            setShowQrCode(val);
                                                                                                            updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, showRoller, val);
                                                                                                        }, style: { opacity: 0, width: 0, height: 0 } }), _jsx("span", { style: {
                                                                                                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                                                                            backgroundColor: showQrCode ? '#10b981' : '#374151',
                                                                                                            transition: '.4s', borderRadius: '34px'
                                                                                                        }, children: _jsx("span", { style: {
                                                                                                                position: 'absolute', height: '16px', width: '16px',
                                                                                                                left: showQrCode ? '28px' : '4px', bottom: '4px',
                                                                                                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                                                                                            } }) })] }), _jsx("span", { style: {
                                                                                                    color: showQrCode ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                                                                                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                                                                                                }, children: showQrCode ? 'Visible' : 'Hidden' })] })] })] })] }))] }), overlayVisible && (_jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Custom Message" }), _jsx("input", { type: "text", className: "form-input", placeholder: "Enter custom message for overlay...", value: customMessage, onChange: e => setCustomMessage(e.target.value), onBlur: () => updateOverlaySettings(overlayVisible, overlayHeight, qrSize, customMessage), onKeyDown: e => {
                                                                    if (e.key === 'Enter') {
                                                                        updateOverlaySettings(overlayVisible, overlayHeight, qrSize, customMessage);
                                                                    }
                                                                }, style: { marginBottom: customMessage ? '12px' : '0' } }), customMessage && (_jsx("button", { className: "control-btn", style: {
                                                                    background: 'transparent',
                                                                    border: '1px solid var(--color-border)',
                                                                    padding: '8px 16px',
                                                                    fontSize: '13px'
                                                                }, onClick: () => {
                                                                    setCustomMessage('');
                                                                    updateOverlaySettings(overlayVisible, overlayHeight, qrSize, '');
                                                                }, children: "Clear Message" }))] })), _jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Queue Display" }), _jsxs("div", { style: {
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    padding: '12px 0'
                                                                }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: '15px', fontWeight: '500' }, children: "Hide Singer's Queued Songs" }), _jsx("div", { style: { fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }, children: "Show the singer's name but hide the song titles they've queued" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }, children: [_jsxs("label", { style: {
                                                                                    position: 'relative',
                                                                                    display: 'inline-block',
                                                                                    width: '48px',
                                                                                    height: '24px'
                                                                                }, children: [_jsx("input", { type: "checkbox", checked: hideSingerQueue, onChange: e => {
                                                                                            const val = e.target.checked;
                                                                                            setHideSingerQueue(val);
                                                                                            updateOverlaySettings(overlayVisible, overlayHeight, qrSize, undefined, showRoller, showQrCode, val);
                                                                                        }, style: { opacity: 0, width: 0, height: 0 } }), _jsx("span", { style: {
                                                                                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                                                            backgroundColor: hideSingerQueue ? '#10b981' : '#374151',
                                                                                            transition: '.4s', borderRadius: '34px'
                                                                                        }, children: _jsx("span", { style: {
                                                                                                position: 'absolute', height: '16px', width: '16px',
                                                                                                left: hideSingerQueue ? '28px' : '4px', bottom: '4px',
                                                                                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                                                                            } }) })] }), _jsx("span", { style: {
                                                                                    color: hideSingerQueue ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                                                                    fontSize: '14px', fontWeight: '500', minWidth: '60px'
                                                                                }, children: hideSingerQueue ? 'Hidden' : 'Visible' })] })] })] }), _jsxs("div", { className: "settings-section", children: [_jsx("div", { className: "settings-title", children: "Rotation Settings" }), _jsxs("div", { style: {
                                                                    padding: '16px',
                                                                    background: 'var(--color-bg-secondary)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid var(--color-border)'
                                                                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }, children: [_jsx("label", { className: "form-label", style: { marginBottom: 0, flex: 1 }, children: "Rotation Type" }), _jsx("button", { title: "Learn about rotation types", onClick: () => setShowRotationInfo(v => !v), style: {
                                                                                    background: 'transparent',
                                                                                    border: '1px solid var(--color-border)',
                                                                                    borderRadius: '50%',
                                                                                    width: '22px',
                                                                                    height: '22px',
                                                                                    cursor: 'pointer',
                                                                                    color: 'var(--color-text-secondary)',
                                                                                    fontSize: '12px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    flexShrink: 0,
                                                                                }, children: "\u2139" })] }), showRotationInfo && (_jsx("div", { style: {
                                                                            marginBottom: '14px',
                                                                            padding: '12px',
                                                                            background: 'var(--color-bg-primary)',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid var(--color-border)',
                                                                            fontSize: '13px',
                                                                            color: 'var(--color-text-secondary)',
                                                                            lineHeight: '1.6',
                                                                        }, children: _jsxs("ul", { style: { margin: 0, paddingLeft: '16px' }, children: [_jsxs("li", { style: { marginBottom: '6px' }, children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: "Strict Round Robin" }), " \u2014 Each singer gets exactly one turn per round, cycling through in position order."] }), _jsxs("li", { style: { marginBottom: '6px' }, children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: "Least Recently Sung" }), " \u2014 The singer who has waited the longest since their last song goes next."] }), _jsxs("li", { style: { marginBottom: '6px' }, children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: "Signup Order" }), " \u2014 Singers perform in the order they joined the rotation list."] }), _jsxs("li", { style: { marginBottom: '6px' }, children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: "Song Queue Only" }), " \u2014 Songs play in the order they were requested, ignoring singer fairness."] }), _jsxs("li", { style: { marginBottom: '6px' }, children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: "Manual" }), " \u2014 You (the host) pick who goes next each time."] }), _jsxs("li", { children: [_jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: "Hybrid" }), " \u2014 Round-robin base with host override priority support."] })] }) })), _jsxs("select", { className: "form-input", value: rotationType, disabled: savingRotationType, onChange: e => updateRotationType(e.target.value), style: { marginBottom: 0 }, children: [_jsx("option", { value: "strict_round_robin", children: "Strict Round Robin" }), _jsx("option", { value: "least_recently_sung", children: "Least Recently Sung" }), _jsx("option", { value: "signup_order", children: "Signup Order" }), _jsx("option", { value: "song_queue_only", children: "Song Queue Only" }), _jsx("option", { value: "manual", children: "Manual" }), _jsx("option", { value: "hybrid", children: "Hybrid" })] }), savingRotationType && (_jsx("p", { style: { margin: '8px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }, children: "Saving\u2026" }))] })] })] }), _jsx("button", { className: "control-btn primary", style: { width: '100%', marginTop: '8px', flexShrink: 0 }, onClick: () => setShowPlayerWindowControl(false), children: "Done" })] })] })), showBreakPlaylistModal && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: closeBreakMusicManager }), _jsxs("div", { className: "modal break-manager-modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { style: { margin: 0 }, children: "\uD83C\uDFBC Manage Break Music" }), _jsx("button", { title: "Close", style: {
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: 'var(--color-text-secondary)',
                                                            cursor: 'pointer',
                                                            fontSize: 20,
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 8,
                                                            flexShrink: 0,
                                                        }, onClick: closeBreakMusicManager, children: "\u2715" })] }), _jsxs("div", { className: "break-manager-body", children: [_jsxs("div", { className: "break-manager-toolbar", children: [_jsx("label", { className: "form-label", style: { marginBottom: 6 }, children: "Saved Playlists" }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsxs("select", { className: "form-input", value: selectedBreakPlaylistId, onChange: (e) => setSelectedBreakPlaylistId(e.target.value), style: { flex: 1, minWidth: 0, marginBottom: 0, padding: '10px 12px', fontSize: 13 }, children: [_jsx("option", { value: "", children: "Select a playlist" }), breakPlaylists.map((playlist) => (_jsx("option", { value: playlist.id, children: playlist.name }, playlist.id)))] }), _jsx("button", { className: "control-btn", type: "button", title: "Load selected playlist for break playback", onClick: () => selectedBreakPlaylistId && loadBreakPlaylist(Number(selectedBreakPlaylistId)), disabled: !selectedBreakPlaylistId, style: { padding: '10px 12px', minWidth: 44, flexShrink: 0 }, children: "\uD83D\uDCE5" }), _jsx("button", { className: "control-btn", type: "button", title: "Save playlist", disabled: breakPlaylistTracks.length === 0, onClick: saveBreakPlaylist, style: { padding: '10px 12px', flexShrink: 0 }, children: "\uD83D\uDCBE" }), _jsx("button", { className: "control-btn", type: "button", title: "Shuffle playlist", disabled: breakPlaylistTracks.length < 2, onClick: shuffleBreakPlaylist, style: { padding: '10px 12px', flexShrink: 0 }, children: "\uD83D\uDD00" }), _jsx("button", { className: "control-btn", type: "button", title: "Clear playlist", disabled: breakPlaylistTracks.length === 0, onClick: clearBreakPlaylist, style: { padding: '10px 12px', flexShrink: 0 }, children: "\uD83D\uDDD1\uFE0F" })] })] }), _jsxs("div", { className: "break-manager-layout", ref: breakManagerLayoutRef, children: [_jsxs("div", { className: "break-manager-panel", style: { flex: `0 0 ${breakLibraryPanePercent}%` }, children: [_jsxs("div", { className: "form-group", style: { marginBottom: 12 }, children: [_jsx("label", { className: "form-label", children: "Search Break Music" }), _jsx("input", { className: "search-input", placeholder: "Search break tracks...", value: breakSearchQuery, onChange: (e) => setBreakSearchQuery(e.target.value), style: { marginBottom: 0 } })] }), _jsx("div", { className: "form-group", style: { marginTop: 0, marginBottom: 12 }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, children: [_jsx("label", { className: "form-label", style: { marginBottom: 0 }, children: "Search Table" }), _jsxs("div", { style: { position: 'relative' }, ref: breakColumnMenuRef, children: [_jsx("button", { className: "control-btn", type: "button", onClick: () => setShowBreakColumnMenu((prev) => !prev), style: { padding: '8px 10px', fontSize: 12 }, children: "\uD83E\uDDF0 Columns" }), showBreakColumnMenu && (_jsx("div", { className: "break-columns-popover", children: ['song', 'artist', 'genre', 'length', 'path'].map((column) => (_jsxs("label", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }, children: [_jsx("input", { type: "checkbox", checked: breakColumns[column], onChange: () => toggleBreakColumn(column) }), column[0].toUpperCase() + column.slice(1)] }, column))) }))] })] }) }), _jsxs("div", { className: "break-manager-card", style: { flex: 1, overflow: 'auto' }, children: [_jsxs("div", { style: {
                                                                                    display: 'grid',
                                                                                    gridTemplateColumns: buildBreakGridTemplate(),
                                                                                    gap: 8,
                                                                                    padding: '8px 10px',
                                                                                    fontSize: 12,
                                                                                    borderBottom: '1px solid var(--color-border)',
                                                                                    color: 'var(--color-text-secondary)',
                                                                                    fontWeight: 600
                                                                                }, children: [_jsx("span", { style: { textAlign: 'center' }, children: _jsx("button", { title: "Add all visible tracks to playlist", onClick: addAllBreakTracksToPlaylist, disabled: sortedFilteredBreakLibraryTracks.length === 0, style: { border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }, children: "\u2795 All" }) }), breakColumnEnabled('song') && (_jsxs("div", { className: "break-table-header-cell", children: [_jsxs("button", { className: "break-table-header-sort", onClick: () => toggleBreakSort('song'), children: ["Song", breakSort.column === 'song' ? (breakSort.direction === 'asc' ? ' ▲' : ' ▼') : ''] }), _jsx("div", { className: "break-table-header-resizer", onMouseDown: (event) => startBreakColumnResize('song', event) })] })), breakColumnEnabled('artist') && (_jsxs("div", { className: "break-table-header-cell", children: [_jsxs("button", { className: "break-table-header-sort", onClick: () => toggleBreakSort('artist'), children: ["Artist", breakSort.column === 'artist' ? (breakSort.direction === 'asc' ? ' ▲' : ' ▼') : ''] }), _jsx("div", { className: "break-table-header-resizer", onMouseDown: (event) => startBreakColumnResize('artist', event) })] })), breakColumnEnabled('genre') && (_jsxs("div", { className: "break-table-header-cell", children: [_jsxs("button", { className: "break-table-header-sort", onClick: () => toggleBreakSort('genre'), children: ["Genre", breakSort.column === 'genre' ? (breakSort.direction === 'asc' ? ' ▲' : ' ▼') : ''] }), _jsx("div", { className: "break-table-header-resizer", onMouseDown: (event) => startBreakColumnResize('genre', event) })] })), breakColumnEnabled('length') && (_jsxs("div", { className: "break-table-header-cell", children: [_jsxs("button", { className: "break-table-header-sort", onClick: () => toggleBreakSort('length'), children: ["Length", breakSort.column === 'length' ? (breakSort.direction === 'asc' ? ' ▲' : ' ▼') : ''] }), _jsx("div", { className: "break-table-header-resizer", onMouseDown: (event) => startBreakColumnResize('length', event) })] })), breakColumnEnabled('path') && (_jsxs("div", { className: "break-table-header-cell", children: [_jsxs("button", { className: "break-table-header-sort", onClick: () => toggleBreakSort('path'), children: ["Path", breakSort.column === 'path' ? (breakSort.direction === 'asc' ? ' ▲' : ' ▼') : ''] }), _jsx("div", { className: "break-table-header-resizer", onMouseDown: (event) => startBreakColumnResize('path', event) })] }))] }), sortedFilteredBreakLibraryTracks.map((track) => (_jsxs("div", { draggable: true, onDragStart: (ev) => {
                                                                                    ev.dataTransfer.setData('text/plain', String(track.id));
                                                                                    setBreakDraggedPlaylistIndex(null);
                                                                                    setBreakDraggedTrackId(track.id);
                                                                                }, onDragEnd: () => setBreakDraggedTrackId(null), style: {
                                                                                    display: 'grid',
                                                                                    gridTemplateColumns: buildBreakGridTemplate(),
                                                                                    gap: 8,
                                                                                    padding: '8px 10px',
                                                                                    fontSize: 13,
                                                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                                                    alignItems: 'center',
                                                                                    cursor: 'grab'
                                                                                }, children: [_jsx("button", { title: "Add to playlist", onClick: () => addBreakTrackToPlaylist(track), style: { border: 'none', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 16 }, children: "\u2795" }), breakColumnEnabled('song') && _jsx("span", { children: track.title }), breakColumnEnabled('artist') && _jsx("span", { children: track.artist || '—' }), breakColumnEnabled('genre') && _jsx("span", { children: track.genre || '—' }), breakColumnEnabled('length') && _jsx("span", { children: formatDurationMs(track.duration_ms) }), breakColumnEnabled('path') && (_jsx("span", { title: track.file_path, style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: track.file_path }))] }, track.id))), sortedFilteredBreakLibraryTracks.length === 0 && (_jsx("div", { style: { padding: 16, color: 'var(--color-text-secondary)' }, children: "No tracks found" }))] })] }), _jsx("div", { className: "break-manager-splitter", onMouseDown: startBreakPaneResize }), _jsx("div", { className: "break-manager-panel", style: { flex: `1 1 ${100 - breakLibraryPanePercent}%` }, children: _jsxs("div", { className: "break-manager-card", onDragOver: (ev) => {
                                                                        if (!canDropOnBreakPlaylist(ev))
                                                                            return;
                                                                        ev.preventDefault();
                                                                    }, onDrop: (ev) => {
                                                                        ev.preventDefault();
                                                                        if (breakDraggedPlaylistIndex !== null) {
                                                                            const playlist = breakPlaylistTracksRef.current;
                                                                            if (breakDraggedPlaylistIndex < 0 || breakDraggedPlaylistIndex >= playlist.length)
                                                                                return;
                                                                            const next = [...playlist];
                                                                            const [item] = next.splice(breakDraggedPlaylistIndex, 1);
                                                                            next.push(item);
                                                                            setBreakPlaylistTracksAndSync(next);
                                                                            setBreakDraggedPlaylistIndex(null);
                                                                            return;
                                                                        }
                                                                        const trackId = getBreakDraggedTrackId(ev);
                                                                        if (!trackId)
                                                                            return;
                                                                        const track = breakLibraryTracks.find((t) => t.id === trackId);
                                                                        if (track)
                                                                            addBreakTrackToPlaylist(track);
                                                                        setBreakDraggedTrackId(null);
                                                                    }, style: { flex: 1, overflow: 'auto' }, children: [activeBreakPlaylistName && (_jsxs("div", { style: { padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-text-secondary)' }, children: ["Loaded playlist: ", _jsx("strong", { style: { color: 'var(--color-text-primary)' }, children: activeBreakPlaylistName })] })), _jsxs("div", { style: { padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', gap: 12 }, children: [_jsxs("span", { children: ["Playlist Tracks (", breakPlaylistTracks.length, ")"] }), _jsxs("span", { children: ["Total ", formatDurationMs(breakPlaylistDurationMs)] })] }), breakPlaylistTracks.map((track, index) => {
                                                                            const isCurrent = currentBreakPlaylistRowIndex >= 0 && index === currentBreakPlaylistRowIndex;
                                                                            return (_jsxs("div", { className: `break-playlist-row ${breakDraggedPlaylistIndex === index ? 'dragging' : ''} ${isCurrent ? 'current' : ''}`, draggable: true, onDragStart: () => {
                                                                                    setBreakDraggedTrackId(null);
                                                                                    setBreakDraggedPlaylistIndex(index);
                                                                                }, onDragEnd: () => setBreakDraggedPlaylistIndex(null), onDragOver: (ev) => {
                                                                                    if (breakDraggedPlaylistIndex === null)
                                                                                        return;
                                                                                    ev.preventDefault();
                                                                                }, onDrop: (ev) => {
                                                                                    ev.preventDefault();
                                                                                    if (breakDraggedPlaylistIndex !== null) {
                                                                                        moveBreakTrackToPlaylistIndex(breakDraggedPlaylistIndex, index);
                                                                                        setBreakDraggedPlaylistIndex(null);
                                                                                        return;
                                                                                    }
                                                                                    const trackId = getBreakDraggedTrackId(ev);
                                                                                    if (!trackId)
                                                                                        return;
                                                                                    const draggedTrack = breakLibraryTracks.find((t) => t.id === trackId);
                                                                                    if (!draggedTrack)
                                                                                        return;
                                                                                    const next = [...breakPlaylistTracksRef.current];
                                                                                    next.splice(index, 0, draggedTrack);
                                                                                    setBreakPlaylistTracksAndSync(next);
                                                                                    setBreakDraggedTrackId(null);
                                                                                }, children: [_jsx("span", { title: "Drag to reorder playlist", style: { color: 'var(--color-text-secondary)', cursor: 'grab', fontSize: 16, textAlign: 'center' }, children: "\u2630" }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: track.title }), isCurrent && (_jsx("span", { style: { fontSize: 11, border: '1px solid var(--color-border-focus)', borderRadius: 999, padding: '1px 8px', color: 'var(--color-accent-hover)' }, children: "Now Playing" }))] }), _jsxs("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: [track.artist || 'Unknown Artist', " \u2022 ", formatDurationMs(track.duration_ms)] })] }), _jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx("button", { title: "Move up", disabled: index === 0, onClick: () => moveBreakTrackInPlaylist(index, -1), style: { border: 'none', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }, children: "\u2B06\uFE0F" }), _jsx("button", { title: "Move down", disabled: index === breakPlaylistTracks.length - 1, onClick: () => moveBreakTrackInPlaylist(index, 1), style: { border: 'none', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }, children: "\u2B07\uFE0F" }), _jsx("button", { title: "Remove from playlist", onClick: () => removeBreakTrackFromPlaylist(index), style: { border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }, children: "\uD83D\uDDD1\uFE0F" })] })] }, `${track.id}-${index}`));
                                                                        }), breakPlaylistTracks.length === 0 && (_jsx("div", { style: { padding: 14, color: 'var(--color-text-secondary)' }, children: "Drag tracks from the library table here." }))] }) })] })] })] })] })), replacingId !== null && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => {
                                            setReplacingId(null);
                                            setSearchQuery('');
                                            setSearchResults([]);
                                            setReplaceUrl('');
                                            setReplaceTitle('');
                                            setReplaceArtist('');
                                            setReplaceDiscId('');
                                            setReplaceSearchMode('local');
                                        } }), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { style: { margin: 0 }, children: "\uD83D\uDD04 Replace Song" }), _jsx("button", { style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: 24,
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            transition: 'all 0.3s ease'
                                                        }, onMouseEnter: e => e.currentTarget.style.background = 'var(--color-bg-hover)', onMouseLeave: e => e.currentTarget.style.background = 'transparent', onClick: () => {
                                                            setReplacingId(null);
                                                            setSearchQuery('');
                                                            setSearchResults([]);
                                                            setReplaceUrl('');
                                                            setReplaceTitle('');
                                                            setReplaceArtist('');
                                                            setReplaceDiscId('');
                                                            setReplaceSearchMode('local');
                                                        }, children: "\u2715" })] }), _jsxs("div", { className: "search-mode-toggle", children: [localLibraryEnabled && (_jsxs("button", { className: `mode-button ${replaceSearchMode === 'local' ? 'active' : ''}`, onClick: () => setReplaceSearchMode('local'), children: [_jsx("img", { src: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg", alt: "Local Library", className: "mode-icon", style: { width: "20px", height: "20px", marginRight: "6px" } }), "Local Library"] })), externalLibraryEnabled && (_jsxs("button", { className: `mode-button ${replaceSearchMode === 'karaoke-nerds' ? 'active karaoke-nerds' : ''}`, onClick: () => setReplaceSearchMode('karaoke-nerds'), children: [_jsx("img", { src: "https://karaokenerds.com/Content/Icons/favicon.ico", alt: "Karaoke Nerds", className: "mode-icon", style: { width: "20px", height: "20px", marginRight: "6px" } }), "Karaoke Nerds"] })), _jsx("button", { className: `mode-button ${replaceSearchMode === 'url' ? 'active' : ''}`, onClick: () => setReplaceSearchMode('url'), children: "\uD83D\uDD17 URL" })] }), replaceSearchMode === 'url' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Video URL" }), _jsx("input", { className: "form-input", placeholder: "Enter YouTube or video URL...", value: replaceUrl, onChange: e => setReplaceUrl(e.target.value), autoFocus: true, style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Song Title" }), _jsx("input", { className: "form-input", placeholder: "Title (auto-filled from URL)", value: replaceTitle, onChange: e => setReplaceTitle(e.target.value), style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Artist Name" }), _jsx("input", { className: "form-input", placeholder: "Enter artist name...", value: replaceArtist, onChange: e => setReplaceArtist(e.target.value), style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Disc ID (Optional)" }), _jsx("input", { className: "form-input", placeholder: "Enter disc ID (e.g., SC123)...", value: replaceDiscId, onChange: e => setReplaceDiscId(e.target.value), style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsx("button", { className: "control-btn primary", style: { width: '100%', marginBottom: '16px' }, onClick: () => replaceSongWithUrl(replacingId, replaceUrl, replaceTitle, replaceArtist), disabled: busy || !replaceUrl.trim() || !replaceTitle.trim(), children: busy ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), " Replacing..."] })) : ('Replace with URL') }), allowDownloads && (_jsx("button", { className: "control-btn success", style: { width: '100%', marginBottom: '16px' }, onClick: () => downloadVideo(replaceUrl, replaceTitle, replaceArtist, undefined, replaceDiscId), disabled: busy || !replaceUrl.trim() || !replaceTitle.trim() || downloadingTrack === replaceUrl, children: downloadingTrack === replaceUrl ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), " Downloading..."] })) : (_jsx(_Fragment, { children: "\uD83D\uDCE5 Download to Library" })) }))] })) : (_jsxs(_Fragment, { children: [_jsx("input", { className: "search-input", placeholder: replaceSearchMode === 'local' ? "Search local library..." : "Search Karaoke Nerds...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), autoFocus: true, style: {
                                                            width: '100%',
                                                            boxSizing: 'border-box'
                                                        } }), _jsx("div", { className: "search-results", style: {
                                                            minHeight: '200px',
                                                            maxHeight: '400px',
                                                            marginBottom: '16px'
                                                        }, children: searchResults.length === 0 ? (_jsx("div", { style: {
                                                                padding: '40px 20px',
                                                                textAlign: 'center',
                                                                color: 'var(--color-text-secondary)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                minHeight: '200px'
                                                            }, children: searchQuery ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '24px', marginBottom: '12px', opacity: 0.5 }, children: "\uD83D\uDD0D" }), _jsx("div", { style: { fontSize: '14px' }, children: replaceSearchMode === 'local' ? 'No local results found' : 'No Karaoke Nerds results found' }), _jsx("div", { style: { fontSize: '12px', marginTop: '4px', opacity: 0.7 }, children: "Try a different search term" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '32px', marginBottom: '12px', opacity: 0.3 }, children: "\uD83C\uDFB5" }), _jsxs("div", { style: { fontSize: '14px' }, children: ["Start typing to search ", replaceSearchMode === 'local' ? 'local library' : 'Karaoke Nerds'] })] })) })) : (_jsx(_Fragment, { children: replaceSearchMode === 'local' ? (
                                                            // Local library results
                                                            searchResults.map((track) => (_jsxs("div", { className: "search-result", onClick: () => replaceSong(replacingId, track.id), children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: track.title || 'Unknown' }), _jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [track.artist || 'Unknown', track.disc_id && (_jsx("span", { style: {
                                                                                            marginLeft: 8,
                                                                                            fontSize: 11,
                                                                                            padding: '1px 6px',
                                                                                            background: 'var(--color-bg-primary)',
                                                                                            borderRadius: '4px',
                                                                                            opacity: 0.8
                                                                                        }, children: track.disc_id }))] })] }), _jsx("button", { className: "control-btn primary", style: {
                                                                            padding: '6px 14px',
                                                                            fontSize: '13px',
                                                                            minWidth: '70px'
                                                                        }, onClick: (e) => {
                                                                            e.stopPropagation();
                                                                            replaceSong(replacingId, track.id);
                                                                        }, children: "Select" })] }, track.id)))) : (
                                                            // KaraokeNerds results
                                                            searchResults.map((track, idx) => (_jsxs("div", { className: "search-result", onClick: () => replaceSongWithKaraokeNerds(replacingId, track), children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: track.title || 'Unknown' }), _jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [track.artist || 'Unknown', track.brand && (_jsx("span", { style: {
                                                                                            marginLeft: 8,
                                                                                            fontSize: 11,
                                                                                            padding: '1px 6px',
                                                                                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.2))',
                                                                                            borderRadius: '4px',
                                                                                            color: '#a855f7'
                                                                                        }, children: track.brand }))] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexShrink: 0 }, children: [allowDownloads && (_jsxs("button", { className: "control-btn", style: {
                                                                                    padding: '6px 14px',
                                                                                    fontSize: '13px',
                                                                                    minWidth: '70px',
                                                                                    background: downloadingTrack === track.url ? 'var(--color-bg-secondary)' : 'linear-gradient(135deg, #10b981, #059669)',
                                                                                    color: 'white'
                                                                                }, onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    downloadVideo(track.url, track.title, track.artist, track.brand);
                                                                                }, disabled: busy || downloadingTrack === track.url, title: "Download to local library", children: [downloadingTrack === track.url ? '⏳' : '📥', " Download"] })), _jsx("button", { className: "control-btn", style: {
                                                                                    padding: '6px 14px',
                                                                                    fontSize: '13px',
                                                                                    minWidth: '70px',
                                                                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                                                                }, onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    replaceSongWithKaraokeNerds(replacingId, track);
                                                                                }, children: "Select" })] })] }, track.url || idx)))) })) })] })), _jsx("button", { className: "control-btn", style: {
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: '2px solid var(--color-border)'
                                                }, onClick: () => {
                                                    setReplacingId(null);
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                    setReplaceUrl('');
                                                    setReplaceTitle('');
                                                    setReplaceArtist('');
                                                    setReplaceDiscId('');
                                                    setReplaceSearchMode('local');
                                                }, children: "Cancel" })] })] })), showManualRequest && (_jsxs(_Fragment, { children: [_jsx("div", { className: "modal-backdrop", onClick: () => {
                                            setShowManualRequest(false);
                                            setManualRequestQuery('');
                                            setManualRequestResults([]);
                                            setManualRequestName('');
                                            setManualRequestUrl('');
                                            setManualRequestTitle('');
                                            setManualRequestArtist('');
                                            setManualRequestDiscId('');
                                            setManualRequestMode('local');
                                        } }), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { style: { margin: 0 }, children: "\u2795 Add to Queue" }), _jsx("button", { style: {
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: 24,
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            transition: 'all 0.3s ease'
                                                        }, onMouseEnter: e => e.currentTarget.style.background = 'var(--color-bg-hover)', onMouseLeave: e => e.currentTarget.style.background = 'transparent', onClick: () => {
                                                            setShowManualRequest(false);
                                                            setManualRequestQuery('');
                                                            setManualRequestResults([]);
                                                            setManualRequestName('');
                                                            setManualRequestUrl('');
                                                            setManualRequestTitle('');
                                                            setManualRequestArtist('');
                                                            setManualRequestDiscId('');
                                                            setManualRequestMode('local');
                                                        }, children: "\u2715" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Singer Name (Optional)" }), _jsx("input", { className: "form-input", list: "singer-queue-names", placeholder: "Enter singer name...", value: manualRequestName, onChange: e => setManualRequestName(e.target.value), style: {
                                                            width: '100%',
                                                            boxSizing: 'border-box'
                                                        } }), _jsx("datalist", { id: "singer-queue-names", children: queueState?.queueOrder.map(s => (_jsx("option", { value: s.displayName }, s.singerId))) })] }), _jsxs("div", { className: "search-mode-toggle", children: [localLibraryEnabled && (_jsxs("button", { className: `mode-button ${manualRequestMode === 'local' ? 'active' : ''}`, onClick: () => setManualRequestMode('local'), children: [_jsx("img", { src: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f4da.svg", alt: "Local Library", className: "mode-icon", style: { width: "20px", height: "20px", marginRight: "6px" } }), "Local"] })), externalLibraryEnabled && (_jsxs("button", { className: `mode-button ${manualRequestMode === 'external' ? 'active karaoke-nerds' : ''}`, onClick: () => setManualRequestMode('external'), children: [_jsx("img", { src: "https://karaokenerds.com/Content/Icons/favicon.ico", alt: "Karaoke Nerds", className: "mode-icon", style: { width: "20px", height: "20px", marginRight: "6px" } }), "External"] })), _jsx("button", { className: `mode-button ${manualRequestMode === 'url' ? 'active' : ''}`, onClick: () => setManualRequestMode('url'), children: "\uD83D\uDD17 URL" })] }), manualRequestMode === 'url' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Video URL" }), _jsx("input", { className: "form-input", placeholder: "Enter YouTube or video URL...", value: manualRequestUrl, onChange: e => setManualRequestUrl(e.target.value), autoFocus: true, style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Song Title" }), _jsx("input", { className: "form-input", placeholder: "Title (auto-filled from URL)", value: manualRequestTitle, onChange: e => setManualRequestTitle(e.target.value), style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Artist Name" }), _jsx("input", { className: "form-input", placeholder: "Enter artist name...", value: manualRequestArtist, onChange: e => setManualRequestArtist(e.target.value), style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-label", children: "Disc ID (Optional)" }), _jsx("input", { className: "form-input", placeholder: "Enter disc ID (e.g., SC123)...", value: manualRequestDiscId, onChange: e => setManualRequestDiscId(e.target.value), style: {
                                                                    width: '100%',
                                                                    boxSizing: 'border-box',
                                                                    marginBottom: '16px'
                                                                } })] }), _jsx("button", { className: "control-btn primary", style: { width: '100%', marginBottom: '16px' }, onClick: addManualRequestUrl, disabled: busy || !manualRequestUrl.trim() || !manualRequestTitle.trim(), children: busy ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), " Adding..."] })) : ('Add to Queue') }), allowDownloads && (_jsx("button", { className: "control-btn success", style: { width: '100%', marginBottom: '16px' }, onClick: () => downloadVideo(manualRequestUrl, manualRequestTitle, manualRequestArtist, undefined, manualRequestDiscId), disabled: busy || !manualRequestUrl.trim() || !manualRequestTitle.trim() || downloadingTrack === manualRequestUrl, children: downloadingTrack === manualRequestUrl ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading-spinner" }), " Downloading..."] })) : (_jsx(_Fragment, { children: "\uD83D\uDCE5 Download to Library" })) }))] })) : (_jsxs(_Fragment, { children: [_jsx("input", { className: "search-input", placeholder: manualRequestMode === 'local' ? "Search local library..." : "Search Karaoke Nerds...", value: manualRequestQuery, onChange: e => setManualRequestQuery(e.target.value), autoFocus: true, style: {
                                                            width: '100%',
                                                            boxSizing: 'border-box'
                                                        } }), _jsx("div", { className: "search-results", style: {
                                                            minHeight: '200px',
                                                            maxHeight: '400px',
                                                            marginBottom: '16px'
                                                        }, children: manualRequestResults.length === 0 ? (_jsx("div", { style: {
                                                                padding: '40px 20px',
                                                                textAlign: 'center',
                                                                color: 'var(--color-text-secondary)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                minHeight: '200px'
                                                            }, children: manualRequestQuery ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '24px', marginBottom: '12px', opacity: 0.5 }, children: "\uD83D\uDD0D" }), _jsx("div", { style: { fontSize: '14px' }, children: manualRequestMode === 'local' ? 'No local results found' : 'No external results found' }), _jsx("div", { style: { fontSize: '12px', marginTop: '4px', opacity: 0.7 }, children: "Try a different search term" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '32px', marginBottom: '12px', opacity: 0.3 }, children: "\uD83C\uDFB5" }), _jsxs("div", { style: { fontSize: '14px' }, children: ["Start typing to search ", manualRequestMode === 'local' ? 'local library' : 'external library'] })] })) })) : (_jsx(_Fragment, { children: manualRequestMode === 'local' ? (
                                                            // Local library results
                                                            manualRequestResults.map((track) => (_jsxs("div", { className: "search-result", onClick: () => addManualRequestLocal(track.id), children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: track.title || 'Unknown' }), _jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [track.artist || 'Unknown', track.disc_id && (_jsx("span", { style: {
                                                                                            marginLeft: 8,
                                                                                            fontSize: 11,
                                                                                            padding: '1px 6px',
                                                                                            background: 'var(--color-bg-primary)',
                                                                                            borderRadius: '4px',
                                                                                            opacity: 0.8
                                                                                        }, children: track.disc_id }))] })] }), _jsx("button", { className: "control-btn primary", style: {
                                                                            padding: '6px 14px',
                                                                            fontSize: '13px',
                                                                            minWidth: '70px'
                                                                        }, onClick: (e) => {
                                                                            e.stopPropagation();
                                                                            addManualRequestLocal(track.id);
                                                                        }, disabled: busy, children: busy ? '...' : 'Add' })] }, track.id)))) : (
                                                            // External results
                                                            manualRequestResults.map((track, idx) => (_jsxs("div", { className: "search-result", onClick: () => addManualRequestExternal(track), children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: track.title || 'Unknown' }), _jsxs("div", { style: { fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [track.artist || 'Unknown', track.brand && (_jsx("span", { style: {
                                                                                            marginLeft: 8,
                                                                                            fontSize: 11,
                                                                                            padding: '1px 6px',
                                                                                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.2))',
                                                                                            borderRadius: '4px',
                                                                                            color: '#a855f7'
                                                                                        }, children: track.brand }))] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexShrink: 0 }, children: [allowDownloads && (_jsx("button", { className: "control-btn", style: {
                                                                                    padding: '6px 14px',
                                                                                    fontSize: '13px',
                                                                                    minWidth: '90px',
                                                                                    background: downloadingTrack === track.url ? 'var(--color-bg-secondary)' : 'linear-gradient(135deg, #10b981, #059669)',
                                                                                    color: 'white'
                                                                                }, onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    downloadVideo(track.url, track.title, track.artist, track.brand);
                                                                                }, disabled: busy || downloadingTrack === track.url, title: "Download to local library", children: downloadingTrack === track.url ? '⏳ Downloading...' : '📥 Download' })), _jsx("button", { className: "control-btn", style: {
                                                                                    padding: '6px 14px',
                                                                                    fontSize: '13px',
                                                                                    minWidth: '70px',
                                                                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                                                                }, onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    addManualRequestExternal(track);
                                                                                }, disabled: busy, children: busy ? '...' : 'Add' })] })] }, track.url || idx)))) })) })] })), _jsx("button", { className: "control-btn", style: {
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: '2px solid var(--color-border)'
                                                }, onClick: () => {
                                                    setShowManualRequest(false);
                                                    setManualRequestQuery('');
                                                    setManualRequestResults([]);
                                                    setManualRequestName('');
                                                    setManualRequestUrl('');
                                                    setManualRequestTitle('');
                                                    setManualRequestArtist('');
                                                    setManualRequestDiscId('');
                                                    setManualRequestMode('local');
                                                }, children: "Cancel" })] })] }))] }))] })] }));
}
// Inline Edit Helper Component
function InlineEdit({ value, onSave, disabled }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    useEffect(() => setVal(value), [value]);
    if (!editing) {
        return (_jsx("span", { onClick: () => !disabled && setEditing(true), style: {
                cursor: disabled ? 'default' : 'pointer',
                borderRadius: 4,
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: 'var(--color-text-secondary)',
                display: 'inline-block'
            }, children: value || _jsx("span", { style: { opacity: 0.6 }, children: "Click to set" }) }));
    }
    return (_jsx("input", { autoFocus: true, value: val, onChange: e => setVal(e.target.value), onBlur: () => {
            setEditing(false);
            if (val !== value)
                onSave(val);
        }, onKeyDown: (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
            else if (e.key === 'Escape') {
                setVal(value);
                setEditing(false);
            }
        }, style: {
            padding: '2px 6px',
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-accent)',
            borderRadius: 4,
            color: 'var(--color-text-primary)',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            minWidth: 100
        }, disabled: disabled }));
}
