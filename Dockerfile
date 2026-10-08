# Base moderna com Debian 12 (Bookworm) e Chromium para WhatsApp Web / Puppeteer
FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instala o Bun para build e gerenciamento ultra-rápido
RUN npm install -g bun

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    HOST=0.0.0.0

WORKDIR /app

# Instalação de dependências e build
COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 8080

ENV PORT=8080

CMD ["node", ".output/server/index.mjs"]
