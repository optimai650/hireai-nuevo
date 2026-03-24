# 🤖 HireAI

**Plataforma de reclutamiento potenciada por IA.** Automatiza el análisis de CVs, genera entrevistas personalizadas y evalúa candidatos con inteligencia artificial para que tu equipo tome mejores decisiones de contratación.

---

## ✨ Características principales

- 📄 **Análisis automático de CVs** — Sube un PDF y la IA extrae habilidades, experiencia y puntuación general
- 🎯 **Gestión de posiciones** — Crea y administra vacantes con filtros por departamento, tipo y estado
- 🧑‍💼 **Pipeline de candidatos** — Seguimiento desde "nuevo" hasta "contratado" con notas y etiquetas
- 💬 **Entrevistas con IA** — Genera preguntas personalizadas (técnicas, conductuales, culturales) y evalúa respuestas automáticamente
- 🔗 **Links públicos de entrevista** — Envía un enlace con token al candidato; sin cuenta requerida
- 📊 **Dashboard analítico** — KPIs de contratación, tasas de completitud y distribución por estatus
- 🔐 **Autenticación multi-usuario** — JWT + roles (admin / recruiter) por empresa

---

## 🛠 Stack técnico

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 22+ | Runtime |
| TypeScript | 6 | Lenguaje |
| Express | 5 | HTTP server |
| better-sqlite3 | 12 | Base de datos |
| jsonwebtoken | 9 | Autenticación JWT |
| bcryptjs | 3 | Hash de contraseñas |
| Zod | 4 | Validación de esquemas |
| OpenRouter API | — | Modelos de IA (análisis CV, entrevistas) |
| Helmet / CORS | — | Seguridad HTTP |
| express-rate-limit | 8 | Rate limiting |
| multer | 2 | Upload de archivos PDF |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Lenguaje |
| Vite | 8 | Build tool |
| Tailwind CSS | 3 | Estilos |
| React Router | 7 | Navegación |
| TanStack Query | 5 | Server state |
| Zustand | 5 | Client state (auth) |
| React Hook Form + Zod | 7/4 | Formularios con validación |
| Recharts | 3 | Gráficas en dashboard |
| Lucide React | 1 | Íconos |
| Axios | 1.13 | HTTP client |

---

## 📁 Estructura del proyecto

```
hireai-nuevo/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # Registro, login, perfil de usuario
│   │   │   ├── candidates.ts    # CRUD candidatos + upload CV + export CSV
│   │   │   ├── positions.ts     # CRUD vacantes
│   │   │   ├── interviews.ts    # Generación y evaluación de entrevistas
│   │   │   └── analytics.ts     # KPIs y estadísticas del dashboard
│   │   ├── db/
│   │   │   ├── client.ts        # Conexión SQLite
│   │   │   └── migrations/      # Migraciones automáticas al iniciar
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Middleware JWT + roles
│   │   │   └── upload.ts        # Middleware multer para PDFs
│   │   ├── services/
│   │   │   └── ai.ts            # Integración con OpenRouter (análisis CV, entrevistas)
│   │   ├── scripts/
│   │   │   └── seed.ts          # Script para poblar BD de desarrollo
│   │   └── index.ts             # Entry point, configuración Express
│   ├── uploads/                 # CVs subidos (gitignore)
│   ├── data/                    # Archivo SQLite (gitignore)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CandidatesPage.tsx
│   │   │   ├── CandidateDetailPage.tsx
│   │   │   ├── PositionsPage.tsx
│   │   │   ├── PositionDetailPage.tsx
│   │   │   ├── InterviewsPage.tsx
│   │   │   ├── InterviewDetailPage.tsx
│   │   │   ├── PublicInterviewPage.tsx   # Vista pública para candidatos
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── api/                 # Clientes Axios por recurso
│   │   ├── store/
│   │   │   └── authStore.ts     # Estado global de autenticación (Zustand)
│   │   └── App.tsx
│   └── package.json
│
└── README.md
```

---

## 🚀 Cómo correr en desarrollo

### Prerequisitos

- Node.js 22+
- npm 9+

### 1. Backend

```bash
cd backend
npm install

# Crear archivo de variables de entorno
cp .env.example .env
# → Edita .env con tus valores (ver sección de variables de entorno)

# Iniciar en modo desarrollo (hot reload)
npm run dev
```

