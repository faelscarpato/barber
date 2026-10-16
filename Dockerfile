# Base moderna com Debian 12 (Bookworm) e Chromium para WhatsApp Web / Puppeteer
FROM node:22-bookworm-slim AS base

# Instala o essencial para o Puppeteer rodar liso, sem peso morto
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instala o Bun para build e gerenciamento ultra-rápido
RUN npm install -g bun

# Variáveis do Puppeteer e Host (Crucial para o Railway enxergar o container)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app

# Copia os arquivos de dependência primeiro (otimiza o cache do Docker)
# O asterisco garante compatibilidade caso use bun.lock ou bun.lockb
COPY package.json bun.lock* ./

# Instala TODAS as dependências (incluindo as de dev, necessárias para o build)
RUN bun install

# Copia o restante do código fonte
COPY . .

# Executa o build da aplicação (gera a pasta .output)
RUN bun run build

# AGORA SIM, definimos o ambiente como produção para o runtime
ENV NODE_ENV=production

EXPOSE 8080

# O gran finale: roda o servidor compilado do Nitro/Nuxt
CMD ["node", ".output/server/index.mjs"]
