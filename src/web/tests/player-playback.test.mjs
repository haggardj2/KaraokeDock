import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PLAYER_PLAYBACK_STATE,
  normalizePlayerPlaybackState,
  isSingerPaused,
  singerPlaybackAction,
  playSingerMedia,
  controlSingerIframe,
  canReportSingerTiming,
  restoreSingerPosition,
  getSingerDisplaySong,
  prepareSingerIframe,
} from '../src/playerPlayback.ts'
import { createBreakMusicPlayback, shouldRunBreakMusic } from '../src/breakMusicPlayback.ts'

const playingState = { manualStop: false, queueId: 12, paused: false, positionSec: 34 }
const pausedState = { ...playingState, paused: true }
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function mediaStub() {
  const listeners = new Map()
  return {
    src: '',
    currentTime: 0,
    volume: 1,
    muted: false,
    paused: true,
    playCalls: 0,
    pauseCalls: 0,
    loadCalls: 0,
    pending: null,
    play() {
      this.playCalls++
      this.paused = false
      return this.pending?.promise ?? Promise.resolve()
    },
    pause() { this.pauseCalls++; this.paused = true },
    load() { this.loadCalls++; this.currentTime = 0 },
    addEventListener(name, callback) { listeners.set(name, callback) },
    removeEventListener(name) { listeners.delete(name) },
    emit(name) { listeners.get(name)?.() },
  }
}

