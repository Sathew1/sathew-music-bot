FROM node:20-bookworm

# Evitar preguntas durante la instalación
ENV DEBIAN_FRONTEND=noninteractive

# Instalar Python, ffmpeg y herramientas necesarias
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Actualizar pip e instalar yt-dlp
RUN pip3 install --break-system-packages --no-cache-dir -U yt-dlp

# Directorio de trabajo
WORKDIR /app

# Copiar package.json primero para aprovechar la caché
COPY package*.json ./

# Instalar dependencias Node
RUN npm install --omit=dev

# Copiar el proyecto
COPY . .

# Ejecutar el bot
CMD ["npm", "start"]
