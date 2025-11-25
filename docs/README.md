# Docker Karaoke

## Overview

Docker Karaoke is a web-based karaoke application focused on quick setup and streaming.  
It supports CDG+MP3 (raw & zip format), MP4 karaoke backing tracks, and allows users to search & stream songs directly from [KaraokeNerds.com](https://karaokenerds.com).

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

## Usage
![The Admin page:](https://github.com/haggardj2/docker-karaoke/blob/main/docs/admin_dash.png)
Can be reached by going to http://ip address:5173/admin The admin page is where you add the intrenal library, and create the admin-token. The admin-token is needed to control the host page. The admin page is password protected by the varibales in the .env file.

![The Host page:](https://github.com/haggardj2/docker-karaoke/blob/main/docs/host_dash.png)
Can be reached by going to http://ip address:5173/host The host page allows the host to control the rotation, change songs, and rename requests. The admin-token needs to be set in order to control the functionality. 

![The Requests page:](https://github.com/haggardj2/docker-karaoke/blob/main/docs/requests.png)
Can be reached by going to http://ip address:5173/requests or http://ip address:5173 Allows users to add songs to the queue.

The Player page has a tickler overlay that shows who is in the queue, and what song their singing. has a QR code that will point to the requests page.

## Issues

- Minor U/I issues on mobile devices

## Roadmap

- Break music support
- KaraokeNerds support on the host page

## Early Production Warning

- **Early production:** Expect frequent updates, breaking changes, and incomplete features.
- Contributions and feedback are encouraged!
- See [issues](https://github.com/haggardj2/docker-karaoke/issues) for current bugs and feature requests.


---
**Questions? Feedback?**  
Open an issue or start a discussion on [Github Discussions](https://github.com/haggardj2/web-karaoke-mvp/discussions).
