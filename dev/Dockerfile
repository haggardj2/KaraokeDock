FROM node:26-alpine AS web-build
WORKDIR /app
COPY src/web/package*.json ./src/web/
WORKDIR /app/src/web
RUN npm install
COPY src/web/ ./
RUN npm run build

FROM ghcr.io/haggardj2/ffmpeg-rubberband:latest AS ffmpeg

FROM node:26-alpine
RUN apk add --no-cache \
    bash \
    rubberband \
    rubberband-libs \
    x264-libs \
    zip \
    unzip \
    postgresql-client \
    font-dejavu \
    python3 \
    py3-pip

RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

COPY --from=ffmpeg /opt/ffmpeg /opt/ffmpeg
ENV PATH="/opt/ffmpeg/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/ffmpeg/lib:${LD_LIBRARY_PATH}"

WORKDIR /app
COPY src/server/package*.json ./
RUN npm install
COPY src/server/ ./
COPY --from=web-build /app/src/web/dist ./web-dist

ENV PORT=5173
ENV WEB_DIST_DIR=/app/web-dist

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=10 \
  CMD node -e 'const http = require("http"); const req = http.get({ hostname: "127.0.0.1", port: 5173, path: "/health", timeout: 4000 }, res => process.exit(res.statusCode === 200 ? 0 : 1)); req.on("timeout", () => { req.destroy(); process.exit(1); }); req.on("error", () => process.exit(1));'

CMD ["sh", "-c", "npm run migrate && npm start"]
