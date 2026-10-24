FROM node:26.12.1-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

FROM node:26.12.1-bookworm-slim AS runtime
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
