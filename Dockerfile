# Etapa 1: Base com dependências do Chromium para WhatsApp Web / Puppeteer
FROM node:22-bullseye-slim AS base

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instala o Bun para build e gerenciamento ultra-rápido
RUN npm install -g bun

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Etapa 2: Instalação de dependências e build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Volume para persistir sessão do WhatsApp Web entre deploys e reinicializações
VOLUME ["/app/.wwebjs_auth"]

EXPOSE 3000

ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
