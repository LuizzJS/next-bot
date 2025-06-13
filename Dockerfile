FROM node:20-slim

# Variáveis
ENV CHROME_VERSION=121.0.6167.85
ENV CHROME_PATH=/usr/bin/chrome

# Instala dependências do Chromium
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Baixa e instala o Chromium manualmente
RUN wget https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/1210667/chrome-linux.zip && \
    unzip chrome-linux.zip && \
    mv chrome-linux/chrome /usr/bin/chrome && \
    chmod +x /usr/bin/chrome && \
    rm -rf chrome-linux chrome-linux.zip

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
