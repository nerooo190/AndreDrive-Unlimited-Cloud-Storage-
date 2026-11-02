FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/var/lib/andredrive
COPY --chown=node:node package*.json ./
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY scripts/docker-entrypoint.sh /usr/local/bin/andredrive-entrypoint
RUN chmod +x /usr/local/bin/andredrive-entrypoint && mkdir -p /var/lib/andredrive && chown node:node /var/lib/andredrive
EXPOSE 3000
ENTRYPOINT ["andredrive-entrypoint"]
CMD ["node", "server/index.js"]
