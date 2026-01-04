# ChooseEat 🍽️

**ChooseEat** es una aplicación web colaborativa que ayuda a grupos de personas a decidir dónde comer. Los participantes pueden crear sesiones de votación, establecer filtros y preferencias, y votar por restaurantes hasta encontrar coincidencias.

> **Nota**: Este proyecto es el Trabajo de Fin de Máster (TFM) para el **Máster Universitario en Diseño y Desarrollo de Interfaz de Usuario Web (MDIUW)**. El proyecto está **actualmente en desarrollo activo**.

### 📖 Caso de Uso

Imagina que estás con un grupo de amigos intentando decidir dónde cenar. Cada uno tiene diferentes preferencias, algunos son vegetarianos, otros prefieren comida italiana, y nadie puede ponerse de acuerdo. ChooseEat resuelve este problema permitiendo que:

1. Un miembro del grupo crea una sesión con filtros (ubicación, tipo de cocina, restricciones dietéticas, precio)
2. Se genera un enlace que se comparte con todos los participantes
3. Cada persona vota por los restaurantes que le gustan
4. Cuando se alcanza el umbral de votos "Sí", el restaurante aparece como coincidencia
5. El grupo puede ver los resultados en tiempo real y decidir rápidamente

La aplicación está diseñada para ser rápida, intuitiva y facilitar la toma de decisiones grupales de forma colaborativa.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API](#-api)
- [Desarrollo](#-desarrollo)
- [Despliegue](#-despliegue)
- [Privacidad](#️-privacidad)

## ✨ Características

- 🎯 **Sesiones de Votación Colaborativas**: Crea sesiones y comparte el enlace con tu grupo
- 🗺️ **Búsqueda de Restaurantes**: Integración con Google Places API para búsqueda de restaurantes reales
- 🔍 **Filtros Avanzados**: 
  - Tipo de cocina (italiana, japonesa, mexicana, etc.)
  - Cocinas personalizadas
  - Filtros dietéticos (vegetariano, vegano, etc.)
  - Rango de precios
  - Restaurantes abiertos ahora
  - Calificación mínima
- 📊 **Sistema de Votación en Tiempo Real**: Votación sincronizada usando WebSockets
- 🌍 **Multiidioma**: Soporte para español e inglés
- 🌓 **Modo Oscuro/Claro**: Interfaz adaptable con tema oscuro/claro
- 📱 **Responsive**: Diseño adaptable a dispositivos móviles
- ⏱️ **TTL Configurable**: Las sesiones expiran automáticamente después de un período configurable (por defecto 7 días)
- 🔄 **Fallback a Memoria**: Si Redis no está disponible, funciona con almacenamiento en memoria

## 🛠️ Tecnologías

### Backend
- **Fastify**: Framework web rápido y eficiente
- **TypeScript**: Tipado estático
- **Socket.io**: Comunicación en tiempo real
- **Redis**: Almacenamiento de sesiones y caché
- **Google Places API**: Búsqueda de restaurantes

### Frontend
- **React 19**: Biblioteca de interfaz de usuario
- **Vite**: Build tool y dev server
- **React Router**: Enrutamiento
- **Socket.io Client**: Cliente WebSocket
- **React Leaflet**: Mapas interactivos
- **i18next**: Internacionalización

### Infraestructura
- **Docker Compose**: Redis containerizado
- **Node.js**: Runtime
- **pnpm**: Gestor de paquetes (workspaces)

## 📦 Requisitos Previos

- **Node.js** 18+ (recomendado 20+)
- **pnpm** 8+ (o npm/yarn)
- **Docker** y **Docker Compose** (para Redis)
- **Google Places API Key** (opcional, puede usar modo mock para desarrollo)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd ChooseEat
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   # o npm install
   ```

3. **Configurar variables de entorno** (ver sección [Configuración](#-configuración))

4. **Iniciar Redis con Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Iniciar el proyecto en modo desarrollo**
   ```bash
   pnpm dev
   # o npm run dev
   ```

   Esto iniciará:
   - API en `http://localhost:4000`
   - Frontend en `http://localhost:5173` (puerto por defecto de Vite)

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` con las siguientes variables:

**Ubicación:**
- **Desarrollo local:** `apps/api/.env` (donde se ejecuta el código)
- **Docker Compose:** `.env` en la raíz del proyecto (docker-compose lo lee desde ahí)



#### Backend (API)

| Variable | Descripción | Requerido | Por Defecto |
|----------|-------------|-----------|-------------|
| `PORT` | Puerto del servidor API | No | `4000` |
| `USE_MOCK` | Usar datos mock en lugar de Google Places API | No | `false` |
| `GOOGLE_PLACES_API_KEY` | Clave de API de Google Places | Sí* | - |
| `PLACES_LOCALE` | Locale para búsquedas de Google Places | No | `es` |
| `PLACES_DEFAULT_RADIUS_M` | Radio por defecto en metros | No | `2000` |
| `PLACES_DEFAULT_CENTER` | Centro por defecto (lat,lng) | No** | - |
| `REDIS_HOST` | Host de Redis | No | `127.0.0.1` |
| `REDIS_PORT` | Puerto de Redis | No | `6379` |
| `REDIS_URL` | URL completa de Redis (sobrescribe host/port) | No | - |
| `REDIS_PASSWORD` | Contraseña de Redis | No | - |
| `SESSION_TTL_DAYS` | Días de vida de las sesiones | No | `7` |
| `MEMORY_FALLBACK` | Activar fallback a memoria si Redis falla | No | `true` |
| `CORS_ORIGIN` | Origen permitido para CORS (producción) | No* | `true` (dev) |

\* Requerido solo si `USE_MOCK=false`  
\** Requerido si `USE_MOCK=false` y no se proporciona `center` en las peticiones  
\*** Requerido en producción (debe ser la URL del frontend, ej: `https://tudominio.com`)

#### Frontend (Web)

| Variable | Descripción | Requerido | Por Defecto |
|----------|-------------|-----------|-------------|
| `VITE_API_URL` | URL base de la API | No | `""` (usa relativo) |

### Ejemplo de `.env`

```env
# API
PORT=4000
USE_MOCK=false
GOOGLE_PLACES_API_KEY=tu_api_key_aqui
PLACES_LOCALE=es
PLACES_DEFAULT_RADIUS_M=2000
PLACES_DEFAULT_CENTER=41.3879,2.16992

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=devpass

# Sesiones
SESSION_TTL_DAYS=7
MEMORY_FALLBACK=true

# Frontend (en apps/web/.env)
VITE_API_URL=http://localhost:4000
```

### Modo Mock (Desarrollo)

Para desarrollo sin API de Google Places, puedes usar datos mock:

```env
USE_MOCK=true
```

Esto desactivará la necesidad de `GOOGLE_PLACES_API_KEY` y usará datos de prueba.

## 🎮 Uso

### Crear una Sesión

1. Accede a la página principal
2. Haz clic en "Crear Sesión"
3. Sigue el wizard:
   - Ingresa tu nombre y nombre de la sesión (opcional)
   - Selecciona el área en el mapa y el radio
   - Elige tipos de cocina
   - Configura filtros adicionales (precio, abierto ahora, calificación)
   - Define el número de participantes y el umbral de votos
   - Previsualiza los restaurantes encontrados
4. Comparte el enlace de invitación con tu grupo

### Unirse a una Sesión

1. Usa el enlace compartido o ingresa el ID de sesión
2. Ingresa tu nombre
3. Comienza a votar por restaurantes (Sí/No)

### Votación

- Los participantes votan por cada restaurante
- Cuando se alcanza el umbral de votos "Sí", el restaurante se marca como coincidencia
- Las votaciones se sincronizan en tiempo real entre todos los participantes
- Los resultados están disponibles en tiempo real

## 📁 Estructura del Proyecto

```
ChooseEat/
├── apps/
│   ├── api/                 # Backend (Fastify + TypeScript)
│   │   ├── src/
│   │   │   ├── cache/       # Sistema de caché Redis
│   │   │   ├── data/        # Repositorios de datos
│   │   │   ├── jobs/        # Tareas programadas (limpieza)
│   │   │   ├── providers/   # Proveedores de restaurantes
│   │   │   │   └── google/  # Integración Google Places
│   │   │   ├── types/       # Tipos TypeScript
│   │   │   └── index.ts     # Punto de entrada
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                 # Frontend (React + Vite)
│   │   ├── public/
│   │   │   └── locales/     # Traducciones
│   │   ├── src/
│   │   │   ├── components/  # Componentes React
│   │   │   ├── context/     # Context providers
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── lib/         # Utilidades
│   │   │   ├── views/       # Páginas/Vistas
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── packages/
│       └── shared/          # Código compartido
│
├── docker-compose.yml       # Configuración Redis
├── package.json            # Workspace root
└── README.md
```

## 🔌 API

### Endpoints Principales

#### Sesiones

- `POST /api/sessions` - Crear una nueva sesión
- `GET /api/sessions/:id` - Obtener información de una sesión
- `POST /api/sessions/:id/join` - Unirse a una sesión
- `POST /api/sessions/:id/votes` - Enviar un voto
- `GET /api/sessions/:id/results` - Obtener resultados
- `POST /api/sessions/:id/done` - Marcar participante como terminado

#### Restaurantes

- `GET /api/restaurants` - Buscar restaurantes (preview)

#### Utilidades

- `GET /health` - Health check
- `GET /api/photos/proxy` - Proxy para imágenes de Google Places

### WebSockets (Socket.io)

Eventos principales:
- `session:join` - Unirse a una sala de sesión
- `vote` - Enviar voto por WebSocket
- `session:vote` - Notificación de voto (broadcast)
- `session:matched` - Notificación de coincidencia (broadcast)
- `participant:joined` - Nuevo participante (broadcast)
- `participant:done` - Participante terminó (broadcast)
- `session:finished` - Sesión finalizada (broadcast)

## 💻 Desarrollo

### Scripts Disponibles

#### Root (Workspace)
```bash
pnpm dev          # Inicia API y Web en modo desarrollo
pnpm build        # Construye ambas aplicaciones
pnpm start        # Inicia ambas aplicaciones en modo producción
```

#### Backend (apps/api)
```bash
pnpm dev          # Modo desarrollo con hot reload (tsx watch)
pnpm build        # Compila TypeScript
pnpm start        # Ejecuta la versión compilada
```

#### Frontend (apps/web)
```bash
pnpm dev          # Servidor de desarrollo Vite
pnpm build        # Build de producción
pnpm preview      # Preview del build de producción
pnpm lint         # Ejecuta ESLint
```

### Flujo de Desarrollo

1. Asegúrate de tener Redis corriendo:
   ```bash
   docker-compose up -d
   ```

2. Inicia el proyecto en modo desarrollo:
   ```bash
   pnpm dev
   ```

3. El API estará en `http://localhost:4000`
4. El frontend estará en `http://localhost:5173` (o el puerto que Vite asigne)

### Linting

El proyecto usa ESLint. Para ejecutar el linter:

```bash
cd apps/web
pnpm lint
```

### Type Checking (Backend)

El backend está en TypeScript. Para verificar tipos:

```bash
cd apps/api
pnpm build
```

## 🚢 Despliegue

### Consideraciones

Antes de desplegar a producción:

1. **CORS**: Debe configurarse con `CORS_ORIGIN` (URL de tu frontend)
2. **Variables de Entorno**: Configurar todas las variables necesarias
3. **Redis**: Asegurar que Redis esté disponible y configurado
4. **API Key**: Configurar `GOOGLE_PLACES_API_KEY` válida
5. **Frontend**: El frontend se despliega por separado (CDN, Vercel, Nginx, etc.)

### Build de Producción

```bash
# Construir ambas aplicaciones
pnpm build
```

Los artefactos estarán en:
- Backend: `apps/api/dist/` (se despliega con Docker)
- Frontend: `apps/web/dist/` (se despliega por separado, ver DEPLOY.md)

### Variables de Entorno de Producción

Asegúrate de configurar:
- `REDIS_URL` o `REDIS_HOST` + `REDIS_PASSWORD`
- `GOOGLE_PLACES_API_KEY`
- `PLACES_DEFAULT_CENTER` (si no se proporciona en cada petición)
- `VITE_API_URL` (URL pública de la API para el frontend)

### Docker Compose para Producción

Puedes usar Docker Compose para Redis en producción, pero considera:
- Usar un volumen persistente
- Configurar contraseña segura
- Considerar Redis gestionado (AWS ElastiCache, etc.)

## 📝 Notas Adicionales

- Las sesiones se limpian automáticamente después del TTL configurado
- Un job de limpieza corre cada hora para eliminar sesiones expiradas
- Si Redis no está disponible, la aplicación funciona con almacenamiento en memoria (si `MEMORY_FALLBACK=true`)
- El sistema de caché Redis ayuda a reducir llamadas a Google Places API
- Las sesiones se sincronizan automáticamente desde memoria a Redis cuando Redis se conecta

## 🛡️ Privacidad

- No se almacenan datos personales sensibles
- Los nombres de participantes solo existen durante la vida de la sesión
- Las sesiones expiran automáticamente tras el TTL configurado

## 📄 Licencia

MIT License

Copyright (c) 2026 ChooseEat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**ChooseEat** - Decidiendo dónde comer, juntos. 🍽️

