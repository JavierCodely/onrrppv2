# Guía de Configuración de Seguridad

Esta guía te ayudará a configurar las nuevas características de seguridad de autenticación.

## 🚀 Inicio Rápido

### 1. Ejecutar Migración de Base de Datos

**Opción A: Supabase Dashboard (Recomendado)**
1. Ir a Supabase Dashboard → SQL Editor
2. Crear nueva query
3. Copiar contenido de `supabase/migrations/036_create_auth_logs.sql`
4. Ejecutar la query
5. Verificar que se creó la tabla: `SELECT * FROM auth_logs LIMIT 1;`

**Opción B: Supabase CLI**
```bash
supabase db push
```

### 2. Configurar Google reCAPTCHA

**Paso 1: Obtener Credenciales**
1. Ir a [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click en el botón **"+"** para crear un nuevo sitio
3. Configuración:
   - **Label**: Nombre de tu aplicación (ej: "ONRRPP Login")
   - **reCAPTCHA type**: Seleccionar **reCAPTCHA v2** → "I'm not a robot" Checkbox
   - **Domains**: Agregar tus dominios (ej: `localhost`, `tu-dominio.com`)
   - **Owners**: Tu email de Google
   - Aceptar términos de servicio
4. Click en **Submit**
5. Copiar el **Site Key** (NO el Secret Key)

**Paso 2: Configurar Variable de Entorno**

Crear o editar `.env.local` en la raíz del proyecto:

```env
# Supabase (ya existentes)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Google reCAPTCHA v2 (NUEVO)
VITE_RECAPTCHA_SITE_KEY=6LcxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXX
```

**⚠️ IMPORTANTE:**
- Usar el **Site Key**, NO el Secret Key
- NO commitear el archivo `.env.local` al repositorio
- El archivo `.env.example` ya está actualizado con la plantilla

### 3. Verificar Instalación

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install react-google-recaptcha @types/react-google-recaptcha
```

### 4. Iniciar Aplicación

```bash
npm run dev
```

## ✅ Verificación de Funcionamiento

### Probar Rate Limiting

1. Ir a la página de login: http://localhost:5173/login
2. Ingresar un email válido
3. Ingresar contraseña **incorrecta** 5 veces
4. Verificar:
   - ✅ Contador de intentos (1/5, 2/5, etc.)
   - ✅ Advertencia al llegar a 3+ intentos
   - ✅ Captcha aparece después del 5to intento
   - ✅ Bloqueo temporal con cuenta regresiva (5 minutos)

### Probar Persistencia del Bloqueo

1. Después de activar el bloqueo (5 intentos fallidos)
2. **Recargar la página** (F5 o Ctrl+R)
3. Verificar:
   - ✅ El bloqueo **persiste** después de recargar
   - ✅ El email bloqueado aparece pre-llenado
   - ✅ El contador regresivo continúa desde donde quedó
   - ✅ El formulario sigue deshabilitado
4. Abrir DevTools (F12) → Application → Local Storage
5. Verificar que existe la clave `auth_lockout` con datos del bloqueo

### Probar Logging de Auditoría

**Opción 1: Supabase Dashboard**
1. Ir a Supabase Dashboard → Table Editor
2. Seleccionar tabla `auth_logs`
3. Verificar que aparecen registros de tipo:
   - `login_failed` - Intentos fallidos
   - `login_success` - Login exitoso
   - `logout` - Cierre de sesión

**Opción 2: SQL Query**
```sql
-- Ver últimos 10 intentos de login
SELECT
  email,
  action,
  error_message,
  created_at
FROM auth_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Probar Botón de Ver Contraseña

1. En la página de login, escribir contraseña
2. Click en el ícono de ojo 👁️
3. Verificar que la contraseña se muestra
4. Click nuevamente para ocultar

## 🔧 Configuración Avanzada

### Personalizar Límites de Seguridad

Editar `src/components/pages/LoginPage.tsx`:

```typescript
const MAX_ATTEMPTS = 5           // Cambiar a 3 para más restrictivo
const LOCKOUT_DURATION = 300     // 300 seg = 5 min, cambiar a 600 para 10 min
```

### Cambiar Ventana de Tiempo para Intentos Fallidos

Editar `src/services/auth-logs.service.ts`:

```typescript
async getFailedLoginAttempts(email: string, minutes: number = 15)
// Cambiar 15 a 30 para ventana de 30 minutos
```

### Configurar Limpieza de Logs

Por defecto, los logs se mantienen 90 días. Para cambiar:

Editar `supabase/migrations/036_create_auth_logs.sql`:

```sql
-- Cambiar INTERVAL a 30, 60, 180 días, etc.
DELETE FROM public.auth_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

Ejecutar limpieza manual:
```sql
SELECT cleanup_old_auth_logs();
```

## 📊 Monitoreo y Análisis

### Consultas SQL Útiles

**Intentos fallidos por email (últimas 24h)**
```sql
SELECT
  email,
  COUNT(*) as intentos_fallidos,
  MAX(created_at) as ultimo_intento
FROM auth_logs
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
ORDER BY intentos_fallidos DESC;
```

**Emails más atacados (última semana)**
```sql
SELECT
  email,
  COUNT(*) as total_intentos
FROM auth_logs
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY email
HAVING COUNT(*) > 10
ORDER BY total_intentos DESC;
```

**Actividad de login por hora**
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hora,
  COUNT(*) as total_intentos,
  SUM(CASE WHEN action = 'login_success' THEN 1 ELSE 0 END) as exitosos,
  SUM(CASE WHEN action = 'login_failed' THEN 1 ELSE 0 END) as fallidos
FROM auth_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hora
ORDER BY hora DESC;
```

**Desbloquear usuario manualmente**
```sql
-- Eliminar intentos fallidos recientes
DELETE FROM auth_logs
WHERE email = 'usuario@example.com'
  AND action = 'login_failed'
  AND created_at > NOW() - INTERVAL '15 minutes';
```

## 🛡️ Mejores Prácticas de Seguridad

### 1. Configuración de Supabase

**Authentication Settings** (Supabase Dashboard → Authentication → Settings):

- ✅ **Enable Email Confirmations**: Requiere verificación de email
- ✅ **Secure Password**: Mínimo 12 caracteres, combinación de letras/números/símbolos
- ✅ **Session Timeout**: 1 hora (3600 segundos)
- ✅ **Enable Multi-Factor Authentication (MFA)**: Si está disponible

### 2. Configuración de Producción

**Variables de Entorno**:
```env
# Producción - Usar dominio real
VITE_RECAPTCHA_SITE_KEY=tu-site-key-de-produccion
```

**Google reCAPTCHA**:
- Crear un Site Key separado para producción
- Agregar solo dominios de producción (sin `localhost`)
- Configurar notificaciones de alertas

### 3. Configurar CORS en Supabase

Supabase Dashboard → Settings → API:
- Agregar solo dominios permitidos en **Site URL**
- NO usar `*` (wildcard) en producción

### 4. Habilitar HTTPS

Para desarrollo local con cámara (QR scanner):
```bash
npm run dev  # Ya está configurado con @vitejs/plugin-basic-ssl
```

## 🐛 Troubleshooting

### Error: "Cannot read properties of undefined (reading 'reCAPTCHA')"

**Causa**: Variable de entorno no configurada o mal escrita

**Solución**:
1. Verificar `.env.local` existe y tiene `VITE_RECAPTCHA_SITE_KEY=...`
2. Reiniciar servidor de desarrollo: `Ctrl+C` → `npm run dev`
3. Limpiar caché: `rm -rf node_modules/.vite`

### Error: "Table 'auth_logs' does not exist"

**Causa**: Migración no ejecutada

**Solución**:
1. Ir a Supabase Dashboard → SQL Editor
2. Ejecutar migración `036_create_auth_logs.sql`
3. Verificar: `SELECT * FROM auth_logs;`

### Captcha no aparece

**Causa**: Dominio no autorizado en Google reCAPTCHA

**Solución**:
1. Ir a [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Editar tu sitio → Domains
3. Agregar `localhost` (para desarrollo)
4. Agregar tu dominio de producción

### Usuario bloqueado permanentemente

**Causa**: Intentos fallidos en últimos 15 minutos

**Solución temporal**:
```sql
-- Eliminar intentos fallidos del email específico
DELETE FROM auth_logs
WHERE email = 'usuario@example.com'
  AND action = 'login_failed';
```

**Solución permanente**:
- El bloqueo expira automáticamente después de 5 minutos
- Usuario debe esperar o admin debe limpiar logs

### Bloqueo persiste después de expirar

**Causa**: localStorage corrupto o desincronizado

**Solución**:
1. Abrir DevTools (F12) → Console
2. Ejecutar: `localStorage.removeItem('auth_lockout')`
3. Recargar página (F5)

O borrar todo localStorage:
```javascript
localStorage.clear()
```

### El bloqueo NO persiste al recargar (bug)

**Causa**: localStorage deshabilitado o en modo incógnito estricto

**Solución**:
1. Verificar que el navegador permite localStorage
2. No usar modo incógnito con restricciones estrictas
3. Verificar en DevTools → Console:
```javascript
// Debe retornar 'test'
localStorage.setItem('test', 'test')
localStorage.getItem('test')
```

## 📚 Documentación Adicional

- **Seguridad completa**: Ver `SECURITY.md`
- **Arquitectura del proyecto**: Ver `CLAUDE.md`
- **Schema de base de datos**: Ver `supabase/README.md`

## 🔐 Reporte de Vulnerabilidades

Si encuentras un problema de seguridad, por favor NO lo reportes públicamente.

Contactar al administrador del sistema directamente.

## ✨ Características Implementadas

- ✅ Tabla `auth_logs` con auditoría completa
- ✅ Rate limiting (5 intentos / 15 minutos)
- ✅ Bloqueo temporal (5 minutos)
- ✅ **Persistencia de bloqueo en localStorage** - No se puede bypassear recargando
- ✅ Google reCAPTCHA v2
- ✅ Botón mostrar/ocultar contraseña
- ✅ Indicadores visuales de intentos
- ✅ Cuenta regresiva de bloqueo
- ✅ Logging automático (success/failed/logout)
- ✅ Políticas RLS (solo admins ven logs)
- ✅ Funciones SQL para consultas
- ✅ Validación doble (React state + localStorage)

## 📞 Soporte

¿Necesitas ayuda? Consulta:
1. `SECURITY.md` - Guía completa de seguridad
2. `CLAUDE.md` - Arquitectura y troubleshooting
3. Supabase Logs: Dashboard → Database → Logs
