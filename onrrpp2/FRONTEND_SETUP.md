# Configuración del Frontend

## Aplicación de Login con Shadcn/UI

Esta aplicación incluye un sistema de autenticación completo con Supabase, rutas protegidas y páginas separadas por rol.

## Características

- ✅ Login responsive con shadcn/ui
- ✅ Autenticación con Supabase Auth
- ✅ Páginas separadas por rol (Admin, RRPP, Seguridad)
- ✅ Rutas protegidas con React Router
- ✅ Estado global con Zustand
- ✅ Diseño responsive y dark mode
- ✅ Mensajes de "En desarrollo" para cada rol

## Estructura de Archivos Creados

```
src/
├── lib/
│   ├── supabase.ts                           # Cliente de Supabase
│   └── utils.ts                              # Utilidades (cn helper)
├── types/
│   └── database.ts                           # Tipos TypeScript
├── services/
│   └── auth.service.ts                       # Servicio de autenticación
├── stores/
│   └── auth.store.ts                         # Store de Zustand para auth
├── components/
│   ├── ui/                                   # Componentes de shadcn (ya existentes)
│   ├── organisms/
│   │   ├── DashboardLayout.tsx              # Layout del dashboard
│   │   └── ProtectedRoute.tsx               # Componente de ruta protegida
│   └── pages/
│       ├── LoginPage.tsx                     # Página de login
│       ├── DashboardRouter.tsx               # Router por rol
│       ├── AdminDashboard.tsx                # Dashboard de Admin
│       ├── RRPPDashboard.tsx                 # Dashboard de RRPP
│       └── SeguridadDashboard.tsx            # Dashboard de Seguridad
└── App.tsx                                   # Router principal

```

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

### 2. Obtener Credenciales de Supabase

1. Ve a tu proyecto en https://app.supabase.com
2. Ve a Settings > API
3. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 3. Instalar Dependencias (si no lo hiciste)

```bash
npm install
```

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

## Uso

### Login

1. Abre http://localhost:5173
2. Serás redirigido a `/login`
3. Ingresa tus credenciales:
   - Email del usuario registrado en Supabase Auth
   - Contraseña

### Flujo de Autenticación

1. El usuario ingresa email y contraseña
2. Se valida contra Supabase Auth
3. Se obtienen los datos del personal desde la tabla `personal`
4. Se verifica que el usuario esté activo
5. Se redirige al dashboard correspondiente según el rol

### Dashboards por Rol

#### Admin
- Ruta: `/dashboard` (si el usuario es admin)
- Color: Morado
- Muestra: "Panel de Administrador - En desarrollo"

#### RRPP
- Ruta: `/dashboard` (si el usuario es rrpp)
- Color: Azul
- Muestra: "Panel de RRPP - En desarrollo"

#### Seguridad
- Ruta: `/dashboard` (si el usuario es seguridad)
- Color: Verde
- Muestra: "Panel de Seguridad - En desarrollo"

## Componentes Principales

### LoginPage
- Formulario responsive de login
- Validación de campos
- Mensajes de error
- Loading state con spinner

### DashboardLayout
- Header con información del usuario
- Badge con el rol del usuario
- Nombre, apellido y club del usuario
- Botón de logout
- Responsive en mobile y desktop

### ProtectedRoute
- Verifica si el usuario está autenticado
- Redirige a `/login` si no está autenticado
- Puede validar roles específicos
- Muestra loading mientras inicializa

### DashboardRouter
- Redirige al dashboard correcto según el rol
- Admin → AdminDashboard
- RRPP → RRPPDashboard
- Seguridad → SeguridadDashboard

## Seguridad

- ✅ Rutas protegidas con autenticación
- ✅ Validación de roles en el backend (RLS de Supabase)
- ✅ Session management automático
- ✅ Tokens seguros (manejados por Supabase)

## Responsive Design

La aplicación es completamente responsive:

- **Mobile**: Menú colapsado, información resumida
- **Tablet**: Layout optimizado
- **Desktop**: Vista completa con toda la información

## Dark Mode

Todos los componentes soportan dark mode automáticamente gracias a Tailwind CSS.

## Próximos Pasos

Para agregar funcionalidad a cada dashboard:

1. Edita `src/components/pages/AdminDashboard.tsx` para admin
2. Edita `src/components/pages/RRPPDashboard.tsx` para RRPP
3. Edita `src/components/pages/SeguridadDashboard.tsx` para seguridad

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env` existe
- Verifica que las variables tienen el prefijo `VITE_`
- Reinicia el servidor de desarrollo

### Error: "Personal no encontrado"
- Verifica que el usuario existe en la tabla `personal`
- Verifica que el `id` del personal coincide con el `id` de auth.users
- Verifica que el usuario esté activo (`activo = true`)

### Error: "Usuario inactivo"
- El usuario tiene `activo = false` en la tabla `personal`
- Actualiza el registro en la base de datos

### No redirige al dashboard después del login
- Abre las DevTools (F12)
- Ve a la consola y busca errores
- Verifica que el usuario tiene un `rol` válido

## Testing

Para probar la aplicación necesitas crear usuarios de prueba:

```sql
-- 1. Crear usuario en Supabase Auth Dashboard
-- 2. Insertar en la tabla personal

INSERT INTO personal (id, nombre, apellido, edad, sexo, ubicacion, rol, uuid_club, activo)
VALUES (
  'auth-user-uuid-aqui',
  'Test',
  'User',
  30,
  'hombre',
  'Buenos Aires',
  'admin',
  'uuid-del-club',
  true
);
```

## Stack Tecnológico

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase
- **Auth**: Supabase Auth
- **Forms**: React Hook Form (opcional, no usado aún)
- **Validation**: Zod (opcional, no usado aún)
