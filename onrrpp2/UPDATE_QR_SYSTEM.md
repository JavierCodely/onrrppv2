# Sistema de QR para Invitados - Guía de Implementación

## Resumen de Cambios

Se ha implementado un sistema completo de gestión de invitados con códigos QR únicos:

- **RRPP**: Pueden crear invitados y generar QR únicos automáticamente
- **Seguridad**: Pueden escanear QR y marcar ingreso de invitados
- **QR Únicos**: Cada invitado recibe un código QR único de 12 caracteres

---

## 📁 Archivos Nuevos Creados

### Migraciones
- `supabase/migrations/update/001_add_qr_to_invitados.sql` - Agrega campo QR a invitados

### Servicios
- `src/services/invitados.service.ts` - CRUD de invitados y gestión de QR

### Layouts
- `src/components/organisms/RRPPLayout.tsx` - Layout para panel RRPP
- `src/components/organisms/SeguridadLayout.tsx` - Layout para panel Seguridad

### Páginas
- `src/components/pages/rrpp/InvitadosPage.tsx` - Gestión de invitados (RRPP)
- `src/components/pages/seguridad/ScannerPage.tsx` - Escáner de QR (Seguridad)

### Tipos Actualizados
- `src/types/database.ts` - Agregado campo `qr_code` a Invitado

---

## 🗄️ Migración de Base de Datos

### Paso 1: Aplicar Migración

Ejecuta la migración desde Supabase Dashboard o CLI:

```sql
-- Desde Supabase Dashboard: SQL Editor
-- Copia y ejecuta: supabase/migrations/update/001_add_qr_to_invitados.sql
```

O usando Supabase CLI:

```bash
cd supabase
supabase db push
```

### ¿Qué hace la migración?

1. **Agrega columna `qr_code`** a la tabla `invitados`
2. **Crea función `generate_unique_qr_code()`** que genera códigos alfanuméricos únicos
3. **Crea trigger** que genera automáticamente QR al insertar un invitado
4. **Genera QR** para invitados existentes (si los hay)
5. **Índice único** en `qr_code` para búsquedas rápidas

---

## 📦 Dependencias Instaladas

```bash
npm install qrcode.react html5-qrcode
```

- **qrcode.react**: Genera códigos QR visuales
- **html5-qrcode**: Escanea códigos QR usando la cámara

---

## 🎯 Funcionalidades por Rol

### RRPP (Relaciones Públicas)

**Panel:** `/dashboard/rrpp`

#### Gestión de Invitados
- ✅ Ver invitados propios por evento
- ✅ Crear nuevo invitado con datos:
  - Nombre, Apellido, DNI (requeridos)
  - Edad, Ubicación, Sexo (opcionales)
- ✅ QR generado automáticamente al crear
- ✅ Ver QR del invitado en cualquier momento
- ✅ Descargar QR como imagen PNG
- ✅ Editar datos del invitado
- ✅ Eliminar invitado
- ✅ Ver estado: Pendiente/Ingresado

#### Selector de Eventos
- Solo eventos activos disponibles
- Filtra invitados por evento seleccionado

#### Vista QR
- Muestra nombre y apellido del invitado
- QR descargable como imagen
- Tamaño: 256x256 píxeles
- Nivel de corrección: High (H)

---

### Seguridad

**Panel:** `/dashboard/seguridad`

#### Escáner de QR
- ✅ **Escaneo con cámara** (usa cámara trasera en móviles)
- ✅ **Búsqueda manual** por código QR
- ✅ Muestra información completa del invitado:
  - Nombre, Apellido, DNI
  - Edad, Ubicación
  - Quién lo invitó (RRPP)
  - Estado de ingreso

#### Gestión de Ingreso
- ✅ **Marcar ingreso** si está pendiente
- ✅ **Desmarcar ingreso** si ya ingresó (corrección)
- ✅ Registra fecha y hora de ingreso automáticamente
- ✅ Notificaciones visuales según estado

#### Estados
- 🟡 **Pendiente**: No ha ingresado aún
- 🟢 **Ingresado**: Ya marcado como ingresado

---

## 🔐 Seguridad y RLS

### Políticas Implementadas (ya existentes)

**RRPP:**
- Ver sus propios invitados
- Crear invitados en eventos de su club
- Editar/eliminar solo sus invitados
- NO pueden modificar `ingresado`

