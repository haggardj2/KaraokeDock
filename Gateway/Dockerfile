# Same Alpine base as the main KaraokeDock image. better-sqlite3 (the only dependency
# with an install script) ships musl prebuilds for x64/arm64 and loads them at runtime,
# so its node-gyp rebuild is skipped and no compiler toolchain is needed.
FROM node:26.12.1-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

FROM node:26.12.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY scripts/check-runtime.cjs ./scripts/check-runtime.cjs
COPY public ./public
RUN mkdir -p /data
ENV DATABASE_PATH=/data/gateway.sqlite
EXPOSE 5180
CMD ["node", "dist/index.js"]
