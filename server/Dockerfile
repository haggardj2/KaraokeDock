FROM node:20-bookworm
RUN apt-get update && apt-get install -y \
    ffmpeg \
    zip \
    unzip \
    postgresql-client \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5174