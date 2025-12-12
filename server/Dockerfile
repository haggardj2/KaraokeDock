FROM node:25-alpine
RUN apk update && apk add --no-cache \
    ffmpeg \
    zip \
    unzip \
    postgresql-client \
    font-dejavu \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5174