**Seguridad:**
- Ver invitados de su club
- Actualizar SOLO campos `ingresado` y `fecha_ingreso`
- NO pueden crear/eliminar invitados

**Admin:**
- Ver todos los invitados de su club
- NO puede crear/editar invitados directamente

---

## 📱 Uso en Producción

### Para RRPP

1. **Iniciar sesión** como usuario RRPP
2. **Seleccionar evento** del dropdown
3. **Crear invitado:**
   - Click en "Nuevo Invitado"
   - Completar formulario
   - Al guardar, se muestra el QR automáticamente
4. **Compartir QR:**
   - Click en botón QR del invitado
   - Descargar imagen o compartir pantalla

### Para Seguridad

1. **Iniciar sesión** como usuario Seguridad
2. **Escanear QR:**
   - Click en "Iniciar Escáner"
   - Permitir acceso a cámara
   - Apuntar a código QR del invitado
3. **Verificar datos** del invitado mostrados
4. **Marcar ingreso** con botón verde

**Alternativa - Búsqueda Manual:**
- Ingresar código de 12 caracteres manualmente
- Útil si QR no escanea correctamente

---

## 🧪 Testing

### Crear Usuario de Prueba RRPP

```sql
-- 1. Crear usuario en Supabase Auth Dashboard
-- 2. Obtener el UUID del usuario
-- 3. Insertar en personal:

INSERT INTO personal (id, nombre, apellido, sexo, rol, uuid_club, activo)
VALUES (
  'uuid-del-usuario-auth',
  'Juan',
  'Pérez',
  'hombre',
  'rrpp',
  'uuid-del-club',
  true
);
```

### Crear Usuario de Prueba Seguridad

```sql
INSERT INTO personal (id, nombre, apellido, sexo, rol, uuid_club, activo)
VALUES (
  'uuid-del-usuario-auth',
  'María',
  'González',
  'mujer',
  'seguridad',
  'uuid-del-club',
  true
);
```

### Flujo de Prueba Completo

1. **Login como RRPP** → Crear invitado → Ver QR generado
2. **Login como Seguridad** → Escanear/buscar QR → Marcar ingreso
3. **Login como RRPP** → Verificar que invitado aparece como "Ingresado"

---

## 🔧 Formato del Código QR

- **Longitud:** 12 caracteres
- **Formato:** Alfanumérico mayúsculas (A-Z, 0-9)
- **Ejemplo:** `A3F5D9B2C8E1`
- **Único:** Garantizado por constraint UNIQUE en BD
- **Generación:** Automática via trigger SQL

---

## 📊 Contadores Automáticos

Los contadores en la tabla `eventos` se actualizan automáticamente:

- `total_invitados`: Se incrementa al crear invitado
- `total_ingresados`: Se incrementa al marcar ingreso

Estos triggers ya existían en la BD.

---

## 🐛 Troubleshooting

### "No se puede acceder a la cámara"
- Verificar permisos del navegador
- Usar HTTPS en producción
- Usar búsqueda manual como alternativa

### "QR no válido"
- Verificar que el QR fue generado por el sistema
- Usar búsqueda manual ingresando código
- Verificar que el invitado no fue eliminado

### "Personal no encontrado"
- El usuario existe en auth.users pero no en personal
- Ejecutar INSERT en personal (ver sección Testing)

---

## 🚀 Comandos Útiles

```bash
# Ejecutar en desarrollo
cd onrrpp2
npm run dev

# Compilar para producción
npm run build

# Aplicar migraciones (si usas Supabase CLI)
cd supabase
supabase db push
```

---

## 📝 Notas Importantes

1. **QR Únicos:** Cada invitado tiene un QR diferente, incluso si se elimina y recrea
2. **No Reutilizables:** Los QR eliminados no se reutilizan (constraint UNIQUE)
3. **Offline:** El escáner requiere conexión para validar QR contra BD
4. **Permisos Cámara:** Seguridad necesita permisos de cámara en el navegador
5. **RLS Activo:** Todas las consultas respetan el club del usuario

---

## ✅ Build Exitoso

```
✓ 2738 modules transformed
✓ built in 1m 33s
```

La aplicación está lista para ejecutarse en desarrollo o producción.
