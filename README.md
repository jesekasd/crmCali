# CalisTrack SaaS

CRM para entrenadores de calistenia construido con stack moderno y low-cost:

- Next.js + React + Tailwind CSS
- Supabase (PostgreSQL + Auth + API + Storage)
- Vercel para despliegue

## Arquitectura

```txt
Usuario
  -> Next.js frontend (App Router)
  -> API Routes / Server Components
  -> Supabase (Auth + Postgres + Storage)
```

## Módulos MVP

- `dashboard`: alumnos activos, ingresos del mes, progreso reciente
- `students`: CRUD de alumnos
- `workouts`: creación de rutinas + asignación
- `progress`: registro de métricas (dominadas, flexiones, muscle up, handstand)
- `payments`: registro y control de pagos

## Estructura

```txt
app/
  (auth)/login
  (app)/dashboard
  (app)/students
  (app)/workouts
  (app)/progress
  (app)/payments
  api/
components/
  StudentCard.tsx
  ProgressChart.tsx
  WorkoutEditor.tsx
  PaymentTable.tsx
lib/supabase/
supabase/schema.sql
```

## Setup local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env.local` desde `.env.example` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# IMPORTANT: never expose SUPABASE_SERVICE_ROLE_KEY in frontend code.
```

3. En Supabase SQL Editor ejecuta:

```sql
-- copy/paste de supabase/schema.sql
```

4. Levanta desarrollo:

```bash
npm run dev
```

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático por cada push.

## Buenas prácticas de escalado incluidas

- App Router con separación clara por dominio.
- Tipado estricto TypeScript.
- Políticas RLS por coach en todas las tablas críticas.
- API routes para encapsular reglas de negocio.
- Componentes desacoplados y reutilizables.
