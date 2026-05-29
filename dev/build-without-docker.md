# Building KaraokeDock Without Docker

This repo can run directly on a Linux host. The main pieces are:

1. `src/server` - Node/Express API on port `5174`
2. `src/web` - React/Vite frontend on port `5173`
3. PostgreSQL - required by the API
4. FFmpeg with the `rubberband` filter - required for pitch shifting

## Host dependencies

Match the Dockerfiles as closely as possible:

- Node.js `26.x`
- npm
- PostgreSQL server
- PostgreSQL client tools (`psql` is required by `src/server/scripts/migrate.sh`)
- `ffmpeg`
- Rubber Band library/tools
- `python3` and `pip3` for `yt-dlp`
- `zip` and `unzip`
- DejaVu fonts (`font-dejavu` / `fonts-dejavu-core`) for FFmpeg text rendering

### Debian / Ubuntu example

```bash
sudo apt update
sudo apt install -y \
  nodejs npm \
  postgresql postgresql-client \
  ffmpeg rubberband-cli librubberband2 librubberband-dev \
  python3 python3-pip \
  zip unzip \
  fonts-dejavu-core
```

### Fedora example

```bash
sudo dnf install -y \
  nodejs npm \
  postgresql-server postgresql \
  ffmpeg rubberband rubberband-libs rubberband-devel \
  python3 python3-pip \
  zip unzip \
  dejavu-sans-fonts
```

### Arch example

```bash
sudo pacman -S --needed \
  nodejs npm \
  postgresql \
  ffmpeg rubberband \
  python python-pip \
  zip unzip \
  ttf-dejavu
```

## FFmpeg and Rubber Band

Pitch control in KaraokeDock uses this server-side FFmpeg filter:

```text
rubberband=pitch=<ratio>
```

That comes from `src/server/src/routes/media.ts`, so **plain FFmpeg is not enough**. Your FFmpeg build must include the `rubberband` filter.

Verify it before starting the app:

```bash
ffmpeg -filters | grep rubberband
```

You want to see a line containing `rubberband`. If that command prints nothing, pitch shifting will not work.

### Why this matters

- MP4 and CDG+MP3 playback can request pitch changes from the UI.
- The API spawns `ffmpeg` directly.
- If FFmpeg was built without Rubber Band support, those requests will fail even if `rubberband` is installed separately on the host.

### If your distro FFmpeg does not include Rubber Band

Install or build an FFmpeg package with:

- `--enable-gpl`
- `--enable-librubberband`
- `--enable-libx264`

Typical source-build dependency names are:

- `librubberband-dev` / `rubberband-devel`
- `libx264-dev` / `x264-devel`
- `pkg-config`
- `nasm`
- `yasm`
- `make`
- `gcc` / `g++`

Example configure line:

```bash
./configure --enable-gpl --enable-librubberband --enable-libx264
```

The Docker image for the API uses `ghcr.io/haggardj2/ffmpeg-rubberband:latest` as its FFmpeg source, which is the reference setup this repo expects.

## Install app dependencies

From the repository root:

```bash
cd src/server && npm install
cd ../web && npm install
cd ../..
python3 -m pip install --user --break-system-packages yt-dlp
```

Confirm the tools the server shells out to:

```bash
ffmpeg -version
yt-dlp --version
psql --version
```

## Set up PostgreSQL

Initialize PostgreSQL if this is a new host, then create the app database and user:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER karaoke WITH PASSWORD 'karaoke';
CREATE DATABASE karaoke OWNER karaoke;
SQL
```

If your distro does not start PostgreSQL automatically, start and enable it first with your service manager.

## Environment variables

The repo root includes `.env.example`, but when running without Docker you should export the values the API actually uses:

```bash
export DATABASE_URL='postgresql://karaoke:karaoke@localhost:5432/karaoke'
export MEDIA_ROOT='/absolute/path/to/media'
export WEB_APP_URL='http://localhost:5173'
export ORIGIN='http://localhost:5173,http://127.0.0.1:5173'
export PORT='5174'
export TRUST_PROXY='1'
```

Optional:

```bash
export ADMIN_USERNAME='admin'
export ADMIN_PASSWORD='change-me'
```

For a single-process production-style run where the API also serves the built frontend:

```bash
export WEB_DIST_DIR="$PWD/src/web/dist"
export WEB_RUNTIME_API_BASE='http://localhost:5174'
```

## Run database migrations

```bash
cd src/server
npm run migrate
```

This uses `psql` and the `DATABASE_URL` above.

## Run in development mode

Use two terminals.

### Terminal 1 - API

```bash
cd src/server
export DATABASE_URL='postgresql://karaoke:karaoke@localhost:5432/karaoke'
export MEDIA_ROOT='/absolute/path/to/media'
export WEB_APP_URL='http://localhost:5173'
export ORIGIN='http://localhost:5173,http://127.0.0.1:5173'
export PORT='5174'
npm run dev
```

### Terminal 2 - web

```bash
cd src/web
export VITE_API_BASE='http://localhost:5174'
npm run dev -- --host 0.0.0.0 --port 5173
```

Then open:

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5174/health`

## Run as a local production-style build

Build the frontend:

```bash
cd src/web
npm run build
```

Start the API and have it serve the built frontend:

```bash
cd ../server
export DATABASE_URL='postgresql://karaoke:karaoke@localhost:5432/karaoke'
export MEDIA_ROOT='/absolute/path/to/media'
export WEB_APP_URL='http://localhost:5173'
export ORIGIN='http://localhost:5173,http://127.0.0.1:5173'
export PORT='5174'
export WEB_DIST_DIR="$PWD/../web/dist"
export WEB_RUNTIME_API_BASE='http://localhost:5174'
npm start
```

If you prefer to keep the standalone web server from `src/web/server.js`, you can still run it separately after `npm run build`, but the API already supports serving the built SPA through `WEB_DIST_DIR`.

## Quick troubleshooting

### `ffmpeg -filters | grep rubberband` shows nothing

Your FFmpeg binary was built without Rubber Band support. Install a different FFmpeg package or build one with `--enable-librubberband`.

### Pitch changes fail but FFmpeg exists

Make sure the shell running the API resolves the same `ffmpeg` you tested:

```bash
which ffmpeg
ffmpeg -filters | grep rubberband
```

### `npm run migrate` fails with `psql: command not found`

Install the PostgreSQL client package for your distro.

### `yt-dlp` features fail

Install or update it manually:

```bash
python3 -m pip install --user --upgrade --break-system-packages yt-dlp
```

### Media paths look valid but files are rejected

`MEDIA_ROOT` is used as the safety boundary for media access. Point it at the real root directory that contains your karaoke media.
