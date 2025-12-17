# 🎤 Docker Web Karaoke

A modern, full-featured web-based karaoke system with support for multiple media formats, real-time queue management, and external karaoke integration.


## 📋 Table of Contents

- [Features](#-features)
- [Web Pages Overview](#-web-pages-overview)
- [Quick Start with Docker](#-quick-start-with-docker)
- [First-Time Setup](#-first-time-setup)
- [Architecture](#-architecture)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

- 🎤 **Multi-format support**: MP4 videos, CDG+MP3 files (raw and zipped)
- 🔄 **Real-time queue updates** via WebSocket
- 📱 **Mobile-friendly interface** with QR code for easy guest access
- 🌐 **External karaoke integration** (Karaoke Nerds)
- ⚡ **Auto-play mode** with configurable delays
- 🎵 **CDG to MP4 streaming** transcoding on-the-fly
- 🔐 **Session-based authentication** with secure password management
- 📊 **Admin dashboard** for library management and statistics
- 🎯 **Host panel** for queue control and playback management

## 📱 Web Pages Overview

### Requests Page
**URL:** `http://your-server:5173/requests`

The main interface for guests to browse and request songs. Fully mobile-responsive and accessible via QR code.

![Requests Page](screenshots/requests-page.png)

**Functions:**
- Search local karaoke library
- Browse songs by title or artist
- Filter results with advanced options
- Submit song requests with your name
- Switch to Karaoke Nerds for online songs

### Karaoke Nerds Integration
**URL:** `http://your-server:5173/requests` (switch to Karaoke Nerds tab)

Access thousands of online karaoke tracks from Karaoke Nerds directly within the app.

![Karaoke Nerds Page](screenshots/karaoke-nerds-page.png)

**Functions:**
- Search online karaoke catalog
- Preview and add external songs
- Seamless integration with your queue
- No need to download files

### Host Panel
**URL:** `http://your-server:5173/host`

The control center for managing the karaoke session.

![Host Page](screenshots/host-page.png)

**Functions:**
- View real-time queue updates
- Play, pause, skip, and stop songs
- Manage queue order (reorder, remove songs)
- Enable auto-play mode
- Configure playback settings
- Access QR code for guest requests
- Password-protected access

### Player Page
**URL:** `http://your-server:5173/player`

Full-screen karaoke player optimized for display on TVs or projectors.

![Player Page](screenshots/player-page.png)

**Functions:**
- Full-screen video playback
- Display current song information
- Show scrolling text when idle
- QR code display for song requests
- Automatic queue progression
- Support for MP4, CDG+MP3, and external URLs from KaraokeNerds.com

### Admin Dashboard
**URL:** `http://your-server:5173/admin`

Management interface for system configuration and media libraries.

![Admin Page](screenshots/admin-page.png)

**Functions:**
- View system statistics (artists, tracks, queue)
- Add and manage media libraries
- Scan directories for karaoke files
- Configure authentication credentials
- Database management tools
- System health monitoring

## 🚀 Quick Start with Docker

### Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- Karaoke media files (MP4, CDG+MP3, or ZIP files)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/haggardj2/web-karaoke-mvp.git
   cd web-karaoke-mvp
   ```

2. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit the `.env` file** with your configuration:
   ```bash
   nano .env  # or use your preferred editor
   ```

   At minimum, update these variables:
   ```env

   # Path to where you want the Postgres DB to be saved
   DB_PATH=/home/user/web-karaoke-mvp/db
   
   # Path to your karaoke files on the host machine
   MEDIA_PATH=./media/local
   
   # Your server's IP address or hostname
   WEB_APP_URL=http://192.168.1.100:5173
   VITE_API_BASE=http://192.168.1.100:5174
   ORIGIN=http://192.168.1.100:5173,http://localhost:5173
   ```

6. **Start the application:**
   ```bash
   docker compose up -d
   ```

7. **Check container status:**
   ```bash
   docker compose ps
   ```

   You should see three running containers:
   - `karaoke-web` (Web Frontend)
   - `karaoke-api` (API Server)
   - `karaoke-db` (PostgreSQL Database)

8. **Access the application:**
   - Web Interface: `http://localhost:5173` (or your server IP)
   - Admin Panel: `http://localhost:5173/admin`
   - Host Panel: `http://localhost:5173/host`
   - Player: `http://localhost:5173/player`

### Docker Compose Architecture

The application runs three Docker containers:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   karaoke-web   │────▶│   karaoke-api   │────▶│   karaoke-db    │
│   (Frontend)    │     │   (Backend)     │     │  (PostgreSQL)   │
│   Port: 5173    │     │   Port: 5174    │     │   Port: 5432    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Container Details:**

- **karaoke-web**: React + TypeScript frontend served via Vite
  - Image: `haggardj2/karaoke-web:latest`
  - Exposed port: 5173

- **karaoke-api**: Node.js + Express backend
  - Image: `haggardj2/karaoke-api:latest`
  - Exposed port: 5174
  - Mounts: `MEDIA_PATH` → `/media` inside container

- **karaoke-db**: PostgreSQL 16 database
  - Image: `postgres:18`
  - Exposed port: 5432

### Managing the Application

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f karaoke-api
docker compose logs -f karaoke-web
```

**Stop the application:**
```bash
docker compose down
```

**Update to latest version:**
```bash
docker compose pull
docker compose up -d
```

**Restart services:**
```bash
docker compose restart
```

**Build locally (development):**
```bash
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml up -d
```

## ⚙️ Configuration

### Environment Variables

All configuration is managed through the `.env` file. Key variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MEDIA_PATH` | Path to karaoke files on host | `./media/local` or `/mnt/karaoke` |
| `WEB_APP_URL` | Public URL for QR codes | `http://192.168.1.100:5173` |
| `VITE_API_BASE` | API server URL for frontend | `http://192.168.1.100:5174` |
| `ORIGIN` | CORS allowed origins (comma-separated) | `http://192.168.1.100:5173,http://localhost:5173` |
| `POSTGRES_PASSWORD` | Database password | `karaoke` (change in production) |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://karaoke:karaoke@db:5432/karaoke` |

**Important Notes:**
- Replace `localhost` with your server's IP address for network access
- Ensure `ORIGIN` includes all URLs where the web app will be accessed
- The `MEDIA_PATH` on the host maps to `/media` inside the API container
- Change default passwords before deploying to production

### Network Configuration

To access from other devices on your network:

1. Set `WEB_APP_URL` to your server's IP: `http://192.168.1.100:5173`
2. Set `VITE_API_BASE` to your server's IP: `http://192.168.1.100:5174`
3. Update `ORIGIN` to include your server's IP
4. Ensure firewall allows ports 5173 and 5174

## 🎯 First-Time Setup

After starting the containers for the first time:

1. **Navigate to the Admin page:**
   ```
   http://your-server:5173/admin
   ```

2. **Login with default credentials:**
   - Username: `admin`
   - Password: `changeme-password`

3. **⚠️ Change the default password immediately** (you'll be prompted)

4. **Add a media library:**
   - Click "Add Library"
   - Name: Give it a descriptive name (e.g., "My Karaoke Collection")
   - Path: Enter `/media` (this is the container path, not your host path)
   - Click "Add Library"

5. **Scan your files:**
   - Click "Scan All Libraries"
   - Wait for the scan to complete
   - Refresh stats to see your track count

6. **Access the Host panel:**
   - Go to `http://your-server:5173/host`
   - Login with your password
   - Share the QR code with guests

7. **Done!** Guests can now request songs via the Requests page

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for development and building
- React Router for navigation
- WebSocket for real-time updates

**Backend:**
- Node.js with Express
- TypeScript for type safety
- PostgreSQL for data persistence
- WebSocket for live queue sync
- FFmpeg for CDG to MP4 transcoding

**Infrastructure:**
- Docker for containerization
- Docker Compose for orchestration
- Pre-built images hosted on Docker Hub

### Supported File Formats

- **MP4 videos**: Direct playback
- **CDG+MP3 pairs**: Transcoded to MP4 on-the-fly
- **ZIP archives**: Automatically extracted and processed
- **External URLs**: From Karaoke Nerds and similar services

### Data Flow

1. Media files scanned and indexed into PostgreSQL
2. Guests request songs via Requests page
3. Queue updates broadcast via WebSocket
4. Host controls playback from Host panel
5. Player page displays current song
6. CDG files transcoded to MP4 in real-time if needed

## 💻 Development

### Local Development (without Docker)

**Server:**
```bash
cd server
npm install
cp ../.env.example .env
# Edit .env with local settings
npm run migrate
npm run dev
```

**Web:**
```bash
cd web
npm install
npm run dev
```

**Database:**
```bash
# Start PostgreSQL in Docker
docker run -d \
  --name karaoke-db \
  -e POSTGRES_DB=karaoke \
  -e POSTGRES_USER=karaoke \
  -e POSTGRES_PASSWORD=karaoke \
  -p 5432:5432 \
  postgres:18-alpine
```

### Building Docker Images

To build images locally:

```bash
# Build all images
docker compose -f docker-compose.build.yml build --no-cache

# Build specific service
docker compose -f docker-compose.build.yml build api --no-cache
docker compose -f docker-compose.build.yml build web --no-cache

```

### Database Migrations

```bash
cd server
npm run migrate
```

## 🔧 Troubleshooting

### Common Issues

**QR code shows localhost instead of server IP:**
- Solution: Set `WEB_APP_URL` in `.env` to your server's IP address

**Cannot connect to API from other devices:**
- Solution: Set `VITE_API_BASE` to your server's IP address
- Check firewall allows port 5174

**CORS errors in browser console:**
- Solution: Add your access URL to `ORIGIN` in `.env`

**No songs appearing after scan:**
- Check `MEDIA_PATH` points to correct directory
- Verify files are in supported formats
- Check API logs: `docker compose logs karaoke-api`

**Database connection errors:**
- Wait 10-15 seconds for database to initialize on first start
- Restart API container: `docker compose restart karaoke-api`

**Permission denied errors:**
- Ensure media files are readable by Docker
- On Linux with SELinux, the `:Z` flag in volumes may help

### Viewing Logs

```bash

# Specific container
docker compose logs -f karaoke-api
docker compose logs -f karaoke-web
docker compose logs -f karaoke-db
```

## 🔐 Security Considerations

- **Change default passwords** immediately after first login
- **Change database password** in production environments
- Use **HTTPS** with a reverse proxy (nginx, Traefik) for production
- Keep Docker images updated: `docker compose pull`
- Restrict network access to admin and host pages if needed

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📮 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in the repository
- Review Docker logs for error messages

---

**Docker Images:** 
- API: `haggardj2/karaoke-api:latest`
- Web: `haggardj2/karaoke-web:latest`
