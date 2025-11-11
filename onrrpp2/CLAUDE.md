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
- Execute migrations in numerical order via Supabase Dashboard SQL Editor
- Core migrations: `001` through `010` (schema setup)
- Feature migrations: `011+` (realtime, storage, ubicaciones, RLS fixes, triggers)
- **Critical**: Always run migrations in order to avoid dependency issues

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
- `invitados` - Guest lists per event with `departamento`, `localidad` (not `ubicacion`)
- `lotes` - Ticket batches per event with `es_vip` flag
- `ventas` - Sales tracking (optional, may not exist in all deployments)
- `ubicaciones` - Department/locality catalog for Argentina
- `eventos_rrpp_stats` - View showing RRPP-specific stats per event

**Auto-Increment Triggers** (with `SECURITY DEFINER`):
- `increment_total_invitados()` - +1 on INSERT to invitados
- `decrement_total_invitados()` - -1 on DELETE from invitados
- `update_total_ingresados()` - Tracks ingresado state changes
- `handle_delete_ingresado()` - Decrements counter on delete if was ingresado
- `prevent_delete_ingresados()` - BLOCKS deletion of invitados who already entered

**Critical Constraints**:
- `personal.id` MUST match `auth.users.id` (FK to Supabase Auth)
- `invitados.dni` unique per event (not globally)
- **Cannot delete** invitados where `ingresado = true`
- VIP invitados require `profile_image_url`
- All tables have `updated_at` trigger

### Role Permissions (enforced by RLS)
**Admin**:
- Create/update/delete eventos for their club
- View **total** invitados/ingresados across all RRPP
- Manage lotes (ticket batches)
- Cannot manage invitados directly

**RRPP**:
- View eventos in their club (active only)
- Create/update/delete **their own** invitados only
- View **only their own** invitados/ingresados count via `eventos_rrpp_stats` view
- Cannot modify `ingresado` status or `fecha_ingreso`
- Cannot delete invitados who already entered (`ingresado = true`)

**Seguridad**:
- View eventos and invitados in their club
- Update ONLY `ingresado` and `fecha_ingreso` fields via QR scanner
- Cannot create/delete invitados
- Cannot modify any other invitado fields

### Realtime Features
**Supabase Realtime** is enabled for:
- `eventos` table - Admin sees live updates of `total_invitados` and `total_ingresados`
- `invitados` table - RRPP sees live updates when their invitados are scanned/modified

**Implementation Pattern**:
```typescript
// Admin: Listen to eventos UPDATE
supabase.channel('eventos-changes').on('postgres_changes', { event: 'UPDATE', table: 'eventos' }, ...)

// RRPP: Listen to ALL invitados changes, filter by id_rrpp
supabase.channel('invitados-rrpp').on('postgres_changes', { event: '*', table: 'invitados' }, ...)
```

**Critical**: Realtime requires `ALTER PUBLICATION supabase_realtime ADD TABLE eventos/invitados`

### State Management
- **Zustand** for auth state (`useAuthStore`)
- Store persists: user object (personal + club data)
- No global state for domain data - fetch directly from Supabase with RLS
- **Realtime subscriptions** update local state automatically

### Component Structure
- **Atomic Design** directories: `atoms/`, `molecules/`, `organisms/`, `pages/`, `templates/`
- **shadcn/ui** components in `components/ui/` (pre-installed, full suite)
- Use `cn()` utility from `lib/utils.ts` for className merging
- **Mobile-first dialogs**: Use `fixed bottom-5` for action buttons on mobile forms

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
- **Mobile utilities**: `.pb-safe` uses `env(safe-area-inset-bottom)` for notch support
- HTTPS required for camera access: `@vitejs/plugin-basic-ssl` configured

## Database Migrations Execution Order

### Core Schema (001-010)
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

### Feature Additions (011+)
- `011_enable_realtime.sql` / `018_verify_and_fix_realtime.sql` - Enable realtime on eventos/invitados
- `012_create_vip_profiles_storage.sql` - VIP profile images storage
- `013_create_ubicaciones.sql` - Argentina departments/localities catalog
- `014_update_invitados_ubicacion.sql` - Split ubicacion into departamento/localidad
- `020_add_rrpp_counters_view.sql` - Create `eventos_rrpp_stats` view for RRPP stats
- `021_prevent_delete_ingresados.sql` - Block deletion of checked-in invitados
- `024_recreate_trigger_functions.sql` - Fix trigger functions with SECURITY DEFINER

**Troubleshooting migrations**:
- `019_recalculate_counters.sql` - Manually recalculate event counters
- `023_force_recalculate_now.sql` - Debug counter issues

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

### Counters not updating (total_invitados/total_ingresados)
1. **Verify triggers exist**: Query `information_schema.triggers` for `increment_total_invitados_trigger`, etc.
2. **Check trigger functions**: Functions must have `SECURITY DEFINER` to work with RLS
3. **Recalculate manually**: Run migration `023_force_recalculate_now.sql`
4. **Enable realtime**: Run `ALTER PUBLICATION supabase_realtime ADD TABLE eventos`
5. **Check console logs**: Look for `📡 Realtime UPDATE recibido` messages

### Camera not working on mobile
- Vite must run with HTTPS: `@vitejs/plugin-basic-ssl` is required
- Browser must have camera permissions granted
- Check console for "getUserMedia" errors

### QR Scanner detecting multiple times
- Use `useRef` instead of `useState` for processing flags
- Pattern: `isProcessingRef.current = true` for immediate synchronous check
- Add countdown delay before re-enabling scanner

## File Locations

### Authentication
- Service: `src/services/auth.service.ts`
- Store: `src/stores/auth.store.ts`
- Protected routes: `src/components/organisms/ProtectedRoute.tsx`

### Core Services
- `src/services/eventos.service.ts` - Events CRUD + `getEventosRRPPStats()` for RRPP view
- `src/services/invitados.service.ts` - Invitados CRUD + image upload for VIP
- `src/services/lotes.service.ts` - Ticket batch management
- `src/services/ubicaciones.service.ts` - Argentina departments/localities autocomplete
- `src/services/storage.service.ts` - Supabase Storage abstraction

### Key Pages
- `src/components/pages/admin/EventosPage.tsx` - Admin events with realtime total counters
- `src/components/pages/rrpp/EventosRRPPPage.tsx` - RRPP events with personal counters
- `src/components/pages/rrpp/InvitadosPage.tsx` - RRPP invitados management (VIP support)
- `src/components/pages/seguridad/ScannerPage.tsx` - QR scanner with realtime updates

### Database
- Schema docs: `supabase/README.md`
- Migrations: `supabase/migrations/*.sql` (execute in numerical order)

### Types
- Database types: `src/types/database.ts`
- All types use TypeScript interfaces matching DB schema

## Key Design Decisions

1. **No server-side routing** - Pure client-side React Router with role-based redirects
2. **RLS over API** - Security enforced at database level via PostgreSQL policies
3. **Zustand over Context** - Simpler auth state management, persisted to localStorage
4. **shadcn/ui** - Headless Radix UI components with full Tailwind customization
5. **Tailwind v3** - v4 causes build errors with current Vite setup
6. **Supabase Realtime** - Live counter updates instead of polling
7. **Multi-tenant isolation** - Every query filtered by `uuid_club` via RLS
8. **VIP vs Regular guests** - Separate workflows: VIP requires profile image, allows re-entry
9. **Mobile-first forms** - Fixed bottom buttons, safe-area support for notches
10. **QR Code scanner** - Html5Qrcode library with auto-start, continuous scanning
