FROM node:20-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
COPY inject-config.sh /app/inject-config.sh
RUN chmod +x /app/inject-config.sh
EXPOSE 5173
CMD ["/app/inject-config.sh"]
