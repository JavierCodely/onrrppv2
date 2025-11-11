# Fix: Validación de Capacidad de Lotes

## Problema Identificado

El sistema permitía crear más invitados de los permitidos por la cantidad máxima del lote. Esto ocurría porque:

1. **Trigger defectuoso**: El trigger `increment_lote_cantidad()` incrementaba la cantidad ANTES de verificar si había espacio disponible
2. **Orden de operaciones incorrecto**:
   ```sql
   -- INCORRECTO (antes)
   1. UPDATE cantidad_actual = cantidad_actual + 1
   2. IF cantidad_actual >= cantidad_maxima THEN RAISE EXCEPTION
   ```

   Debería ser:
   ```sql
   -- CORRECTO (ahora)
   1. IF cantidad_actual >= cantidad_maxima THEN RAISE EXCEPTION
   2. UPDATE cantidad_actual = cantidad_actual + 1
   ```

3. **Frontend no actualizaba disponibilidad**: Después de crear/eliminar invitados, no se recargaban los lotes, mostrando información desactualizada.

## Solución Implementada

### 1. Base de Datos (Migración 004)

**Archivo**: `supabase/migrations/update/004_fix_lote_triggers.sql`

**Cambios**:
- ✅ Reescritura completa de `increment_lote_cantidad()`
- ✅ Reescritura completa de `update_lote_cantidad()`
- ✅ Verificación de capacidad ANTES de incrementar
- ✅ Mensajes de error mejorados con nombre del lote y disponibilidad
- ✅ Validación de existencia del lote

**Lógica nueva**:
```sql
1. Obtener datos actuales del lote (cantidad_actual, cantidad_maxima)
2. Verificar que el lote existe
3. Verificar si hay espacio: cantidad_actual < cantidad_maxima
4. Si NO hay espacio → Lanzar excepción con mensaje claro
5. Si SÍ hay espacio → Incrementar cantidad_actual
```

### 2. Frontend (InvitadosPage.tsx)

**Cambios**:
- ✅ Recarga automática de lotes después de **crear** invitado
- ✅ Recarga automática de lotes después de **eliminar** invitado
- ✅ Recarga automática de lotes después de **actualizar** invitado (si cambió de lote)
- ✅ Manejo mejorado de errores con detección de "lote completo"
- ✅ Toast específico cuando un lote está lleno

**Flujo actualizado**:
```typescript
// Al CREAR invitado:
1. Validar campos de pago (si aplica)
2. Intentar crear invitado
3. Si error "completo" → Toast "Lote completo" + recargar lotes
4. Si éxito → Crear venta (si aplica) + recargar invitados + recargar lotes

// Al ACTUALIZAR invitado:
1. Intentar actualizar
2. Si error "completo" → Toast "Lote completo" + recargar lotes
3. Si éxito y cambió de lote → Recargar lotes

// Al ELIMINAR invitado:
1. Eliminar invitado
2. Si éxito → Recargar invitados + recargar lotes (libera espacio)
```

## Aplicar la Solución

### Paso 1: Aplicar Migración SQL

**Opción A - Supabase CLI**:
```bash
cd supabase
supabase db push
```

**Opción B - Supabase Dashboard**:
1. Ve a SQL Editor en Supabase Dashboard
2. Copia el contenido de `supabase/migrations/update/004_fix_lote_triggers.sql`
3. Pégalo y ejecuta

**Opción C - Ejecutar archivo específico**:
```bash
# Desde la raíz del proyecto
psql <your-connection-string> -f supabase/migrations/update/004_fix_lote_triggers.sql
```

### Paso 2: Verificar Frontend

El frontend ya fue actualizado. Solo asegúrate de que tu aplicación esté corriendo la última versión:

```bash
npm run dev
```

## Cómo Probar

### Test 1: Lote con límite

1. Crea un lote con `cantidad_maxima = 3`
2. Crea 3 invitados en ese lote
3. Intenta crear un 4to invitado en el mismo lote
4. **Resultado esperado**:
   - Error: "El lote XXX está completo. Disponibles: 0/3"
   - Toast rojo: "Lote completo"
   - El lote se marca como lleno y se deshabilita en el selector

### Test 2: Lote se libera al eliminar

1. Con el lote lleno del test anterior (3/3)
2. Elimina un invitado
3. Verifica que `cantidad_actual` baje a 2
4. **Resultado esperado**:
   - Toast verde: "Invitado eliminado correctamente"
   - El lote vuelve a aparecer como disponible (2/3)
   - Puedes crear otro invitado

### Test 3: Cambiar de lote

