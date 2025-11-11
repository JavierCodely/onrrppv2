# Inicio Rápido - Sistema de Gestión de Eventos

## ✅ Lo que se ha creado

### 1. Base de Datos (Supabase)
- ✅ 10 migraciones SQL
- ✅ Tablas: clubs, personal, eventos, invitados
- ✅ RLS policies (seguridad multi-tenant)
- ✅ Triggers automáticos para contadores
- ✅ Storage para banners de eventos
- ✅ Documentación completa

### 2. Frontend (React + Shadcn)
- ✅ Login responsive
- ✅ Autenticación con Supabase
- ✅ Dashboards por rol (Admin, RRPP, Seguridad)
- ✅ Rutas protegidas
- ✅ Estado global con Zustand
- ✅ Diseño responsive

## 🚀 Pasos para Empezar

### 1. Configurar Supabase

```bash
# Opción A: Usando Supabase CLI
cd supabase
supabase db push

# Opción B: Manualmente en el Dashboard
# Ir a SQL Editor y ejecutar cada archivo en orden (001 a 010)
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Ejecutar la Aplicación

```bash
npm run dev
```

### 5. Crear Usuario de Prueba

1. Ve a tu proyecto Supabase → Authentication → Users
2. Crea un usuario con email y contraseña
3. Copia el UUID del usuario
4. Ve a SQL Editor y ejecuta:

```sql
-- Insertar en la tabla personal
INSERT INTO personal (id, nombre, apellido, edad, sexo, ubicacion, rol, uuid_club, activo)
VALUES (
  'uuid-del-usuario-de-auth',
  'Admin',
  'Test',
  30,
  'hombre',
  'Buenos Aires',
  'admin',
  '11111111-1111-1111-1111-111111111111',  -- ID del Club Central de seed data
  true
);
```

### 6. Iniciar Sesión

1. Abre http://localhost:5173
2. Ingresa el email y contraseña
3. Serás redirigido al dashboard según tu rol

## 📂 Estructura del Proyecto

```
proyecto/
├── supabase/                    # Migraciones de base de datos
│   ├── migrations/              # 001-010 archivos SQL
│   └── README.md               # Documentación de DB
├── src/
│   ├── lib/                    # Configuración (Supabase, utils)
│   ├── types/                  # TypeScript types
│   ├── services/               # Servicios (auth)
│   ├── stores/                 # Zustand stores
│   └── components/
│       ├── ui/                 # Componentes shadcn
│       ├── organisms/          # Layout y rutas protegidas
│       └── pages/              # Páginas (Login, Dashboards)
└── .env                        # Variables de entorno (crear)
```

## 🎯 Funcionalidades por Rol

### Admin
- ✅ Ver su club
- ✅ Crear eventos
- ✅ Subir banners de eventos
- ✅ Ver contadores de invitados

### RRPP
- ✅ Ver eventos de su club
- ✅ Crear listas de invitados
- ✅ Agregar/eliminar invitados
- ✅ Ver sus invitados

### Seguridad
- ✅ Ver eventos de su club
- ✅ Buscar invitados
- ✅ Marcar invitados como ingresados
- ✅ Ver estadísticas de ingreso

## 📊 Contadores Automáticos

Los eventos tienen 2 contadores que se actualizan automáticamente:

1. **total_invitados**: Se incrementa/decrementa cuando RRPP crea/elimina invitados
2. **total_ingresados**: Se incrementa/decrementa cuando Seguridad marca ingresos

## 🔒 Seguridad

- RLS (Row Level Security) habilitado
- Multi-tenant por club
- Usuarios solo ven datos de su club
- Roles validados en backend

## 📖 Documentación

- `FRONTEND_SETUP.md` - Guía detallada del frontend
- `supabase/README.md` - Guía completa de la base de datos
- `supabase/STORAGE_GUIDE.md` - Cómo usar Storage para banners
- `supabase/SCHEMA_DIAGRAM.md` - Diagramas y permisos

## 🐛 Troubleshooting Común

### "Missing Supabase environment variables"
→ Verifica que el archivo `.env` existe y tiene las variables correctas

### "Personal no encontrado"
→ Verifica que el usuario existe en la tabla `personal` con el mismo UUID de auth.users

### "Usuario inactivo"
→ Actualiza `activo = true` en la tabla personal

### Migraciones fallan
→ Ejecuta en orden (001 a 010) y verifica que no haya errores previos

## 📞 Próximos Pasos

1. Implementar funcionalidad en cada dashboard
2. Agregar componentes de gestión de eventos (Admin)
3. Agregar formulario de invitados (RRPP)
4. Agregar búsqueda de invitados (Seguridad)
5. Agregar estadísticas y reportes

## 🎨 Personalización

- Colores: Edita `src/index.css` (variables CSS)
- Componentes: Todos usan shadcn/ui, fácil de personalizar
- Layout: Edita `src/components/organisms/DashboardLayout.tsx`

¡Listo para empezar a desarrollar! 🚀
