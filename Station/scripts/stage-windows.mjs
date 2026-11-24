// Stages the Windows runtimes for Station into Station/.build:
//   postgres/  PostgreSQL server binaries (EnterpriseDB build, without pgAdmin, docs or headers)
//   ffmpeg/    FFmpeg with librubberband (Gyan "full" shared build, without ffplay)
//   yt-dlp/    standalone yt-dlp.exe
// Downloads are pinned by version and SHA-256 and cached in .build/downloads.
// Run on Windows: it extracts with the tar.exe that ships with Windows 10 and later.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const BUILD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.build');
const DOWNLOADS_DIR = path.join(BUILD_DIR, 'downloads');

const POSTGRES = {
  url: 'https://get.enterprisedb.com/postgresql/postgresql-18.6-1-windows-x64-binaries.zip',
  sha256: 'fbe23da234ee31547bf8a36d29dfd81e82b849df2d2b78d2eecb43d360252f8c',
};
const FFMPEG = {
  url: 'https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-full_build-shared.zip',
  sha256: '8d31e162f1616e37aab3fa2db991b97e1b8dbeb1c8465fd81a81be16ff91b328',
  root: 'ffmpeg-9.0.2-full_build-shared',
};
const YTDLP = {
  url: 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp.exe',
  sha256: 'f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d',
};

async function sha256(file) {
  const hash = createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

async function download({ url, sha256: expected }) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const file = path.join(DOWNLOADS_DIR, path.basename(new URL(url).pathname));
  if (fs.existsSync(file) && await sha256(file) === expected) return file;

  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${url}`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(`${file}.part`));
  const actual = await sha256(`${file}.part`);
  if (actual !== expected) {
    fs.rmSync(`${file}.part`, { force: true });
    throw new Error(`Checksum mismatch for ${url}: expected ${expected}, got ${actual}`);
  }
  fs.renameSync(`${file}.part`, file);
  return file;
}

function extract(archive, destination, members) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  execFileSync('tar', ['-xf', archive, '-C', destination, ...members], { stdio: 'inherit' });
}

function replaceDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);
}

async function stagePostgres() {
  const archive = await download(POSTGRES);
  const temp = path.join(BUILD_DIR, 'postgres-extract');
  console.log('Staging PostgreSQL');
  extract(archive, temp, ['pgsql/bin', 'pgsql/lib', 'pgsql/share', 'pgsql/server_license.txt', 'pgsql/commandlinetools_3rd_party_licenses.txt']);
  replaceDir(path.join(temp, 'pgsql'), path.join(BUILD_DIR, 'postgres'));
  fs.rmSync(temp, { recursive: true, force: true });
}

async function stageFfmpeg() {
  const archive = await download(FFMPEG);
  const temp = path.join(BUILD_DIR, 'ffmpeg-extract');
  console.log('Staging FFmpeg');
  extract(archive, temp, [`${FFMPEG.root}/bin`, `${FFMPEG.root}/LICENSE`]);
  fs.rmSync(path.join(temp, FFMPEG.root, 'bin', 'ffplay.exe'), { force: true });
  replaceDir(path.join(temp, FFMPEG.root), path.join(BUILD_DIR, 'ffmpeg'));
  fs.rmSync(temp, { recursive: true, force: true });
}

async function stageYtDlp() {
  const file = await download(YTDLP);
  const target = path.join(BUILD_DIR, 'yt-dlp');
  console.log('Staging yt-dlp');
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(file, path.join(target, 'yt-dlp.exe'));
}

if (process.platform !== 'win32') {
  console.error('stage-windows.mjs stages Windows runtimes; run it on Windows.');
  process.exit(1);
}

await stagePostgres();
await stageFfmpeg();
await stageYtDlp();
console.log(`Windows runtimes staged in ${BUILD_DIR}`);