1. Crea lote A (3/3 lleno) y lote B (0/5 vacío)
2. Edita un invitado del lote A
3. Intenta cambiarlo al lote B
4. **Resultado esperado**:
   - Se mueve correctamente
   - Lote A: 2/3 (se libera un espacio)
   - Lote B: 1/5 (se ocupa un espacio)
   - Ambos selectores se actualizan correctamente

### Test 4: Concurrencia (opcional, avanzado)

1. Abre dos pestañas del navegador
2. En ambas, carga un evento con un lote de capacidad 5 con 4 invitados (4/5)
3. Intenta crear un invitado en ambas pestañas AL MISMO TIEMPO
4. **Resultado esperado**:
   - Solo una de las dos creaciones tendrá éxito
   - La otra mostrará "Lote completo"
   - El trigger a nivel de BD maneja la concurrencia correctamente

## Validaciones Implementadas

### A nivel de Base de Datos (Crítico)

✅ **Validación atómica**: El trigger usa una transacción, por lo que la verificación e incremento son atómicos
✅ **Verificación pre-incremento**: No se puede superar la capacidad máxima
✅ **Manejo de concurrencia**: Múltiples inserts simultáneos se manejan correctamente
✅ **Rollback automático**: Si el lote está lleno, la transacción se revierte completamente

### A nivel de Frontend (UX)

✅ **Filtrado de lotes llenos**: `getLotesDisponiblesByEvento()` solo muestra lotes con espacio
✅ **Deshabilitación en UI**: Lotes llenos aparecen deshabilitados en el selector
✅ **Actualización en tiempo real**: Los lotes se recargan después de cada operación
✅ **Mensajes claros**: Errores específicos cuando un lote está completo

## Casos Edge Cubiertos

| Escenario | Comportamiento |
|-----------|---------------|
| Lote exactamente lleno (100/100) | ❌ No permite más inserts |
| Eliminar invitado de lote lleno | ✅ Libera espacio (99/100) |
| Cambiar invitado de lote A a B | ✅ A: -1, B: +1 |
| Cambiar a lote lleno | ❌ Bloquea cambio |
| Crear invitado sin lote | ✅ Permitido (uuid_lote NULL) |
| Lote borrado con invitados | ✅ uuid_lote → NULL (ON DELETE SET NULL) |
| Múltiples RRPPs creando simultáneamente | ✅ Solo se permite hasta el límite |

## Archivos Modificados

```
supabase/migrations/update/
  └── 004_fix_lote_triggers.sql ................. NUEVO

src/components/pages/rrpp/
  └── InvitadosPage.tsx ......................... MODIFICADO
      - Recarga de lotes automática
      - Manejo de errores mejorado
      - Mensajes específicos para lote lleno

FIX_LOTE_CAPACITY.md ............................ NUEVO (este archivo)
```

## Debugging

Si encuentras problemas:

### Verificar estado de un lote:
```sql
SELECT
  nombre,
  cantidad_actual,
  cantidad_maxima,
  (cantidad_maxima - cantidad_actual) as disponibles
FROM public.lotes
WHERE id = 'lote-uuid';
```

### Verificar triggers activos:
```sql
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name LIKE '%lote%';
```

Deberías ver:
- `trigger_increment_lote_cantidad` - BEFORE INSERT
- `trigger_decrement_lote_cantidad` - AFTER DELETE
- `trigger_update_lote_cantidad` - BEFORE UPDATE

### Verificar función del trigger:
```sql
SELECT pg_get_functiondef('increment_lote_cantidad'::regproc);
```

Deberías ver que la verificación (`IF ... >= ... THEN RAISE`) está ANTES del `UPDATE`.

## Mejoras Futuras (Opcional)

- [ ] Agregar índice en `lotes(uuid_evento, activo, cantidad_actual)` para queries más rápidas
- [ ] Implementar websocket/realtime para actualizar disponibilidad en vivo sin recargar
- [ ] Dashboard de admin para ver lotes con alta ocupación (>80%)
- [ ] Notificaciones cuando un lote está por llenarse
- [ ] Sistema de "lista de espera" para lotes llenos

## Notas Importantes

⚠️ **La validación crítica está en la BD**: Aunque el frontend filtra lotes llenos, la verdadera protección es el trigger de PostgreSQL. Esto previene:
- Llamadas directas al API sin pasar por el frontend
- Condiciones de carrera (race conditions)
- Manipulación de requests

✅ **Transacciones atómicas**: Todo el flujo de verificación + incremento ocurre en una transacción, garantizando consistencia.

🔒 **RLS respetado**: Los triggers funcionan correctamente con Row Level Security activo.
