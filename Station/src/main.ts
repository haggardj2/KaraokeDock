import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, session, shell, Tray } from 'electron';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

type StationConfig = {
  port?: number;
  bindHost?: string;
  databaseUrl?: string;
  managedDatabase?: boolean;
  postgresPort?: number;
  databaseName?: string;
  databaseUser?: string;
  mediaRoot?: string;
  mediaFolders?: string[];
  allowedOrigins?: string[] | string;
  allowedNetworks?: string[] | string;
  runMigrations?: boolean;
};

type RuntimePaths = {
  dataDir: string;
  configPath: string;
  logPath: string;
  repoRoot: string | null;
  serverDir: string;
  webDistDir: string;
  ffmpegDir: string;
  postgresDir: string;
  ytdlpDir: string;
  toolsDir: string;
  postgresDataDir: string;
  postgresRunDir: string;
  downloadsDir: string;
  playlistsDir: string;
  snapshotsDir: string;
  bootstrapCredentialsPath: string;
};

const IS_WINDOWS = process.platform === 'win32';
const DEFAULT_PORT = 5174;
const DEFAULT_POSTGRES_PORT = 55432;
const DEFAULT_DATABASE_NAME = 'karaokedock';
const DEFAULT_DATABASE_USER = 'karaokedock';
const HEALTH_TIMEOUT_MS = 30_000;
const POSTGRES_TIMEOUT_MS = 30_000;
const STATION_USER_AGENT = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const DEFAULT_STATION_CONFIG: Required<StationConfig> = {
  port: DEFAULT_PORT,
  bindHost: '0.0.0.0',
  managedDatabase: true,
  postgresPort: DEFAULT_POSTGRES_PORT,
  databaseName: DEFAULT_DATABASE_NAME,
  databaseUser: DEFAULT_DATABASE_USER,
  databaseUrl: '',
  mediaRoot: '',
  mediaFolders: [],
  allowedOrigins: [],
  allowedNetworks: [],
  runMigrations: false,
};

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.userAgentFallback = STATION_USER_AGENT;

let tray: Tray | null = null;
let stationStatus: 'starting' | 'running' | 'stopped' = 'starting';
let playerWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverEnv: NodeJS.ProcessEnv | null = null;
let postgresProcess: ChildProcess | null = null;
let runtimePaths: RuntimePaths | null = null;
// Pages open at localhost: YouTube refuses embeds on a page served from 127.0.0.1 (error 150).
let stationUrl = '';
// Station itself checks the server over IPv4 loopback, where it listens.
let stationHealthUrl = '';
let isQuitting = false;
let startupWarning: string | null = null;
let youtubeEmbedHeadersConfigured = false;

// Started by "Start at Login": stay in the tray instead of opening the browser.
const LAUNCHED_HIDDEN_ARG = '--hidden';
const launchedHidden = process.argv.includes(LAUNCHED_HIDDEN_ARG) ||
  (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAtLogin);

function resolveAppIconPath() {
  const candidate = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', 'icon.png')
    : path.resolve(__dirname, '..', '..', 'docs', 'images', 'icon.png');
  return fs.existsSync(candidate) ? candidate : undefined;
}

function resolveRuntimePaths(): RuntimePaths {
  const dataDir = process.env.KARAOKEDOCK_STATION_DATA_DIR || app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });

  const logsDir = path.join(dataDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  if (app.isPackaged) {
    return {
      dataDir,
      configPath: path.join(dataDir, 'station.config.json'),
      logPath: path.join(logsDir, 'station.log'),
      repoRoot: null,
      serverDir: path.join(process.resourcesPath, 'server'),
      webDistDir: path.join(process.resourcesPath, 'web-dist'),
      ffmpegDir: path.join(process.resourcesPath, 'ffmpeg'),
      postgresDir: path.join(process.resourcesPath, 'postgres'),
      ytdlpDir: path.join(process.resourcesPath, 'yt-dlp'),
      toolsDir: path.join(dataDir, 'bin'),
      postgresDataDir: path.join(dataDir, 'postgres-data'),
      postgresRunDir: path.join(dataDir, 'postgres-run'),
      downloadsDir: path.join(dataDir, 'downloads'),
      playlistsDir: path.join(dataDir, 'playlists'),
      snapshotsDir: path.join(dataDir, 'snapshots'),
      bootstrapCredentialsPath: path.join(dataDir, 'bootstrap-admin.json'),
    };
  }

  const repoRoot = path.resolve(__dirname, '..', '..');
  const stationWebDistDir = path.join(repoRoot, 'Station', '.build', 'web-dist');
  const stationFfmpegDir = path.join(repoRoot, 'Station', '.build', 'ffmpeg');
  const stationPostgresDir = path.join(repoRoot, 'Station', '.build', 'postgres');
  return {
    dataDir,
    configPath: path.join(dataDir, 'station.config.json'),
    logPath: path.join(logsDir, 'station.log'),
    repoRoot,
    serverDir: path.join(repoRoot, 'src', 'server'),
    webDistDir: fs.existsSync(stationWebDistDir)
      ? stationWebDistDir
      : path.join(repoRoot, 'src', 'web', 'dist'),
    ffmpegDir: process.env.KARAOKEDOCK_FFMPEG_DIR || stationFfmpegDir,
    postgresDir: process.env.KARAOKEDOCK_POSTGRES_DIR || stationPostgresDir,
    ytdlpDir: path.join(repoRoot, 'Station', '.build', 'yt-dlp'),
    toolsDir: path.join(dataDir, 'bin'),
    postgresDataDir: path.join(dataDir, 'postgres-data'),
    postgresRunDir: path.join(dataDir, 'postgres-run'),
    downloadsDir: path.join(dataDir, 'downloads'),
    playlistsDir: path.join(dataDir, 'playlists'),
    snapshotsDir: path.join(dataDir, 'snapshots'),
    bootstrapCredentialsPath: path.join(dataDir, 'bootstrap-admin.json'),
  };
}

