# Base moderna com Debian 12 (Bookworm) e Chromium para WhatsApp Web / Puppeteer
FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Instala o Bun para build e gerenciamento
RUN npm install -g bun

WORKDIR /app

# Copia arquivos de dependência primeiro
COPY package.json bun.lock* ./

# Instalação limpa das dependências (incluindo devDependencies necessárias para o build)
RUN bun install

# Copia o restante do código
COPY . .

# Executa o build da aplicação TanStack Start / Nitro
RUN bun run build

# --- CONFIGURAÇÃO BLINDADA PARA O RAILWAY ---
# Configurações do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

# Força o Nitro a escutar conexões externas
ENV HOST=0.0.0.0 \
    NITRO_HOST=0.0.0.0

# Define a porta padrão, mas permite que o Railway injete a dele dinamicamente
ENV PORT=8080 \
    NITRO_PORT=8080

EXPOSE 8080

# Inicia o servidor de produção do Nitro
CMD ["node", ".output/server/index.mjs"]
