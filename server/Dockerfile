# Pull the prebuilt ffmpeg layer (replace with your image/tag)
FROM ghcr.io/haggardj2/ffmpeg-rubberband:latest AS ffmpeg

FROM node:25-alpine
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

# Install yt-dlp
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

COPY --from=ffmpeg /opt/ffmpeg /opt/ffmpeg
ENV PATH="/opt/ffmpeg/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/ffmpeg/lib:${LD_LIBRARY_PATH}"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5174