function createDefaultConfig(configPath: string) {
  if (fs.existsSync(configPath)) return;

  fs.writeFileSync(configPath, `${JSON.stringify(DEFAULT_STATION_CONFIG, null, 2)}\n`, 'utf8');
}

function mergeStationConfig(config: StationConfig): StationConfig {
  return { ...DEFAULT_STATION_CONFIG, ...config };
}

function persistStationConfigIfMissingKeys(configPath: string, parsed: StationConfig, merged: StationConfig) {
  const missingDefaultKeys = Object.keys(DEFAULT_STATION_CONFIG).some((key) => !(key in parsed));
  if (missingDefaultKeys) {
    fs.writeFileSync(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  }
}

function backupInvalidConfig(configPath: string) {
  const backupPath = `${configPath}.invalid-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.renameSync(configPath, backupPath);
  return backupPath;
}

function readStationConfig(paths: RuntimePaths): StationConfig {
  createDefaultConfig(paths.configPath);

  try {
    const parsed = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')) as StationConfig;
    const config = parsed && typeof parsed === 'object' ? parsed : {};
    const merged = mergeStationConfig(config);
    persistStationConfigIfMissingKeys(paths.configPath, config, merged);
    return merged;
  } catch (error) {
    const backupPath = backupInvalidConfig(paths.configPath);
    createDefaultConfig(paths.configPath);
    startupWarning =
      `Station could not read station.config.json, so it backed up the invalid file and recreated defaults.\n\n` +
      `Backup: ${backupPath}\n\n` +
      `Original error: ${String(error)}`;
    return mergeStationConfig(JSON.parse(fs.readFileSync(paths.configPath, 'utf8')) as StationConfig);
  }
}

function appendLog(paths: RuntimePaths, line: string) {
  fs.appendFile(paths.logPath, line, (error) => {
    if (error) console.error('Failed to write Station log:', error);
  });
}

function normalizePort(value: unknown): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function cidrToIpv4Origins(cidr: string, port: number): string[] {
  const match = cidr.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return [];

  const octets = match.slice(1, 5).map(Number);
  const prefix = Number(match[5]);
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return [];
  if (!Number.isInteger(prefix) || prefix < 24 || prefix > 32) return [];

  const ipNumber = ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
  const hostBits = 32 - prefix;
  const count = 2 ** hostBits;
  const mask = hostBits === 0 ? 0xffffffff : (0xffffffff << hostBits) >>> 0;
  const network = ipNumber & mask;
  const origins: string[] = [];
  const start = count > 2 ? 1 : 0;
  const end = count > 2 ? count - 1 : count;

  for (let offset = start; offset < end; offset++) {
    const current = (network + offset) >>> 0;
    const ip = [
      (current >>> 24) & 255,
      (current >>> 16) & 255,
      (current >>> 8) & 255,
      current & 255,
    ].join('.');
    origins.push(`http://${ip}:${port}`);
  }

  return origins;
}

function getAllowedOrigins(config: StationConfig, port: number) {
  const explicitOrigins = parseStringList(config.allowedOrigins);
  const networkOrigins = parseStringList(config.allowedNetworks).flatMap((network) => cidrToIpv4Origins(network, port));
  return [...new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`, ...explicitOrigins, ...networkOrigins])];
}

function normalizeBindHost(value: unknown) {
  const host = String(value || '').trim();
  return host || DEFAULT_STATION_CONFIG.bindHost;
}

// The folders KaraokeDock may play media from. mediaRoot is the older single-folder setting.
function getMediaFolders(config: StationConfig): string[] {
  const folders = parseStringList(config.mediaFolders);
  if (folders.length > 0) return folders;
  const legacy = String(config.mediaRoot || '').trim();
  // '/' on Windows (all of C:\) was only ever the old default, not a choice.
  return legacy && !(IS_WINDOWS && legacy === '/') ? [legacy] : [];
}

function saveStationConfig(paths: RuntimePaths, changes: StationConfig) {
  let current: StationConfig = {};
  try {
    current = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')) as StationConfig;
  } catch {}
  fs.writeFileSync(paths.configPath, `${JSON.stringify({ ...current, ...changes }, null, 2)}\n`, 'utf8');
}

async function chooseMediaFolders(current: string[]) {
  const result = await dialog.showOpenDialog({
    title: 'Choose your karaoke media folders',
    buttonLabel: 'Use These Folders',
    defaultPath: current[0] || app.getPath('home'),
    properties: ['openDirectory', 'multiSelections', 'createDirectory'],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths;
}

// First start: ask which folders hold the karaoke files. Cancelling uses the home folder.
async function ensureMediaFolders(paths: RuntimePaths, config: StationConfig): Promise<StationConfig> {
  if (getMediaFolders(config).length > 0) return config;
  await dialog.showMessageBox({
    type: 'info',
    message: 'Choose your karaoke media folders',
    detail:
      'Pick the folder or folders that hold your karaoke files. They can be on different drives. ' +
      'KaraokeDock only plays media from these folders.\n\n' +
      'You can change them later from the tray menu: Media Folders…',
    buttons: ['Choose Folders…'],
  });
  const folders = await chooseMediaFolders([]) ?? [app.getPath('home')];
  saveStationConfig(paths, { mediaFolders: folders });
  return { ...config, mediaFolders: folders };
}

function buildServerEnv(paths: RuntimePaths, config: StationConfig, port: number): NodeJS.ProcessEnv {
  const allowedOrigins = getAllowedOrigins(config, port);
  const mediaFolders = getMediaFolders(config);

  fs.mkdirSync(paths.downloadsDir, { recursive: true });
  fs.mkdirSync(paths.playlistsDir, { recursive: true });
  const ffmpegBinDir = path.join(paths.ffmpegDir, 'bin');
  const ffmpegLibDir = path.join(paths.ffmpegDir, 'lib');

  installBundledYtDlp(paths);
  return withPathPrepended({
    ...process.env,
    PORT: String(port),
    WEB_DIST_DIR: paths.webDistDir,
    WEB_APP_URL: `http://localhost:${port}`,
    WEB_RUNTIME_API_BASE: '',
    STATION_MODE: 'true',
    BIND_HOST: normalizeBindHost(config.bindHost),
    MEDIA_ROOT: (mediaFolders.length > 0 ? mediaFolders : [app.getPath('home')]).join(path.delimiter),
    YTDLP_DOWNLOAD_LOCATION: paths.downloadsDir,
    BREAK_MUSIC_PLAYLISTS_FOLDER: paths.playlistsDir,
    SNAPSHOTS_DIR: paths.snapshotsDir,
    ORIGIN: allowedOrigins.join(','),
    TRUST_PROXY: process.env.TRUST_PROXY || 'false',
    BOOTSTRAP_CREDENTIALS_FILE: paths.bootstrapCredentialsPath,
    STATION_CONTROL_URL: stationControl?.url ?? '',
    STATION_CONTROL_TOKEN: stationControl?.token ?? '',
    LD_LIBRARY_PATH: [ffmpegLibDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter),
  }, [paths.toolsDir, ffmpegBinDir]);
}

