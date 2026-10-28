// Request page theme: applied before first paint (this loads right after the stylesheets),
// then app.js keeps the venue default in sync and drives the profile-menu picker.
// The singer's choice is 'venue' (follow Station's Request Page Theme) or a theme id.
(() => {
  const THEME_IDS = ['midnight', 'stage', 'daylight'];
  const DEFAULT_THEME = 'midnight';
  const CHOICE_KEY = 'karaokedock.gateway.requestTheme';
  const VENUE_KEY = 'karaokedock.gateway.venueTheme';
  const isTheme = (value) => THEME_IDS.includes(value);
  const read = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* Blocked storage: the theme still applies for this visit. */ }
  };

  const choice = () => (isTheme(read(CHOICE_KEY)) ? read(CHOICE_KEY) : 'venue');
  const venue = () => (isTheme(read(VENUE_KEY)) ? read(VENUE_KEY) : DEFAULT_THEME);
  const resolve = () => (choice() === 'venue' ? venue() : choice());

  function apply() {
    const root = document.documentElement;
    root.dataset.theme = resolve();
    const background = getComputedStyle(root).getPropertyValue('--color-bg-primary').trim();
    if (background) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }

  window.KaraokeTheme = {
    choice,
    venue,
    setChoice(value) {
      write(CHOICE_KEY, value === 'venue' || isTheme(value) ? value : 'venue');
      apply();
    },
    setVenue(value) {
      if (!isTheme(value) || value === venue()) return false;
      write(VENUE_KEY, value);
      apply();
      return true;
    },
  };
  apply();
})();
