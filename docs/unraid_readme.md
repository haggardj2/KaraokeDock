# KaraokeDock on Unraid

This guide covers installing KaraokeDock on Unraid from **Community Applications**, setting up PostgreSQL, and connecting the app container to the database.


## What you need

- Unraid with Community Applications installed
- A PostgreSQL container
- A share or folder for karaoke tracks
- Optional folders for downloaded tracks and break music

## Recommended shares and folders

Create a share such as `karaoke`, then create these folders:

```text
/mnt/user/karaoke/Karaoke Tracks
/mnt/user/karaoke/downloads
/mnt/user/karaoke/Break Music
/mnt/user/appdata/postgresql
```

Recommended use:

| Host path | Container path | Access | Purpose |
|---|---:|---:|---|
| `/mnt/user/karaoke/Karaoke Tracks` | `/media/karaoke` | Read-only | Local karaoke library |
| `/mnt/user/karaoke/downloads` | `/media/downloads` | Read/write | Downloaded/imported tracks |
| `/mnt/user/karaoke/Break Music` | `/media/breakmusic` | Read-only | Break music |

## Install PostgreSQL

1. Open **Apps** in Unraid.
2. Search for a PostgreSQL container, such as `postgres`, `postgresql`, or `postgresql_alpine`.
3. Install it with a persistent appdata path.

Use values like:

| Setting | Example |
|---|---|
| Container name | `postgresql_alpine` |
| Host port | `5432` |
| Container port | `5432` |
| Data path | `/mnt/user/appdata/postgresql` |
| Database | `karaoke` |
| User | `karaoke` |
| Password | Choose a strong password |

For many PostgreSQL templates, the environment variables are:

```text
POSTGRES_DB=karaoke
POSTGRES_USER=karaoke
POSTGRES_PASSWORD=your_strong_password
```

Start the PostgreSQL container and confirm it stays running before installing KaraokeDock.

## Database networking options

Use one of these connection methods.

### Option A: Connect by Unraid server IP

This works with normal bridge networking as long as the PostgreSQL port is published on the host.

Example:

```text
DB_HOST=192.168.1.50
DB_PORT=5432
```

Replace `192.168.1.50` with your Unraid server IP.

### Option B: Connect by PostgreSQL container name

Use this if KaraokeDock and PostgreSQL are on the same user-defined Docker network and container DNS is available.

Example:

```text
DB_HOST=postgresql_alpine
DB_PORT=5432
```

The KaraokeDock template defaults `DB_HOST` to `postgresql_alpine`.

## Install KaraokeDock from Community Applications

1. Open **Apps** in Unraid.
2. Search for **KaraokeDock**.
3. Install the app.
4. Fill in the required paths and variables.

The container image is:

```text
haggardj2/karaokedock:latest
```

## KaraokeDock template settings

### Required port

| Setting | Value |
|---|---|
| WebUI Port | `5173` |

The Web UI opens at:

```text
http://UNRAID_IP:5173
```

### Required paths

| Template field | Container path | Example host path |
|---|---|---|
| Karaoke Tracks | `/media/karaoke` | `/mnt/user/karaoke/Karaoke Tracks` |
| Downloads | `/media/downloads` | `/mnt/user/karaoke/downloads` |
| Break Music | `/media/breakmusic` | `/mnt/user/karaoke/Break Music` |

### Required database variables

| Template field | Variable | Example |
|---|---|---|
| Database Host | `DB_HOST` | `192.168.1.50` or `postgresql_alpine` |
| Database Port | `DB_PORT` | `5432` |
| Database Name | `DB_NAME` | `karaoke` |
| Database User | `DB_USER` | `karaoke` |
| Database Password | `DB_PASSWORD` | Your PostgreSQL password |

### Web URL and origins

Set these to the URL users will actually open.

For LAN-only access:

```text
WEB_APP_URL=http://192.168.1.50:5173
ORIGIN=http://192.168.1.50:5173,http://localhost:5173,http://127.0.0.1:5173
```

If using a reverse proxy:

```text
WEB_APP_URL=https://karaoke.example.com
ORIGIN=https://karaoke.example.com,http://192.168.1.50:5173
TRUST_PROXY=1
```

`ORIGIN` is comma-separated. Include every browser URL that will access the app so HTTP requests and WebSockets work correctly.

### Optional performance setting

`MEDIA_PROBE_CONCURRENCY` controls how many media files are probed at once during scanning.

Suggested values:

| Server CPU | Suggested value |
|---|---:|
| 4-core | `8` to `12` |
| 6-core | `12` to `16` |
| 8+ cores | `16` to `24` |

Leave it blank to let KaraokeDock auto-pick a value.

## First startup

1. Start PostgreSQL.
2. Start KaraokeDock.
3. Initial password is randomly generated. Check logs within the KaraokeDock container for the password. 
4. Open:

```text
http://UNRAID_IP:5173/admin
```

5. Configure your local library path if needed.
6. Run a library scan from the Admin page.
7. Open the Host page:

```text
http://UNRAID_IP:5173/host
```

8. Open the Player page on the display machine:

```text
http://UNRAID_IP:5173/player
```

Guests use:

```text
http://UNRAID_IP:5173/
```

## PostgreSQL connection troubleshooting

### KaraokeDock cannot connect to PostgreSQL

Check:

- PostgreSQL container is running.
- `DB_HOST` is correct.
- `DB_PORT` matches the published PostgreSQL host port.
- `DB_NAME`, `DB_USER`, and `DB_PASSWORD` match the PostgreSQL container settings.
- If using a container name for `DB_HOST`, both containers are on the same user-defined Docker network.

If unsure, use the Unraid server IP for `DB_HOST`.

### Database authentication failed

The password in KaraokeDock must match the PostgreSQL user's password. If you change `POSTGRES_PASSWORD` after the database has already initialized, many PostgreSQL containers do not automatically update the existing database user's password. Update the password inside PostgreSQL or recreate the database appdata if you are starting over.

### Web page loads but queue updates do not

Check `ORIGIN`. It must include the exact URL used in the browser, including protocol and port.

Examples:

```text
http://192.168.1.50:5173
https://karaoke.example.com
```

### Media scan finds no files

Check:

- The host path points to the correct Unraid share/folder.
- The Karaoke Tracks path is mounted to `/media/karaoke`.
- The files are in supported karaoke formats.
- The path is readable by the container.

### Forgot Login

Open a console to your Unraid server
```bash
# Run password reset helper:
docker exec -it KaraokeDock npm run reset-credentials
# Defaults to username "admin" and generates a secure password if --password is omitted.
docker exec -it KaraokeDock npm run reset-credentials -- --password supersecret
# Or set a specific username/password:
docker exec -it KaraokeDock npm run reset-credentials -- --username admin --password supersecret
```