function executableName(binary: string) {
  return IS_WINDOWS ? `${binary}.exe` : binary;
}

// Windows keeps PATH as "Path"; replace whichever spelling is present so the child sees one PATH.
function withPathPrepended(env: NodeJS.ProcessEnv, dirs: string[]): NodeJS.ProcessEnv {
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH') || 'PATH';
  const next = { ...env };
  const current = next[pathKey] || '';
  for (const key of Object.keys(next)) {
    if (key.toUpperCase() === 'PATH') delete next[key];
  }
  next.PATH = [...dirs, current].filter(Boolean).join(path.delimiter);
  return next;
}

// The bundled yt-dlp is copied to a writable folder so "Update yt-dlp" (yt-dlp -U) can replace it.
function installBundledYtDlp(paths: RuntimePaths) {
  const binary = executableName('yt-dlp');
  const bundled = path.join(paths.ytdlpDir, binary);
  const installed = path.join(paths.toolsDir, binary);
  if (!fs.existsSync(bundled) || fs.existsSync(installed)) return;
  fs.mkdirSync(paths.toolsDir, { recursive: true });
  fs.copyFileSync(bundled, installed);
  if (!IS_WINDOWS) fs.chmodSync(installed, 0o755);
}

function getFfmpegBinary(paths: RuntimePaths, binary: string) {
  return path.join(paths.ffmpegDir, 'bin', executableName(binary));
}

function validateFfmpegRuntime(paths: RuntimePaths, env: NodeJS.ProcessEnv) {
  const ffmpeg = getFfmpegBinary(paths, 'ffmpeg');
  const ffprobe = getFfmpegBinary(paths, 'ffprobe');
  const missing = [ffmpeg, ffprobe].filter((binary) => !fs.existsSync(binary));
  if (missing.length > 0) {
    if (!app.isPackaged) return;
    throw new Error(
      `Station FFmpeg runtime is missing (${missing.map((binary) => path.basename(binary)).join(', ')}). ` +
      'Run "npm run stage:ffmpeg" before development builds or rebuild the AppImage.',
    );
  }

  const filters = spawnSync(ffmpeg, ['-hide_banner', '-filters'], {
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (filters.status !== 0 || !/(^|\s)rubberband(\s|$)/m.test(`${filters.stdout}\n${filters.stderr}`)) {
    throw new Error('Station FFmpeg runtime does not include the rubberband filter required for pitch control.');
  }

  const probe = spawnSync(ffprobe, ['-hide_banner', '-version'], { env, encoding: 'utf8' });
  if (probe.status !== 0) {
    throw new Error('Station ffprobe runtime failed to start.');
  }
}

function getPostgresBinary(paths: RuntimePaths, binary: string) {
  return path.join(paths.postgresDir, 'bin', executableName(binary));
}

// The Linux bundle uses Fedora's share/pgsql and lib/pgsql; the Windows (EDB) bundle uses share and lib.
function getPostgresShareDir(paths: RuntimePaths) {
  const fedoraLayout = path.join(paths.postgresDir, 'share', 'pgsql');
  return fs.existsSync(fedoraLayout) ? fedoraLayout : path.join(paths.postgresDir, 'share');
}

function getPostgresLibDir(paths: RuntimePaths) {
  const fedoraLayout = path.join(paths.postgresDir, 'lib', 'pgsql');
  return fs.existsSync(fedoraLayout) ? fedoraLayout : path.join(paths.postgresDir, 'lib');
}

function getPostgresEnv(paths: RuntimePaths, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const libPaths = [
    path.join(paths.postgresDir, 'lib'),
    path.join(paths.postgresDir, 'lib', 'pgsql'),
    path.join(paths.postgresDir, 'lib64'),
    path.join(paths.postgresDir, 'lib64', 'pgsql'),
    env.LD_LIBRARY_PATH,
  ].filter(Boolean);

  return withPathPrepended({
    ...env,
    LD_LIBRARY_PATH: libPaths.join(path.delimiter),
  }, [path.join(paths.postgresDir, 'bin')]);
}

function validatePostgresRuntime(paths: RuntimePaths) {
  const required = ['postgres', 'initdb', 'createdb', 'psql', 'pg_isready'];
  const missing = required.filter((binary) => !fs.existsSync(getPostgresBinary(paths, binary)));
  if (missing.length > 0) {
    throw new Error(
      `Station PostgreSQL runtime is missing (${missing.join(', ')}). ` +
      'Run "npm run stage:postgres" before development builds or rebuild the AppImage.',
    );
  }
}

function normalizePostgresPort(value: unknown): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_POSTGRES_PORT;
}

function normalizeDatabaseIdentifier(value: unknown, fallback: string) {
  const text = String(value || '').trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text) ? text : fallback;
}