describe('singer playback controls', () => {
  it('shows the actual singing song and its metadata ahead of the next queued song', () => {
    const next = { status: 'queued', title: 'Next title', artist: 'Next artist', discId: 'NEXT' }
    const singing = { status: 'playing', title: 'Current title', artist: 'Current artist', discId: 'CURRENT' }
    const singer = { nextSong: next, queuedSongs: [next, singing, { ...next, title: 'Later' }] }
    assert.equal(getSingerDisplaySong(singer), singing)
    assert.deepEqual(getSingerDisplaySong(singer), {
      status: 'playing', title: 'Current title', artist: 'Current artist', discId: 'CURRENT',
    })
    assert.equal(singer.nextSong, next)
  })

  it('shows a current performance even when the singer has no more queued songs', () => {
    const singing = { status: 'playing', title: 'Only song' }
    assert.equal(getSingerDisplaySong({ nextSong: null, queuedSongs: [singing] }), singing)
  })

  it('shows the next song for a waiting singer and no song for an empty singer', () => {
    const next = { status: 'queued', title: 'Next song' }
    assert.equal(getSingerDisplaySong({ nextSong: next, queuedSongs: [next] }), next)
    assert.equal(getSingerDisplaySong({ nextSong: null, queuedSongs: [] }), null)
  })

  it('starts when idle or stopped, pauses the active singer, and resumes that singer', () => {
    assert.equal(singerPlaybackAction(DEFAULT_PLAYER_PLAYBACK_STATE, null), 'play')
    assert.equal(singerPlaybackAction({ ...DEFAULT_PLAYER_PLAYBACK_STATE, manualStop: true }, undefined), 'play')
    assert.equal(singerPlaybackAction(playingState, 12), 'pause')
    assert.equal(singerPlaybackAction(pausedState, '12'), 'resume')
    assert.equal(isSingerPaused(pausedState, 13), false)
  })

  it('restores a saved pause and safely merges live pause/resume fields', () => {
    assert.deepEqual(normalizePlayerPlaybackState(pausedState), pausedState)
    assert.deepEqual(normalizePlayerPlaybackState({ paused: false }, pausedState), playingState)
    assert.equal(normalizePlayerPlaybackState({ queueId: null }).queueId, null)
    assert.equal(normalizePlayerPlaybackState({ queueId: 0, positionSec: NaN }).positionSec, 0)
    assert.equal(normalizePlayerPlaybackState({ positionSec: -4 }).positionSec, 0)
  })

  it('blocks timing and completion reports for paused, stopped, or superseded singers', () => {
    assert.equal(canReportSingerTiming(pausedState, 12, 12), false)
    assert.equal(canReportSingerTiming(playingState, null, 12), false)
    assert.equal(canReportSingerTiming(playingState, 13, 12), false)
    assert.equal(canReportSingerTiming(playingState, '12', 12), true)
  })

  it('restores a freshly loaded local paused position once, retrying after metadata if needed', async () => {
    const media = mediaStub()
    let ready = false
    let position = 0
    Object.defineProperty(media, 'currentTime', {
      get: () => position,
      set: (value) => {
        if (!ready) throw new Error('metadata unavailable')
        position = value
      },
    })
    const cleanup = restoreSingerPosition(media, pausedState.positionSec)
    await playSingerMedia(media, () => true, () => true, 0)
    assert.equal(media.playCalls, 0)
    ready = true
    media.emit('loadedmetadata')
    assert.equal(media.currentTime, 34)
    media.currentTime = 40
    media.emit('loadedmetadata')
    assert.equal(media.currentTime, 40)
    cleanup()
  })

  it('never starts a paused singer, including a local user-interaction retry', async () => {
    const media = mediaStub()
    assert.equal(await playSingerMedia(media, () => true, () => true, 0), 'paused')
    assert.equal(media.playCalls, 0)
    assert.equal(media.paused, true)
  })

  it('resumes the existing local/CDG element without loading or rewinding it', async () => {
    const media = mediaStub()
    media.currentTime = 57
    assert.equal(await playSingerMedia(media, () => true, () => false, 0), 'playing')
    assert.equal(media.currentTime, 57)
    assert.equal(media.loadCalls, 0)
    assert.equal(media.muted, false)
  })

  for (const rejected of [false, true]) {
    it(`honors Host pause while local play ${rejected ? 'rejects' : 'resolves'}`, async () => {
      const media = mediaStub()
      media.pending = deferred()
      let paused = false
      const result = playSingerMedia(media, () => true, () => paused, 0)
      paused = true
      if (rejected) media.pending.reject(new Error('interrupted'))
      else media.pending.resolve()
      assert.equal(await result, 'paused')
      assert.equal(media.paused, true)
      assert.equal(media.muted, true)
    })
  }

  it('checks Host pause again after the autoplay unmute delay', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const media = mediaStub()
    let paused = false
    const result = playSingerMedia(media, () => true, () => paused)
    await Promise.resolve()
    paused = true
    t.mock.timers.tick(100)
    assert.equal(await result, 'paused')
    assert.equal(media.muted, true)
  })

  it('does not let an old play promise change a newly bound song', async () => {
    const media = mediaStub()
    media.pending = deferred()
    let current = true
    const result = playSingerMedia(media, () => current, () => false, 0)
    current = false
    media.pending.resolve()
    assert.equal(await result, 'stale')
    assert.equal(media.muted, true)
    assert.equal(media.pauseCalls, 0)
  })

  it('YouTube onReady restores a saved pause; later toggles reuse the instance without seeking', () => {
    const calls = []
    const player = {
      pauseVideo() { calls.push('pause') },
      playVideo() { calls.push('play') },
      seekTo(position) { calls.push(['seek', position]) },
    }
    controlSingerIframe(player, pausedState, 12, true)
    assert.deepEqual(calls, [['seek', 34], 'pause'])
    controlSingerIframe(player, playingState, 12)
    controlSingerIframe(player, pausedState, 12)
    assert.deepEqual(calls, [['seek', 34], 'pause', 'play', 'pause'])
  })
})

const idleBreak = {
  src: '/break/one.mp3',
  elapsedSec: 24,
  paused: false,
  pauseDuringKaraoke: true,
  mutedForKaraoke: false,
  karaokeActive: false,
  volumePercent: 65,
  crossfadeSeconds: 0,
}

