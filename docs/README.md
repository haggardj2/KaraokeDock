# Docker Karaoke

## Overview

**Docker Karaoke** is a web‑based karaoke platform designed for fast setup, local library playback, and online streaming.  
It supports **CDG+MP3** (raw & zip), **MP4 karaoke tracks**, and integrates with **KaraokeNerds.com** for searching and streaming songs.

## Features

- **CDG+MP3 Support:** Play traditional karaoke files with synchronized lyrics.
- **MP4 Video Support:** Stream or play MP4 karaoke videos directly in the browser.
- **Integrated Search & Streaming:** Browse and stream songs directly from KaraokeNerds.com.
- **Multi‑page Interface:** Admin, Host, Request, and Player pages for full karaoke‑rotation control.

## Setup (Docker Compose)

### 1. Clone the repository
```bash
git clone https://github.com/haggardj2/docker-karaoke.git
cd docker-karaoke
```

### 2. Configure environment
Define environment variables in a `.env` file.  
Use [`.env.example`](.env.example) as a template.

### 3. Start the stack
```bash
docker compose up -d
```

---

## Usage

### Requests Page
![Requests page](https://github.com/haggardj2/docker-karaoke/blob/main/docs/requests.png)

Access:  
- `http://<server-ip>:5173/requests`
- `http://<server-ip>:5173/`

Users can:

- Search the library  
- Add songs to the queue  
- Enter their name for rotation

---

### Player Page
![Player page](https://github.com/haggardj2/docker-karaoke/blob/main/docs/player.png)

Access:  
- `http://<server-ip>:5173/player`

The Player page includes:

- A scrolling **queue overlay** (tickler) showing the current rotation  
- A **QR code** linking users to the Requests page  
- Full‑screen playback with MP4 or CDG+MP3 support  

---

### Admin Page
![Admin page](https://github.com/haggardj2/docker-karaoke/blob/main/docs/admin_dash.png)

Access:  
`http://<server-ip>:5173/admin`

The Admin page lets you:

- Add your internal media library  
- Run scans  
- Generate the **admin token** (required for Host page control)

Authentication is configured through environment variables in `.env`.

---

### Host Page
![Host page](https://github.com/haggardj2/docker-karaoke/blob/main/docs/host_dash.png)

Access:  
`http://<server-ip>:5173/host`

The Host page allows you to:

- Control the rotation  
- Start/stop tracks  
- Reorder queue  
- Rename requesters  
- Manage playback with the **admin token**

---

## Known Issues

- Minor UI issues on mobile devices

---

## Roadmap

- Break music support
- KaraokeNerds integration on the Host page. (Only works from the requests page)
- Improved mobile interface  

---

## Early Production Warning

Docker Karaoke is in **early production**, meaning:

- Frequent updates  
- Potential breaking changes  
- Some incomplete functionality

Feedback and PRs are encouraged.

See open issues:  
https://github.com/haggardj2/docker-karaoke/issues

---

## Questions / Feedback

Start a discussion or open an issue here:  
https://github.com/haggardj2/docker-karaoke/discussions