function getManagedDatabaseSettings(config: StationConfig) {
  return {
    port: normalizePostgresPort(process.env.KARAOKEDOCK_POSTGRES_PORT || config.postgresPort),
    databaseName: normalizeDatabaseIdentifier(config.databaseName, DEFAULT_DATABASE_NAME),
    databaseUser: normalizeDatabaseIdentifier(config.databaseUser, DEFAULT_DATABASE_USER),
  };
}

function getManagedDatabaseUrl(settings: ReturnType<typeof getManagedDatabaseSettings>) {
  const url = new URL(`postgres://127.0.0.1:${settings.port}/${settings.databaseName}`);
  url.username = settings.databaseUser;
  return url.toString();
}

function runCommand(
  paths: RuntimePaths,
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; label: string },
) {
  appendLog(paths, `[${new Date().toISOString()}] ${options.label}: ${command} ${args.join(' ')}\n`);

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      appendLog(paths, text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      appendLog(paths, text);
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const error = new Error(
        `${options.label} exited with code ${code ?? 'null'}${signal ? ` and signal ${signal}` : ''}\n${stderr}`,
      );
      reject(Object.assign(error, { stdout, stderr, code, signal }));
    });
  });
}

async function initializeManagedPostgres(paths: RuntimePaths, env: NodeJS.ProcessEnv, databaseUser: string) {
  if (fs.existsSync(path.join(paths.postgresDataDir, 'PG_VERSION'))) return;

  fs.mkdirSync(paths.postgresDataDir, { recursive: true });
  fs.chmodSync(paths.postgresDataDir, 0o700);

  await runCommand(
    paths,
    getPostgresBinary(paths, 'initdb'),
    [
      '-D', paths.postgresDataDir,
      '-U', databaseUser,
      '-A', 'trust',
      '--encoding=UTF8',
      '--locale=C',
      '-L', getPostgresShareDir(paths),
      '-c', `dynamic_library_path=${getPostgresLibDir(paths)}`,
    ],
    { cwd: paths.dataDir, env, label: 'postgres-initdb' },
  );
}

function startManagedPostgres(paths: RuntimePaths, env: NodeJS.ProcessEnv, port: number) {
  fs.mkdirSync(paths.postgresRunDir, { recursive: true });

  postgresProcess = spawnProcess(
    paths,
    getPostgresBinary(paths, 'postgres'),
    [
      '-D', paths.postgresDataDir,
      '-h', '127.0.0.1',
      '-p', String(port),
      // Everything connects over TCP; Windows gets no Unix socket at all.
      ...(IS_WINDOWS ? ['-c', 'unix_socket_directories='] : ['-k', paths.postgresRunDir]),
      '-c', 'listen_addresses=127.0.0.1',
      '-c', `dynamic_library_path=${getPostgresLibDir(paths)}`,
    ],
    { cwd: paths.dataDir, env, label: 'postgres' },
  );

  postgresProcess.once('exit', (code, signal) => {
    if (!isQuitting) {
      dialog.showErrorBox(
        'KaraokeDock Station database stopped',
        `The managed PostgreSQL server exited with code ${code ?? 'null'}${signal ? ` and signal ${signal}` : ''}.`,
      );
    }
  });
}

