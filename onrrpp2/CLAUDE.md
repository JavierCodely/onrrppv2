# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant event management platform with role-based access control (Admin, RRPP, Seguridad). Built with React + TypeScript + Vite frontend and Supabase PostgreSQL backend with Row Level Security (RLS).

## Development Commands

### Frontend
- `npm run dev` - Start Vite dev server (http://localhost:5173)
- `npm run build` - TypeScript compile + production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Database Migrations
- Execute migrations in order: `supabase/migrations/001_*.sql` through `010_*.sql`
- Use Supabase CLI: `supabase db push` (from supabase directory)
- Or manually via Supabase Dashboard SQL Editor

## Architecture

### Multi-Tenant Design
- **Isolation Key**: `uuid_club` - Every data access filtered by user's club
- **RLS Functions**: 
  - `get_current_user_club()` - Returns authenticated user's club UUID
  - `get_current_user_role()` - Returns user's role enum
- **Critical**: All queries MUST respect club isolation via RLS policies

### Authentication Flow
1. Supabase Auth handles login (email/password)
2. `auth.service.ts` fetches user → personal table → club data
3. Zustand store (`auth.store.ts`) manages session state
4. `ProtectedRoute` component guards all authenticated routes
5. `DashboardRouter` redirects to role-specific dashboard

### Database Schema
**Core Tables** (see `supabase/README.md` for full schema):
- `clubs` - Tenant root, all data cascades from here
- `personal` - User profiles (id references auth.users), includes rol enum
- `eventos` - Events with auto-counters: `total_invitados`, `total_ingresados`
- `invitados` - Guest lists per event

**Auto-Increment Triggers**:
- `total_invitados`: +1 on INSERT, -1 on DELETE (invitados table)
- `total_ingresados`: +1 when `ingresado` → true, -1 when → false or DELETE

**Critical Constraints**:
- `personal.id` MUST match `auth.users.id` (FK to Supabase Auth)
- `invitados.dni` unique per event (not globally)
- All tables have `updated_at` trigger

### Role Permissions (enforced by RLS)
**Admin**:
- Create/update/delete eventos for their club
- View all invitados in club's events
- Cannot manage invitados directly

**RRPP**:
- View eventos in their club
- Create/update/delete their own invitados
- Cannot modify `ingresado` status

**Seguridad**:
- View eventos and invitados in their club
- Update ONLY `ingresado` and `fecha_ingreso` fields
- Cannot create/delete invitados

### State Management
- **Zustand** for auth state (`useAuthStore`)
- Store persists: user object (personal + club data)
- No global state for domain data - fetch directly from Supabase with RLS

### Component Structure
- **Atomic Design** directories: `atoms/`, `molecules/`, `organisms/`, `pages/`, `templates/`
- **shadcn/ui** components in `components/ui/` (pre-installed, full suite)
- Use `cn()` utility from `lib/utils.ts` for className merging

## Configuration

### Required Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### Styling
- Tailwind CSS v3 (NOT v4 - causes build issues)
- CSS variables in `src/index.css` for theming
- Dark mode via `.dark` class (next-themes installed)

## Database Migrations Execution Order
1. `001_create_enums.sql` - user_role, sexo_type enums
2. `002_create_clubs.sql` - Tenant root table
3. `003_create_personal.sql` - User profiles + auth integration
4. `004_create_eventos.sql` - Events with banner_url, counters
5. `005_create_invitados.sql` - Guest lists
6. `006_create_functions.sql` - Helper functions for RLS
7. `007_create_rls_policies.sql` - Row Level Security policies
8. `008_create_triggers.sql` - Auto-increment triggers, validations
9. `009_seed_data.sql` - Sample clubs (optional)
10. `010_create_storage_buckets.sql` - Storage for event banners

## Testing Setup
Must create test user:
1. Create user in Supabase Auth Dashboard (get UUID)
2. Insert into personal table:
```sql
INSERT INTO personal (id, nombre, apellido, edad, sexo, ubicacion, rol, uuid_club, activo)
VALUES ('auth-uuid-here', 'Test', 'User', 30, 'hombre', 'Buenos Aires', 'admin', 'club-uuid', true);
```

## Common Issues

### "Personal no encontrado" error
- User exists in auth.users but NOT in personal table
- personal.id must EXACTLY match auth.users.id UUID

### Build fails with Tailwind
- Use Tailwind v3, NOT v4 (@tailwindcss/vite has compatibility issues)
- Config: `tailwind.config.js` + `postcss.config.js`

### RLS blocks queries unexpectedly
- Check `activo = true` on personal record
- Verify user's uuid_club matches queried data's uuid_club
- Test RLS functions in SQL Editor: `SELECT get_current_user_club()`

## File Locations

### Authentication
- Service: `src/services/auth.service.ts`
- Store: `src/stores/auth.store.ts`
- Protected routes: `src/components/organisms/ProtectedRoute.tsx`

### Database
- Schema docs: `supabase/README.md`
- RLS diagram: `supabase/SCHEMA_DIAGRAM.md`
- Storage guide: `supabase/STORAGE_GUIDE.md`

### Types
- Database types: `src/types/database.ts`
- All types use TypeScript interfaces matching DB schema

## Key Design Decisions

1. **No server-side routing** - Pure client-side React Router
2. **RLS over API** - Security enforced at database level, not application
3. **Zustand over Context** - Simpler auth state management
4. **shadcn/ui** - Headless components, full customization
5. **Tailwind v3** - v4 causes build errors with current setup
