# Docker Karaoke

## Overview

Docker Karaoke is a web-based karaoke application focused on quick setup and streaming.  
It supports CDG+MP3, MP4 karaoke backing tracks, and allows users to search & stream songs directly from [KaraokeNerds.com](https://karaokenerds.com).

## Features

- **CDG+MP3 Support:** Play karaoke tracks with synchronized lyrics using the standard CDG+MP3 format.
- **MP4 Support:** Stream or play MP4 karaoke videos directly in the browser.
- **Integrated Search & Streaming:** Find tracks quickly and stream songs from KaraokeNerds.com, simplifying music discovery for parties or events.

## Setup (Docker Compose)

You can rapidly deploy Web Karaoke MVP using Docker Compose:

1. **Clone the repository**
    git clone https://github.com/haggardj2/docker-karaoke.git
    cd docker-karaoke

2. **Configure environment**  
    Adjust environment variables in a `.env` file (refer to [`.env.example`](.env.example).

3. **Start with Docker Compose**
    docker compose up -d


## Roadmap & Early Production Warning

- **Early production:** Expect frequent updates, breaking changes, and incomplete features.
- Contributions and feedback are encouraged!
- See [issues](https://github.com/haggardj2/web-karaoke-mvp/issues) for current bugs and feature requests.


---
**Questions? Feedback?**  
Open an issue or start a discussion on [Github Discussions](https://github.com/haggardj2/web-karaoke-mvp/discussions).