async function waitForManagedPostgres(
  paths: RuntimePaths,
  env: NodeJS.ProcessEnv,
  settings: ReturnType<typeof getManagedDatabaseSettings>,
) {
  const deadline = Date.now() + POSTGRES_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await runCommand(
        paths,
        getPostgresBinary(paths, 'pg_isready'),
        ['-h', '127.0.0.1', '-p', String(settings.port), '-U', settings.databaseUser, '-d', 'postgres'],
        { cwd: paths.dataDir, env, label: 'postgres-ready' },
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Managed PostgreSQL did not become ready within ${POSTGRES_TIMEOUT_MS / 1000}s`);
}

async function ensureManagedDatabase(
  paths: RuntimePaths,
  env: NodeJS.ProcessEnv,
  settings: ReturnType<typeof getManagedDatabaseSettings>,
) {
  try {
    await runCommand(
      paths,
      getPostgresBinary(paths, 'createdb'),
      ['-h', '127.0.0.1', '-p', String(settings.port), '-U', settings.databaseUser, settings.databaseName],
      { cwd: paths.dataDir, env, label: 'postgres-createdb' },
    );
  } catch (error) {
    const stderr = String((error as { stderr?: unknown }).stderr || '');
    if (!stderr.includes('already exists')) throw error;
  }
}

function sqlTextLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

async function applyStationDatabaseDefaults(paths: RuntimePaths, env: NodeJS.ProcessEnv) {
  const downloadsDir = sqlTextLiteral(paths.downloadsDir);
  const playlistsDir = sqlTextLiteral(paths.playlistsDir);

  await runCommand(
    paths,
    getPostgresBinary(paths, 'psql'),
    [
      process.env.DATABASE_URL || env.DATABASE_URL || '',
      '-v', 'ON_ERROR_STOP=1',
      '-c',
      `
      INSERT INTO settings (key, value)
      VALUES
        ('ytdlp.download_location', to_jsonb(${downloadsDir}::text)),
        ('break_music.playlists_folder', to_jsonb(${playlistsDir}::text))
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value
      WHERE settings.value IN ('"/media/downloads"'::jsonb, '"/media/playlists"'::jsonb, '""'::jsonb, 'null'::jsonb);
      `,
    ],
    { cwd: paths.dataDir, env, label: 'station-db-defaults' },
  );
}

async function prepareDatabase(paths: RuntimePaths, config: StationConfig, env: NodeJS.ProcessEnv) {
  const externalDatabaseUrl = config.databaseUrl?.trim() || process.env.DATABASE_URL?.trim();
  if (externalDatabaseUrl) {
    return {
      env: { ...env, DATABASE_URL: externalDatabaseUrl },
      shouldRunMigrations: config.runMigrations === true,
    };
  }

  if (config.managedDatabase === false) {
    throw new Error('Station config has managedDatabase=false but no databaseUrl was provided.');
  }

  validatePostgresRuntime(paths);
  const settings = getManagedDatabaseSettings(config);
  const postgresEnv = getPostgresEnv(paths, env);

  await initializeManagedPostgres(paths, postgresEnv, settings.databaseUser);
  startManagedPostgres(paths, postgresEnv, settings.port);
  await waitForManagedPostgres(paths, postgresEnv, settings);
  await ensureManagedDatabase(paths, postgresEnv, settings);

  return {
    env: {
      ...postgresEnv,
      DATABASE_URL: getManagedDatabaseUrl(settings),
      PGHOST: '127.0.0.1',
      PGPORT: String(settings.port),
      PGUSER: settings.databaseUser,
      PGDATABASE: settings.databaseName,
    },
    shouldRunMigrations: true,
  };
}

function getPackagedTsxPath(serverDir: string) {
  return path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

function spawnProcess(
  paths: RuntimePaths,
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; label: string },
) {
  appendLog(paths, `[${new Date().toISOString()}] ${options.label}: ${command} ${args.join(' ')}\n`);
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Windows only runs .cmd files (npm.cmd in development) through a shell.
    shell: IS_WINDOWS && command.endsWith('.cmd'),
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    appendLog(paths, text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    appendLog(paths, text);
  });

  return child;
}

function waitForExit(child: ChildProcess, label: string) {
  return new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} exited with code ${code ?? 'null'}${signal ? ` and signal ${signal}` : ''}`));
    });
  });
}

// Runs the psql steps listed in the server's scripts/migrate.sh (the single list of migrations)
// directly, so no shell is needed. A step ending in "|| true" may fail.
function readMigrationSteps(serverDir: string) {
  const script = fs.readFileSync(path.join(serverDir, 'scripts', 'migrate.sh'), 'utf8');
  return script.split(/\r?\n/)
    .map((line) => /^\s*psql\b.*\s-f\s+(\S+\.sql)(\s*\|\|\s*true)?\s*$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ file: match[1], optional: Boolean(match[2]) }));
}

async function runMigrations(paths: RuntimePaths, env: NodeJS.ProcessEnv) {
  const steps = readMigrationSteps(paths.serverDir);
  if (steps.length === 0) throw new Error('No migrations found in scripts/migrate.sh');

  for (const step of steps) {
    try {
      await runCommand(
        paths,
        getPostgresBinary(paths, 'psql'),
        ['-v', 'ON_ERROR_STOP=1', env.DATABASE_URL || '', '-f', step.file],
        { cwd: paths.serverDir, env, label: `migrate ${step.file}` },
      );
    } catch (error) {
      if (!step.optional) throw error;
    }
  }
}

function startServerProcess(paths: RuntimePaths, env: NodeJS.ProcessEnv) {
  if (app.isPackaged) {
    const tsxPath = getPackagedTsxPath(paths.serverDir);
    return spawnProcess(paths, process.execPath, [tsxPath, path.join(paths.serverDir, 'src', 'index.ts')], {
      cwd: paths.serverDir,
      env: {
        ...env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      label: 'server',
    });
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawnProcess(paths, npmCommand, ['run', 'start'], {
    cwd: paths.serverDir,
    env,
    label: 'server',
  });
}

function waitForHealth(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`${url}/health`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        retry();
      });
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
      req.on('error', retry);
    };

    const retry = () => {
      if (Date.now() >= deadline) {
        reject(new Error(`KaraokeDock server did not become healthy within ${timeoutMs / 1000}s`));
        return;
      }
      setTimeout(attempt, 500);
    };

    attempt();
  });
}

// ---- Station control ----
// A loopback-only endpoint the server calls for things only the desktop app can do, like the
// native folder picker behind Admin's Browse buttons. Each launch gets a new random token.