El servidor corre en `http://localhost:3001`. Las migraciones de SQLite se ejecutan automáticamente al iniciar.

**Opcional — poblar con datos de prueba:**
```bash
npm run seed
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

El cliente corre en `http://localhost:5173`.

---

## 🔑 Variables de entorno

### Backend — `backend/.env`

```env
# Obligatorias
JWT_SECRET=cambia_esto_por_un_secreto_seguro_de_al_menos_32_chars
OPENROUTER_API_KEY=sk-or-v1-...         # Obtén en https://openrouter.ai

# Opcionales (tienen valores por defecto)
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173      # Para configurar CORS
DATABASE_PATH=./data/hireai.db          # Ruta del archivo SQLite
```

> ⚠️ **Nunca** subas el `.env` al repositorio. Está incluido en `.gitignore`.

### Frontend — `frontend/.env` (opcional)

```env
VITE_API_URL=http://localhost:3001/api  # URL base del backend
```

---

## 📡 Endpoints principales de la API

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Registrar empresa + usuario admin |
| `POST` | `/api/auth/login` | Login → devuelve JWT |
| `GET` | `/api/auth/me` | Perfil del usuario autenticado |
| `POST` | `/api/auth/users` | Crear usuario adicional (admin) |

### Candidatos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/candidates` | Listar candidatos (filtros + paginación) |
| `POST` | `/api/candidates` | Crear candidato + upload CV (PDF) |
| `GET` | `/api/candidates/:id` | Detalle del candidato |
| `PATCH` | `/api/candidates/:id` | Actualizar status / notas |
| `DELETE` | `/api/candidates/:id` | Eliminar candidato |
| `GET` | `/api/candidates/export/csv` | Exportar lista a CSV |

### Posiciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/positions` | Listar vacantes con conteo de candidatos |
| `POST` | `/api/positions` | Crear vacante |
| `GET` | `/api/positions/:id` | Detalle de vacante |
| `PATCH` | `/api/positions/:id` | Actualizar vacante |
| `DELETE` | `/api/positions/:id` | Eliminar vacante |

### Entrevistas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/interviews` | Listar todas las entrevistas |
| `POST` | `/api/interviews/generate` | Generar entrevista con IA para un candidato |
| `GET` | `/api/interviews/:id` | Detalle de entrevista |
| `GET` | `/api/interviews/public/:token` | Vista pública (sin auth) — para candidato |
| `POST` | `/api/interviews/respond` | Candidato envía respuestas (token) |
| `POST` | `/api/interviews/:id/evaluate` | Evaluar entrevista completa con IA |
| `DELETE` | `/api/interviews/:id` | Eliminar entrevista |

### Analytics

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/analytics/overview` | KPIs globales de la empresa |
| `GET` | `/api/analytics/candidates-by-status` | Distribución de candidatos por estado |
| `GET` | `/api/analytics/interviews-over-time` | Entrevistas por período |
| `GET` | `/api/analytics/top-positions` | Posiciones con más actividad |

### Salud

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check del servidor |

---

## 📸 Screenshots

> _Los screenshots se agregarán aquí cuando el proyecto esté en staging/producción._

| Pantalla | Preview |
|----------|---------|
| Dashboard analítico | `docs/screenshots/dashboard.png` |
| Lista de candidatos | `docs/screenshots/candidates.png` |
| Detalle de candidato + score CV | `docs/screenshots/candidate-detail.png` |
| Generador de entrevistas IA | `docs/screenshots/interview-generate.png` |
| Vista pública de entrevista | `docs/screenshots/public-interview.png` |
| Gestión de vacantes | `docs/screenshots/positions.png` |

---

## 📝 Notas de arquitectura

- **Base de datos:** SQLite vía `better-sqlite3` — ideal para deployments single-instance sin configuración extra
- **IA:** Toda la inteligencia artificial se gestiona vía [OpenRouter](https://openrouter.ai), lo que permite cambiar de modelo (GPT-4, Claude, Mistral, etc.) sin modificar código
- **Multi-tenant:** Cada empresa tiene su propio espacio de datos aislado por `company_id`
- **Entrevistas públicas:** Los links de entrevista usan tokens UUID de un solo uso con fecha de expiración; no requieren cuenta

---

## 📄 Licencia

MIT © 2025 HireAI

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
