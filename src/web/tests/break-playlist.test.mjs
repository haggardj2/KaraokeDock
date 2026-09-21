import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { matchesBreakTrack, optionalPlaylistId, samePlaylistOrder } from '../src/break-playlist.ts'

const track = (id, file_path = `/music/80s/song-${id}.mp3`) => ({
  id, title: `Song ${id}`, artist: 'Artist', genre: 'Pop', duration_ms: 120000, file_path,
})

describe('break music identity and folder search', () => {
  it('does not turn an unnamed running playlist into selected ID zero', () => {
    for (const value of [null, undefined, '', 0, -1, 'wrong', 1.5]) assert.equal(optionalPlaylistId(value), null)
    assert.equal(optionalPlaylistId('12'), 12)
  })
  it('preserves order and repeated tracks when comparing playback updates', () => {
    assert.equal(samePlaylistOrder([track(1), track(2), track(1)], [1, 2, 1]), true)
    assert.equal(samePlaylistOrder([track(1), track(2)], [2, 1]), false)
    assert.equal(samePlaylistOrder([track(1), track(2)], [1, 2, 1]), false)
  })
  it('searches literal folder names and normalizes slashes without searching only song titles', () => {
    assert.equal(matchesBreakTrack(track(1), '/music/80s/'), true)
    assert.equal(matchesBreakTrack(track(1), '/music/90s/'), false)
    assert.equal(matchesBreakTrack(track(1, 'C:\\Music\\80s\\Song.mp3'), 'c:/music/80s/'), true)
    assert.equal(matchesBreakTrack(track(1, '/music/100%_hits/song.mp3'), '100%_hits'), true)
    assert.equal(matchesBreakTrack(track(1), 'artist'), true)
  })
})