let stationControl: { url: string; token: string } | null = null;
let folderPickerOpen = false;

async function pickFolderOnTop(options: { title?: unknown; defaultPath?: unknown }) {
  // An invisible always-on-top owner window keeps the dialog in front of the browser.
  const owner = new BrowserWindow({
    width: 1, height: 1, show: false, frame: false, transparent: true,
    skipTaskbar: true, alwaysOnTop: true, resizable: false,
  });
  try {
    owner.setAlwaysOnTop(true, 'screen-saver');
    owner.center();
    owner.show();
    owner.focus();
    const defaultPath = typeof options.defaultPath === 'string' && fs.existsSync(options.defaultPath)
      ? options.defaultPath : undefined;
    const result = await dialog.showOpenDialog(owner, {
      title: typeof options.title === 'string' && options.title.trim() ? options.title.slice(0, 200) : 'Choose a folder',
      defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  } finally {
    owner.destroy();
  }
}

function startStationControl() {
  const token = crypto.randomBytes(32).toString('hex');
  const server = http.createServer((req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST' || req.url !== '/pick-folder' || req.headers.authorization !== `Bearer ${token}`) {
      send(404, { error: 'Not found' });
      return;
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy();
    });
    req.on('end', async () => {
      if (folderPickerOpen) {
        send(409, { error: 'A folder picker is already open on the Station' });
        return;
      }
      folderPickerOpen = true;
      try {
        send(200, { path: await pickFolderOnTop(body ? JSON.parse(body) : {}) });
      } catch (error) {
        send(500, { error: String(error) });
      } finally {
        folderPickerOpen = false;
      }
    });
  });
  return new Promise<{ url: string; token: string }>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Station control did not start'));
        return;
      }
      server.unref();
      resolve({ url: `http://127.0.0.1:${address.port}`, token });
    });
  });
}

async function startKaraokeDockServer(paths: RuntimePaths, config: StationConfig) {
  stationControl = await startStationControl();
  const port = normalizePort(process.env.PORT || config.port);
  stationUrl = `http://localhost:${port}`;
  stationHealthUrl = `http://127.0.0.1:${port}`;
  const baseEnv = buildServerEnv(paths, config, port);
  validateFfmpegRuntime(paths, baseEnv);
  const database = await prepareDatabase(paths, config, baseEnv);
  const env = database.env;

  if (database.shouldRunMigrations) {
    await runMigrations(paths, env);
  }

  await applyStationDatabaseDefaults(paths, env);

  serverEnv = env;
  await launchServer(paths, env);
}

function launchServer(paths: RuntimePaths, env: NodeJS.ProcessEnv) {
  const child = startServerProcess(paths, env);
  serverProcess = child;
  child.once('exit', (code, signal) => {
    // A server replaced by a restart (serverProcess moved on) is expected to exit.
    if (isQuitting || serverProcess !== child) return;
    setStationStatus('stopped');
    dialog.showErrorBox(
      'KaraokeDock Station server stopped',
      `The local KaraokeDock server exited with code ${code ?? 'null'}${signal ? ` and signal ${signal}` : ''}.`,
    );
  });
  return waitForHealth(stationHealthUrl, HEALTH_TIMEOUT_MS);
}

// Tray › Media Folders…: choose new folders and restart the server (Postgres keeps running).
async function changeMediaFolders() {
  if (!runtimePaths || !serverEnv || stationStatus !== 'running') return;
  const current = getMediaFolders(readStationConfig(runtimePaths));
  const response = await showStationMessageBox({
    type: 'info',
    message: 'Media folders',
    detail: `KaraokeDock plays media from:\n\n${current.join('\n') || '(none chosen)'}`,
    buttons: ['Choose Folders…', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });
  if (response.response !== 0) return;
  const folders = await chooseMediaFolders(current);
  if (!folders) return;

  saveStationConfig(runtimePaths, { mediaFolders: folders });
  setStationStatus('starting');
  const previous = serverProcess;
  serverProcess = null;
  if (previous && previous.exitCode === null) {
    previous.kill();
    await waitForProcessExit(previous, 5_000);
  }
  serverEnv = { ...serverEnv, MEDIA_ROOT: folders.join(path.delimiter) };
  try {
    await launchServer(runtimePaths, serverEnv);
    setStationStatus('running');
  } catch (error) {
    setStationStatus('stopped');
    dialog.showErrorBox('KaraokeDock Station server did not restart', String(error));
  }
}

function configureYouTubeEmbedHeaders() {
  if (youtubeEmbedHeadersConfigured || !stationUrl) return;
  youtubeEmbedHeadersConfigured = true;

  const stationOrigin = new URL(stationUrl).origin;
  const playerReferrer = `${stationOrigin}/player`;

  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: [
        '*://*.youtube.com/*',
        '*://youtube.com/*',
        '*://*.youtube-nocookie.com/*',
        '*://youtube-nocookie.com/*',
      ],
    },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          Referer:
            details.requestHeaders.Referer ||
            details.requestHeaders.referer ||
            playerReferrer,
          Origin:
            details.requestHeaders.Origin ||
            details.requestHeaders.origin ||
            stationOrigin,
        },
      });
    },
  );
}

type BootstrapCredentialsFile = {
  username?: string;
  password?: string;
  generatedAt?: string;
  message?: string;
};

