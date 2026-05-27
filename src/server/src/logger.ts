/**
 * Simple levelled logger whose threshold is controlled by the
 * admin.log_level setting (persisted in the settings table).
 *
 * Levels (from most to least verbose):
 *   verbose > info > warning > error
 *
 * At startup the level defaults to 'info'.  The Admin page can change it
 * by updating the setting via PUT /api/admin/settings/admin.log_level,
 * which will call setLogLevel() so the new value takes effect immediately
 * without a server restart.
 */

export type LogLevel = 'error' | 'warning' | 'info' | 'verbose';

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warning: 1,
  info: 2,
  verbose: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel) {
  if (level in LEVEL_ORDER) {
    currentLevel = level;
  } else {
    console.warn(`[logger] Unknown log level "${level}", keeping current level "${currentLevel}"`);
  }
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
}

export const logger = {
  error: (...args: any[]) => {
    if (shouldLog('error')) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (shouldLog('warning')) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) console.log(...args);
  },
  verbose: (...args: any[]) => {
    if (shouldLog('verbose')) console.log(...args);
  },
};
