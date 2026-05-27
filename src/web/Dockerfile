FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm install --production
COPY server.js ./server.js
COPY inject-config.sh ./inject-config.sh
RUN sed -i 's/\r$//' ./inject-config.sh && chmod +x ./inject-config.sh
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://localhost:5173/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["sh", "/app/inject-config.sh"]