function readBootstrapCredentials(paths: RuntimePaths): BootstrapCredentialsFile | null {
  if (!fs.existsSync(paths.bootstrapCredentialsPath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(paths.bootstrapCredentialsPath, 'utf8')) as BootstrapCredentialsFile;
    if (!parsed.username || !parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function showStationMessageBox(options: Electron.MessageBoxOptions) {
  return playerWindow ? dialog.showMessageBox(playerWindow, options) : dialog.showMessageBox(options);
}

async function showBootstrapCredentials(options: { automatic?: boolean } = {}) {
  if (!runtimePaths) return;
  const credentials = readBootstrapCredentials(runtimePaths);

  if (!credentials) {
    if (!options.automatic) {
      await showStationMessageBox({
        type: 'info',
        message: 'No generated admin credentials were found.',
        detail: 'If you already changed the admin password, use that password to sign in.',
      });
    }
    return;
  }

  const response = await showStationMessageBox({
    type: 'warning',
    buttons: ['Copy Password', 'Open Admin', 'OK'],
    defaultId: 0,
    cancelId: 2,
    message: 'Generated KaraokeDock admin credentials',
    detail: [
      `Username: ${credentials.username}`,
      `Password: ${credentials.password}`,
      credentials.generatedAt ? `Generated: ${credentials.generatedAt}` : null,
      '',
      credentials.message || 'Change this password immediately after first login.',
      `Credentials file: ${runtimePaths.bootstrapCredentialsPath}`,
    ].filter(Boolean).join('\n'),
  });

  if (response.response === 0 && credentials.password) {
    clipboard.writeText(credentials.password);
  } else if (response.response === 1) {
    await showAppPath('/admin');
  }
}

// The Player stays a Station window: it may autoplay with sound and gets the YouTube embed
// headers, which a regular browser tab does not.
async function openPlayerWindow() {
  if (playerWindow) {
    playerWindow.show();
    playerWindow.focus();
    return;
  }

  playerWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'KaraokeDock Player',
    backgroundColor: '#000000',
    icon: resolveAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  playerWindow.webContents.setUserAgent(STATION_USER_AGENT);
  playerWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  app.dock?.show();

  playerWindow.on('closed', () => {
    playerWindow = null;
    app.dock?.hide();
  });

  await playerWindow.loadURL(`${stationUrl}/player`);
}

// Host, Admin and Requests open in the default browser; on the Station machine the
// browser is signed in as admin automatically (localhost sign-in).
async function showAppPath(appPath: string) {
  if (!stationUrl || stationStatus !== 'running') return;
  const normalizedPath = appPath.startsWith('/') ? appPath : `/${appPath}`;
  try {
    await shell.openExternal(`${stationUrl}${normalizedPath}`);
  } catch (error) {
    dialog.showErrorBox('Unable to open the browser', `Open ${stationUrl}${normalizedPath} in your browser.\n\n${String(error)}`);
  }
}

// ---- Start at login ----
// Windows and macOS use the system login items; Linux uses an XDG autostart entry.

function linuxAutostartPath() {
  return path.join(app.getPath('appData'), 'autostart', 'karaokedock-station.desktop');
}

function quoteDesktopExecArg(value: string) {
  return `"${value.replace(/(["`$\\])/g, '\\$1')}"`;
}

function isStartAtLoginEnabled() {
  if (process.platform === 'linux') return fs.existsSync(linuxAutostartPath());
  return app.getLoginItemSettings({ args: [LAUNCHED_HIDDEN_ARG] }).openAtLogin;
}

function setStartAtLogin(enabled: boolean) {
  if (process.platform !== 'linux') {
    app.setLoginItemSettings({ openAtLogin: enabled, args: [LAUNCHED_HIDDEN_ARG] });
    return;
  }

  const autostartPath = linuxAutostartPath();
  if (!enabled) {
    fs.rmSync(autostartPath, { force: true });
    return;
  }
  // An AppImage runs from a temporary mount; APPIMAGE is the path of the file itself.
  const command = process.env.APPIMAGE
    ? [process.env.APPIMAGE]
    : app.isPackaged ? [process.execPath] : [process.execPath, app.getAppPath()];
  fs.mkdirSync(path.dirname(autostartPath), { recursive: true });
  fs.writeFileSync(autostartPath, [
    '[Desktop Entry]',
    'Type=Application',
    'Name=KaraokeDock Station',
    'Comment=Start KaraokeDock Station in the system tray',
    `Exec=${[...command, LAUNCHED_HIDDEN_ARG].map(quoteDesktopExecArg).join(' ')}`,
    ...(resolveAppIconPath() ? [`Icon=${resolveAppIconPath()}`] : []),
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n'));
}

// ---- Tray and menus ----

function stationMenuItems(): Electron.MenuItemConstructorOptions[] {
  const running = stationStatus === 'running';
  const statusLabel = {
    starting: 'Starting KaraokeDock…',
    running: `Running at ${stationUrl}`,
    stopped: 'KaraokeDock server stopped',
  }[stationStatus];

  return [
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    { label: 'Open Host', enabled: running, click: () => void showAppPath('/host') },
    { label: 'Open Admin', enabled: running, click: () => void showAppPath('/admin') },
    { label: 'Open Requests', enabled: running, click: () => void showAppPath('/requests') },
    { label: 'Open Player Window', enabled: running, accelerator: 'CommandOrControl+P', click: () => void openPlayerWindow() },
    { type: 'separator' },
    { label: 'Media Folders…', enabled: running, click: () => void changeMediaFolders() },
    {
      label: 'Start at Login',
      type: 'checkbox',
      checked: isStartAtLoginEnabled(),
      click: (item) => {
        try {
          setStartAtLogin(item.checked);
        } catch (error) {
          dialog.showErrorBox('Unable to change Start at Login', String(error));
        }
        refreshMenus();
      },
    },
    {
      label: 'Open Station Config',
      click: () => {
        if (runtimePaths) void shell.openPath(runtimePaths.configPath);
      },
    },
    { label: 'Show Initial Admin Credentials', click: () => void showBootstrapCredentials() },
    { type: 'separator' },
    { label: 'Quit KaraokeDock Station', role: 'quit' },
  ];
}

// The application menu only shows on the Player window (and the macOS menu bar).
function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'KaraokeDock', submenu: stationMenuItems() },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Player Full Screen',
          accelerator: 'F11',
          click: () => {
            if (playerWindow) playerWindow.setFullScreen(!playerWindow.isFullScreen());
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  const iconPath = resolveAppIconPath();
  let image = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  if (!image.isEmpty()) {
    const size = process.platform === 'win32' ? 16 : process.platform === 'darwin' ? 18 : 22;
    image = image.resize({ width: size, height: size, quality: 'best' });
  }
  tray = new Tray(image);
  tray.setToolTip('KaraokeDock Station');
  // Windows shows the menu on right-click only; open it on left-click as well.
  if (process.platform === 'win32') tray.on('click', () => tray?.popUpContextMenu());
}

function refreshMenus() {
  createApplicationMenu();
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate(stationMenuItems()));
  tray.setToolTip(stationStatus === 'running' ? `KaraokeDock Station\n${stationUrl}` : 'KaraokeDock Station');
}

