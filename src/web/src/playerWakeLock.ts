export function keepPlayerScreenAwake(
  report: (message: string | null) => void,
  page: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document,
  browser: Pick<Navigator, 'userAgent'> & Partial<Pick<Navigator, 'wakeLock'>> = navigator,
) {
  if (browser.userAgent.includes('KaraokeDockTV/')) {
    return { retry: () => {}, dispose: () => {} };
  }

  let disposed = false;
  let pending = false;
  let lock: WakeLockSentinel | null = null;
  const unavailable = 'This browser cannot keep the screen awake. Use a supported browser over HTTPS or adjust the device screen timeout.';
  const released = 'Screen wake lock was released. The screen may sleep; retry keeping it awake.';

  async function release(sentinel: WakeLockSentinel) {
    try {
      await sentinel.release();
    } catch (error) {
      console.warn('Could not release Player screen wake lock:', error);
    }
  }

  async function acquire() {
    if (disposed || pending || page.visibilityState !== 'visible' || (lock && !lock.released)) return;
    if (!browser.wakeLock) {
      report(unavailable);
      return;
    }
    pending = true;
    let discarded = false;
    try {
      const sentinel = await browser.wakeLock.request('screen');
      if (disposed || page.visibilityState !== 'visible') {
        discarded = true;
        await release(sentinel);
        return;
      }
      if (sentinel.released) {
        report(released);
        return;
      }
      lock = sentinel;
      sentinel.addEventListener('release', () => {
        if (lock !== sentinel) return;
        lock = null;
        if (!disposed && page.visibilityState === 'visible') report(released);
      }, { once: true });
      report(null);
    } catch (error) {
      if (!disposed && page.visibilityState === 'visible') {
        console.warn('Could not keep Player screen awake:', error);
        report('Could not keep the screen awake. Retry, and check HTTPS, battery saver, and browser permissions.');
      }
    } finally {
      pending = false;
      // Visibility can change again while a stale request is being released.
      if (discarded && !disposed && page.visibilityState === 'visible') void acquire();
    }
  }

  function onVisibilityChange() {
    if (page.visibilityState === 'visible') {
      void acquire();
    } else if (lock) {
      const sentinel = lock;
      lock = null;
      void release(sentinel);
    }
  }

  page.addEventListener('visibilitychange', onVisibilityChange);
  page.addEventListener('pointerdown', acquire);
  void acquire();
  return {
    retry: () => { void acquire(); },
    dispose: () => {
      disposed = true;
      page.removeEventListener('visibilitychange', onVisibilityChange);
      page.removeEventListener('pointerdown', acquire);
      if (lock) {
        const sentinel = lock;
        lock = null;
        void release(sentinel);
      }
    },
  };
}
