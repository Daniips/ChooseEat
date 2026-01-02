# Dockerfile para la API de ChooseEat
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración del workspace
COPY package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY tsconfig.base.json ./

# Instalar dependencias (incluyendo dev para build)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY apps/api ./apps/api

# Build
WORKDIR /app/apps/api
RUN pnpm build

# Imagen de producción
FROM node:20-alpine

WORKDIR /app

# Copiar package.json
COPY apps/api/package.json ./

# Copiar node_modules desde builder (pnpm workspaces)
# En pnpm workspaces, las dependencias están en el node_modules raíz
COPY --from=builder /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=builder /app/apps/api/dist ./dist

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

# Exponer puerto
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "dist/index.js"]