const host = readFileSync(new URL('../src/pages/Host.tsx', import.meta.url), 'utf8')
function functionSource(name) {
  const start = host.indexOf(`  async function ${name}(`) >= 0
    ? host.indexOf(`  async function ${name}(`) : host.indexOf(`  function ${name}(`)
  assert.ok(start >= 0, `Missing ${name}`)
  return host.slice(start, host.indexOf('\n  }\n', start) + 5)
}
function harness(names, overrides = {}) {
  const state = { selection: '7', activeId: 7, name: 'Draft', tracks: [track(1), track(2)], error: '', notice: '', playlists: [{ id: 7, name: 'Running' }], draft: false, dirty: false, polls: 0, writes: [] }
  const environment = {
    auth: { sessionToken: 'host', isLoggedIn: true },
    headers: {},
    window: { confirm: () => true },
    breakManagerBusyRef: { current: false },
    breakDraftRef: { current: false },
    breakEditorRequestRef: { current: 0 },
    breakStateRequestRef: { current: 0 },
    breakPlaylistSyncRequestRef: { current: 0 },
    breakSyncChainRef: { current: Promise.resolve() },
    breakPlaylistTracksRef: { current: state.tracks },
    breakDraftDirty: false,
    breakPlaylistName: 'Draft',
    breakPlaylists: state.playlists,
    optionalPlaylistId,
    setBreakManagerBusy() {},
    setBreakManagerError: error => { state.error = error },
    setBreakManagerNotice: notice => { state.notice = notice },
    setBreakDraftMode: draft => { state.draft = draft },
    setBreakDraftDirty: dirty => { state.dirty = dirty },
    setBreakPlaylistName: name => { state.name = name },
    setBreakEditorTracks: tracks => { state.tracks = tracks; environment.breakPlaylistTracksRef.current = tracks },
    setSelectedBreakPlaylistId: id => { state.selection = id },
    setActiveBreakPlaylistId: id => { state.activeId = id },
    setBreakPlaylists: value => { state.playlists = typeof value === 'function' ? value(state.playlists) : value },
    setBreakSyncPending() {},
    syncBreakActivePlaylist: async tracks => { state.writes.push(tracks.map(track => track.id)) },
    loadBreakMusicState: async () => { state.polls++ },
    setBreakPlaylistTrackIds: ids => { state.activeTracks = ids },
    setBreakPlaylistIndex() {},
    setBreakMusicTrack() {},
    api: async () => ({ playlistId: 8, warning: 'M3U folder is read-only' }),
    ...overrides,
  }
  const js = ts.transpileModule(names.map(functionSource).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const functions = new Function(...Object.keys(environment), `${js}; return {${names.join(',')}}`)(...Object.values(environment))
  return { state, environment, ...functions }
}

describe('Host break playlist workflow', () => {
  it('keeps the current song pinned while allowing upcoming tracks to be reordered', () => {
    const app = harness(['moveBreakTrackInPlaylist', 'moveBreakTrackToPlaylistIndex', 'setBreakPlaylistTracksAndSync'], {
      breakMusicTrack: track(1),
      breakPlaylistTracksRef: { current: [track(1), track(2), track(3)] },
    })
    app.moveBreakTrackInPlaylist(0, 1)
    assert.equal(app.state.dirty, false)
    app.moveBreakTrackToPlaylistIndex(2, 0)
    assert.deepEqual(app.state.tracks.map(track => track.id), [1, 3, 2])
  })
  it('allows unrestricted reordering in a draft even when it includes the running song', () => {
    const app = harness(['moveBreakTrackToPlaylistIndex', 'setBreakPlaylistTracksAndSync'], {
      breakMusicTrack: track(1),
      breakDraftRef: { current: true },
    })
    app.moveBreakTrackToPlaylistIndex(0, 1)
    assert.deepEqual(app.state.tracks.map(track => track.id), [2, 1])
    assert.deepEqual(app.state.writes, [])
  })
  it('hydrates rotated playback order but never overwrites an independent draft', async () => {
    const app = harness(['hydrateBreakActivePlaylist'], {
      api: async () => ({ tracks: [track(2), track(3), track(1)], activePlaylistId: 7 }),
    })
    await app.hydrateBreakActivePlaylist()
    assert.deepEqual(app.state.tracks.map(track => track.id), [2, 3, 1])
    app.environment.breakDraftRef.current = true
    app.environment.setBreakEditorTracks([track(99)])
    await app.hydrateBreakActivePlaylist()
    assert.deepEqual(app.state.tracks.map(track => track.id), [99])
  })
  it('starts an independent draft without clearing the running playlist or posting changes', () => {
    const app = harness(['newBreakPlaylist', 'setBreakPlaylistTracksAndSync'])
    app.newBreakPlaylist()
    app.setBreakPlaylistTracksAndSync([track(3)])
    assert.equal(app.state.draft, true)
    assert.deepEqual(app.state.tracks.map(track => track.id), [3])
    assert.deepEqual(app.state.writes, [])
    assert.equal(app.state.activeId, 7)
  })
  it('serializes rapid edits to the running playlist so older saves cannot win', async () => {
    let release
    const calls = []
    const app = harness(['setBreakPlaylistTracksAndSync'], {
      syncBreakActivePlaylist: async tracks => {
        calls.push(tracks.map(track => track.id))
        if (calls.length === 1) await new Promise(resolve => { release = resolve })
      },
    })
    app.setBreakPlaylistTracksAndSync([track(1)])
    app.setBreakPlaylistTracksAndSync([track(1), track(2)])
    await Promise.resolve()
    assert.deepEqual(calls, [[1]])
    release()
    await app.environment.breakSyncChainRef.current
    assert.deepEqual(calls, [[1], [1, 2]])
  })
  it('keeps a saved selection visible and surfaces export warnings without altering playback', async () => {
    const app = harness(['saveBreakPlaylist'], { breakDraftRef: { current: true } })
    await app.saveBreakPlaylist()
    assert.equal(app.state.selection, '8')
    assert.equal(app.state.playlists[0].name, 'Draft')
    assert.equal(app.state.activeId, 7)
    assert.match(app.state.notice, /Saved "Draft".*M3U folder is read-only/)
    assert.equal(app.state.error, '')
  })
  it('loads full saved playlist tracks independently of library search results', async () => {
    const app = harness(['loadBreakPlaylist'], {
      breakDraftRef: { current: true },
      api: async () => ({ tracks: [track(99), track(99)], trackIds: [99, 99], currentTrack: track(99), playlistIndex: 0 }),
    })
    await app.loadBreakPlaylist(7)
    assert.deepEqual(app.state.tracks.map(track => track.id), [99, 99])
    assert.equal(app.state.selection, '7')
    assert.equal(app.state.draft, false)
    assert.equal(app.state.polls, 1)
  })
  it('prevents playback polling from overwriting the selected playlist', async () => {
    const polling = functionSource('loadBreakMusicState')
    assert.equal(polling.includes('setSelectedBreakPlaylistId'), false)
    assert.equal(polling.includes('setBreakEditorTracks'), false)
    assert.equal(polling.includes('setBreakPlaylistTracks('), false)
  })
})