function setStationStatus(status: typeof stationStatus) {
  stationStatus = status;
  refreshMenus();
}

function registerIpcHandlers() {
  ipcMain.handle('station:open-player', async () => {
    await openPlayerWindow();
    return { ok: true };
  });

  ipcMain.handle('station:toggle-player-fullscreen', () => {
    if (!playerWindow) return { ok: false, error: 'Player window is not open' };
    playerWindow.setFullScreen(!playerWindow.isFullScreen());
    return { ok: true, fullScreen: playerWindow.isFullScreen() };
  });

  ipcMain.handle('station:show-window', async (_event, appPath: string) => {
    await showAppPath(String(appPath || '/host'));
    return { ok: true };
  });

  ipcMain.handle('station:get-info', () => ({
    stationUrl,
    dataDir: runtimePaths?.dataDir ?? null,
    configPath: runtimePaths?.configPath ?? null,
    packaged: app.isPackaged,
  }));
}

async function bootstrap() {
  runtimePaths = resolveRuntimePaths();
  app.dock?.hide();
  createTray();
  refreshMenus();

  try {
    require(path.join(runtimePaths.serverDir, 'scripts', 'check-runtime.cjs'));
    const config = await ensureMediaFolders(runtimePaths, readStationConfig(runtimePaths));
    registerIpcHandlers();
    await startKaraokeDockServer(runtimePaths, config);
  } catch (error) {
    console.error(error);
    dialog.showErrorBox('Unable to start KaraokeDock Station', String(error));
    isQuitting = true;
    await stopServices();
    app.exit(1);
    return;
  }

  configureYouTubeEmbedHeaders();
  setStationStatus('running');
  if (!launchedHidden) void showAppPath('/host');
  if (startupWarning) {
    setTimeout(() => {
      void showStationMessageBox({
        type: 'warning',
        message: 'Station config was reset',
        detail: startupWarning || undefined,
      });
    }, 500);
  }
}

function waitForProcessExit(child: ChildProcess | null, timeoutMs: number) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopServices() {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await waitForProcessExit(serverProcess, 5_000);
  }

  if (!postgresProcess || postgresProcess.exitCode !== null || !runtimePaths) return;
  // A fast shutdown, so the next start needs no crash recovery. On Windows kill() would be a hard kill.
  try {
    await runCommand(
      runtimePaths,
      getPostgresBinary(runtimePaths, 'pg_ctl'),
      ['stop', '-D', runtimePaths.postgresDataDir, '-m', 'fast', '-w', '-t', '20'],
      { cwd: runtimePaths.dataDir, env: getPostgresEnv(runtimePaths, process.env), label: 'postgres-stop' },
    );
  } catch {
    postgresProcess.kill();
  }
  if (!await waitForProcessExit(postgresProcess, 10_000)) postgresProcess.kill('SIGKILL');
}

// A separate data folder is a separate Station, with its own single-instance lock.
if (process.env.KARAOKEDOCK_STATION_DATA_DIR) app.setPath('userData', process.env.KARAOKEDOCK_STATION_DATA_DIR);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Launching Station again while it runs opens the Host page.
  app.on('second-instance', () => {
    void showAppPath('/host');
  });

  // Quitting waits for the server and Postgres to stop, then quits for real.
  let servicesStopped = false;
  app.on('before-quit', (event) => {
    if (servicesStopped) return;
    event.preventDefault();
    if (isQuitting) return;
    isQuitting = true;
    void stopServices().finally(() => {
      servicesStopped = true;
      app.quit();
    });
  });

  app.whenReady().then(() => {
    void bootstrap();
  });

  // macOS: clicking the app again (Dock, Finder) opens the Host page.
  app.on('activate', () => {
    void showAppPath('/host');
  });

  // Station lives in the tray: closing the Player window does not quit it. Quit is in the tray menu.
  app.on('window-all-closed', () => {});

  // Logging out or shutting down signals the process; quit properly so Postgres and the server stop too.
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) {
    process.on(signal, () => app.quit());
  }
}
