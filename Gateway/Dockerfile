FROM node:22.23.4-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:22.23.4-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY scripts/check-runtime.cjs ./scripts/check-runtime.cjs
COPY public ./public
RUN mkdir -p /data
ENV DATABASE_PATH=/data/gateway.sqlite
EXPOSE 5180
CMD ["node", "dist/index.js"]