describe('break music playback and mute safety', () => {
  it('fades continuing break music over the configured time before starting local singer audio', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const audio = mediaStub()
    const singer = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    const continuing = { ...idleBreak, pauseDuringKaraoke: false, crossfadeSeconds: 2 }
    await playback.update(continuing)
    t.mock.timers.tick(2000)
    assert.equal(audio.volume, 0.65)
    const preparation = playback.prepareForKaraoke()
    const singing = playSingerMedia(singer, () => true, () => false, 0, () => preparation)
    assert.equal(singer.playCalls, 0)
    assert.equal(audio.muted, false)
    t.mock.timers.tick(1000)
    assert.ok(audio.volume > 0 && audio.volume < 0.65)
    const halfway = audio.volume
    playback.confirmKaraokeActive(true)
    await playback.update({ ...continuing, karaokeActive: true, mutedForKaraoke: true })
    assert.equal(playback.prepareForKaraoke(), preparation)
    assert.equal(audio.volume, halfway)
    assert.equal(singer.playCalls, 0)
    t.mock.timers.tick(1000)
    await preparation
    assert.equal(await singing, 'playing')
    assert.equal(audio.volume, 0)
    assert.equal(audio.muted, true)
    assert.equal(audio.paused, false)
    assert.equal(audio.loadCalls, 1)
    assert.equal(audio.playCalls, 1)
    assert.equal(singer.playCalls, 1)
    playback.confirmKaraokeActive(false)
    await playback.update({ ...continuing, elapsedSec: 28 })
    t.mock.timers.tick(1000)
    assert.ok(audio.volume > 0 && audio.volume < 0.65)
    t.mock.timers.tick(1000)
    assert.equal(audio.volume, 0.65)
    assert.equal(audio.muted, false)
  })

  it('ignores stale idle updates while fading out instead of restoring break volume', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    const continuing = { ...idleBreak, pauseDuringKaraoke: false, crossfadeSeconds: 2 }
    await playback.update(continuing)
    t.mock.timers.tick(2000)
    const preparation = playback.prepareForKaraoke()
    t.mock.timers.tick(1000)
    const halfway = audio.volume
    await playback.update({ ...continuing, elapsedSec: 25 })
    assert.equal(audio.volume, halfway)
    t.mock.timers.tick(1000)
    await preparation
    assert.equal(audio.muted, true)
    assert.equal(audio.volume, 0)
  })

  it('cancels a fade on Stop without starting a superseded singer', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const audio = mediaStub()
    const singer = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    const continuing = { ...idleBreak, pauseDuringKaraoke: false, crossfadeSeconds: 2 }
    await playback.update(continuing)
    t.mock.timers.tick(2000)
    let current = true
    const singing = playSingerMedia(singer, () => current, () => false, 0, playback.prepareForKaraoke)
    t.mock.timers.tick(1000)
    current = false
    playback.confirmKaraokeActive(false)
    assert.equal(await singing, 'stale')
    assert.equal(singer.playCalls, 0)
    assert.equal(playback.isPreparingForKaraoke(), false)
    await playback.update(continuing)
    t.mock.timers.tick(2000)
    assert.equal(audio.volume, 0.65)
    assert.equal(audio.muted, false)
  })

  it('honors a singer pause received while waiting for the fade', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const audio = mediaStub()
    const singer = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update({ ...idleBreak, pauseDuringKaraoke: false, crossfadeSeconds: 1 })
    t.mock.timers.tick(1000)
    let paused = false
    const singing = playSingerMedia(singer, () => true, () => paused, 0, playback.prepareForKaraoke)
    paused = true
    t.mock.timers.tick(1000)
    assert.equal(await singing, 'paused')
    assert.equal(singer.playCalls, 0)
    assert.equal(audio.muted, true)
  })

  it('waits for the fade before playing YouTube and rejects a stopped iframe', async () => {
    const transition = deferred()
    const calls = []
    const iframe = {
      pauseVideo() { calls.push('pause') },
      playVideo() { calls.push('play') },
      seekTo(position) { calls.push(['seek', position]) },
    }
    let current = true
    const ready = prepareSingerIframe(iframe, 12, () => playingState, () => current, () => transition.promise, true)
    assert.deepEqual(calls, [])
    transition.resolve()
    await ready
    assert.deepEqual(calls, [['seek', 34], 'play'])
    calls.length = 0
    const pending = deferred()
    const stale = prepareSingerIframe(iframe, 12, () => playingState, () => current, () => pending.promise)
    current = false
    pending.resolve()
    await stale
    assert.deepEqual(calls, [])
  })

  it('does not introduce a wait when break music is already silent', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update({ ...idleBreak, pauseDuringKaraoke: false, karaokeActive: true, crossfadeSeconds: 10 })
    await playback.prepareForKaraoke()
    assert.equal(playback.isPreparingForKaraoke(), false)
    assert.equal(audio.muted, true)
    assert.equal(audio.paused, false)
  })

  it('default mode pauses/mutes during a singer and resumes at the saved break offset', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update(idleBreak)
    assert.equal(audio.muted, false)
    assert.equal(audio.volume, 0.65)
    await playback.update({ ...idleBreak, karaokeActive: true })
    assert.equal(audio.muted, true)
    assert.equal(audio.paused, true)
    assert.equal(audio.volume, 0)
    await playback.update(idleBreak)
    assert.equal(audio.currentTime, 24)
    assert.equal(audio.muted, false)
    assert.equal(audio.paused, false)
    assert.equal(audio.volume, 0.65)
  })

  it('silent continuation keeps one audio element running and polls through track advancement', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    const continuing = { ...idleBreak, pauseDuringKaraoke: false }
    await playback.update(continuing)
    const singing = { ...continuing, karaokeActive: true }
    assert.equal(shouldRunBreakMusic(singing), true)
    playback.muteForKaraoke()
    await playback.update(singing)
    assert.equal(audio.loadCalls, 1)
    assert.equal(audio.playCalls, 1)
    assert.equal(audio.paused, false)
    assert.equal(audio.muted, true)
    await playback.update({ ...singing, src: '/break/two.mp3', elapsedSec: 0 })
    assert.equal(audio.src, '/break/two.mp3')
    assert.equal(audio.loadCalls, 2)
    assert.equal(audio.muted, true)
    assert.equal(audio.volume, 0)
    playback.confirmKaraokeActive(false)
    await playback.update({ ...continuing, src: '/break/two.mp3', elapsedSec: 8 })
    assert.equal(audio.loadCalls, 2)
    assert.equal(audio.paused, false)
    assert.equal(audio.muted, false)
    assert.equal(audio.volume, 0.65)
  })

  it('honors intentional break pause even when silent continuation is selected', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    const paused = { ...idleBreak, paused: true, pauseDuringKaraoke: false }
    await playback.update({ ...paused, karaokeActive: true })
    await playback.update(paused)
    assert.equal(shouldRunBreakMusic(paused), false)
    assert.equal(audio.playCalls, 0)
    assert.equal(audio.paused, true)
  })

  it('does not let an old idle response undo the immediate singer-start mute', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update(idleBreak)
    playback.muteForKaraoke()
    await playback.update({ ...idleBreak, elapsedSec: 25 })
    assert.equal(audio.muted, true)
    assert.equal(audio.volume, 0)
    assert.equal(audio.paused, true)
    playback.confirmKaraokeActive(false)
    await playback.update({ ...idleBreak, elapsedSec: 25 })
    assert.equal(audio.muted, false)
    assert.equal(audio.paused, false)
  })

  it('keeps break audio muted during a singer pause and until server karaoke mute clears', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update({ ...idleBreak, pauseDuringKaraoke: false, mutedForKaraoke: true })
    assert.equal(audio.muted, true)
    assert.equal(audio.paused, false)
    assert.equal(audio.volume, 0)
  })

  for (const rejected of [false, true]) {
    it(`cannot unmute an idle play promise that ${rejected ? 'rejects' : 'resolves'} after karaoke starts`, async (t) => {
      const audio = mediaStub()
      const playback = createBreakMusicPlayback(audio)
      t.after(() => playback.dispose())
      audio.pending = deferred()
      const pending = playback.update(idleBreak)
      playback.muteForKaraoke()
      assert.equal(audio.muted, true)
      await playback.update({ ...idleBreak, karaokeActive: true })
      if (rejected) audio.pending.reject(new Error('interrupted'))
      else audio.pending.resolve()
      await pending
      assert.equal(audio.muted, true)
      assert.equal(audio.volume, 0)
      assert.equal(audio.paused, true)
    })
  }

  it('cancels an inter-song fade immediately when a singer starts', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update({ ...idleBreak, crossfadeSeconds: 3, pauseDuringKaraoke: false })
    t.mock.timers.tick(100)
    assert.ok(audio.volume > 0)
    playback.muteForKaraoke()
    t.mock.timers.tick(5000)
    assert.equal(audio.muted, true)
    assert.equal(audio.volume, 0)
    assert.equal(audio.paused, false)
  })

  it('switching from silent continuation to pause mode pauses without ever becoming audible', async (t) => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    t.after(() => playback.dispose())
    await playback.update({ ...idleBreak, karaokeActive: true, pauseDuringKaraoke: false })
    await playback.update({ ...idleBreak, karaokeActive: true, pauseDuringKaraoke: true })
    assert.equal(audio.paused, true)
    assert.equal(audio.muted, true)
    assert.equal(audio.volume, 0)
  })

  it('disposal cancels a pending play without unmuting it', async () => {
    const audio = mediaStub()
    const playback = createBreakMusicPlayback(audio)
    audio.pending = deferred()
    const pending = playback.update(idleBreak)
    playback.dispose()
    audio.pending.resolve()
    await pending
    assert.equal(audio.muted, true)
    assert.equal(audio.paused, true)
  })
})
