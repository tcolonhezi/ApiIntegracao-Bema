# Use Ubuntu 20.04 como imagem base
FROM ubuntu:20.04

# Definir diretório de trabalho no container
WORKDIR /usr/src/app

# Definir o modo não interativo
ENV DEBIAN_FRONTEND=noninteractive

# Instalar pacotes necessários
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    git \
    mc \
    chromium-browser

# Criar o diretório necessário para armazenar as chaves GPG
RUN mkdir -p /etc/apt/keyrings

# Adicionar a chave do NodeSource e o repositório para Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

# Instalar Node.js
RUN apt-get update && apt-get install -y nodejs

# Copiar todos os arquivos para o container
COPY . .

# Instalar dependências do npm
RUN npm install

# Instalar PM2 globalmente
RUN npm install -g pm2

# Instalar dependências adicionais necessárias para o Puppeteer ou outros recursos
RUN apt-get install -y \
    libgbm-dev \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    openssl \
    mc 

RUN ln -sf /usr/share/zoneinfo/America/sao_Paulo /etc/localtime

# Expor porta da aplicação
EXPOSE 3335

# Comando para rodar o servidor Node.js usando PM2
#CMD ["pm2-runtime", "npm", "--", "run", "prod"]
