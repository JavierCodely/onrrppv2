# SOLUCIÓN: Contador de Lotes no se Actualiza

## 🔴 Problema Identificado

El contador `cantidad_actual` no se incrementa cuando creas invitados. Esto puede ocurrir por:

1. **Triggers no aplicados**: Las migraciones no se ejecutaron
2. **Triggers defectuosos**: El trigger BEFORE INSERT no actualiza correctamente
3. **Contadores desincronizados**: Los contadores están en un estado inconsistente

## 🔧 Solución Completa (3 Pasos)

### PASO 1: Diagnosticar el problema

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta:

```sql
-- Ver estado de los lotes
SELECT
    l.nombre as lote,
    l.cantidad_actual as contador_db,
    COUNT(i.id) as invitados_reales,
    l.cantidad_maxima as maximo,
    CASE
        WHEN l.cantidad_actual != COUNT(i.id) THEN '⚠️ DESINCRONIZADO'
        ELSE '✅ OK'
    END as estado
FROM public.lotes l
LEFT JOIN public.invitados i ON i.uuid_lote = l.id
WHERE l.activo = true
GROUP BY l.id, l.nombre, l.cantidad_actual, l.cantidad_maxima
ORDER BY l.nombre;
```

**Resultado esperado:**
- Si ves `⚠️ DESINCRONIZADO` → Los contadores están mal
- Si ves `✅ OK` → Los triggers no están funcionando

### PASO 2: Aplicar la solución definitiva

Copia TODO el contenido del archivo:
```
supabase/migrations/update/005_fix_lote_triggers_v2.sql
```

Pégalo en **Supabase Dashboard** → **SQL Editor** → Click **RUN**

**Lo que hace este script:**
1. ✅ Elimina triggers defectuosos
2. ✅ Crea nuevos triggers optimizados:
   - `BEFORE INSERT`: Valida disponibilidad (bloquea si lleno)
   - `AFTER INSERT`: Incrementa contador
   - `AFTER DELETE`: Decrementa contador
   - `BEFORE UPDATE`: Maneja cambio de lote
3. ✅ **Corrige automáticamente todos los contadores** desincronizados
4. ✅ Usa `FOR UPDATE` locks para prevenir race conditions

### PASO 3: Verificar que funcionó

Ejecuta en SQL Editor:

```sql
-- 1. Verificar que los triggers existen
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name LIKE '%lote%'
ORDER BY trigger_name;
```

**Deberías ver:**
```
trigger_validar_lote_disponibilidad    | INSERT | BEFORE
trigger_incrementar_contador_lote      | INSERT | AFTER
trigger_decrementar_contador_lote      | DELETE | AFTER
trigger_manejar_cambio_lote            | UPDATE | BEFORE
```

```sql
-- 2. Verificar contadores sincronizados
SELECT
    l.nombre,
    l.cantidad_actual,
    COUNT(i.id) as real,
    l.cantidad_maxima
FROM public.lotes l
LEFT JOIN public.invitados i ON i.uuid_lote = l.id
GROUP BY l.id, l.nombre, l.cantidad_actual, l.cantidad_maxima
ORDER BY l.nombre;
```

**cantidad_actual debe ser igual a real** ✅

## 🧪 Prueba Final

1. **Ve a tu frontend** → Eventos → Selecciona un lote
2. **Anota**: Lote tiene X disponibles (ej: 8/10)
3. **Crea un invitado** en ese lote
4. **Verifica**: Ahora debe mostrar X-1 disponibles (ej: 9/10)
5. **Elimina el invitado**
6. **Verifica**: Debe volver a X disponibles (ej: 8/10)

Si esto funciona: **¡Problema resuelto!** ✅

## ❌ Si Todavía No Funciona

### Opción A: Script de corrección manual

Ejecuta esto en SQL Editor:

```sql
-- Recalcular TODOS los contadores manualmente
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COUNT(*)
    FROM public.invitados i
    WHERE i.uuid_lote = l.id
);

-- Verificar
SELECT
    nombre,
    cantidad_actual,
    cantidad_maxima,
    (cantidad_maxima - cantidad_actual) as disponibles
FROM public.lotes
WHERE activo = true
ORDER BY nombre;
```

### Opción B: Verificar permisos

```sql
-- El usuario autenticado necesita permisos UPDATE en lotes
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'lotes'
  AND grantee = 'authenticated';
```

Debe aparecer `UPDATE` en privilege_type.

Si NO aparece, ejecuta:

```sql
GRANT UPDATE ON public.lotes TO authenticated;
```

## 📊 Flujo de los Nuevos Triggers

```
CREAR INVITADO:
├─ 1. BEFORE INSERT (validar_lote_disponibilidad)
│  ├─ Lock lote (FOR UPDATE)
│  ├─ Verificar que existe
│  ├─ Verificar que está activo
│  ├─ Verificar disponibilidad: cantidad_actual < cantidad_maxima
│  └─ Si está lleno → ❌ EXCEPTION (bloquea insert)
│
├─ 2. INSERT ejecuta (si pasó validación)
│
└─ 3. AFTER INSERT (incrementar_contador_lote)
   └─ UPDATE lotes SET cantidad_actual = cantidad_actual + 1

ELIMINAR INVITADO:
├─ 1. DELETE ejecuta
│
└─ 2. AFTER DELETE (decrementar_contador_lote)
   └─ UPDATE lotes SET cantidad_actual = cantidad_actual - 1

CAMBIAR DE LOTE:
├─ 1. BEFORE UPDATE (manejar_cambio_lote)
│  ├─ Validar nuevo lote (si cambió)
│  ├─ Decrementar lote anterior
│  └─ Incrementar lote nuevo
│
└─ 2. UPDATE ejecuta
```

## 🔐 Ventajas de esta Solución

✅ **Separación de responsabilidades**:
- BEFORE = Validación
- AFTER = Actualización

✅ **Locks de base de datos** (`FOR UPDATE`):
- Previene race conditions
- Múltiples RRPPs pueden crear invitados simultáneamente sin problemas

✅ **Corrección automática**:
- La migración sincroniza todos los contadores al aplicarse

✅ **Mensajes de error claros**:
- "El lote X está completo. Disponibles: 0/50"

## 📁 Archivos Relacionados

```
supabase/migrations/update/
├── 002_create_lotes.sql ................... Migración original (con bug)
├── 004_fix_lote_triggers.sql .............. Intento de fix (incompleto)
└── 005_fix_lote_triggers_v2.sql ........... ✅ SOLUCIÓN DEFINITIVA

supabase/
├── DIAGNOSTICO_LOTES.sql .................. Script de diagnóstico
└── SOLUCIONAR_CONTADOR_LOTES.md ........... Este archivo
```

## 🚨 Importante

**NO ejecutes la migración 004 si ya la ejecutaste**. Ve directo a ejecutar la **005** que:
- Limpia los triggers anteriores
- Crea los nuevos correctamente
- Corrige los contadores automáticamente

## ✅ Checklist de Verificación

Después de aplicar la migración 005:

- [ ] Los 4 triggers aparecen en `information_schema.triggers`
- [ ] Los contadores de todos los lotes coinciden con invitados reales
- [ ] Crear un invitado incrementa el contador
- [ ] Eliminar un invitado decrementa el contador
- [ ] Intentar crear en lote lleno muestra error claro
- [ ] El frontend muestra disponibilidad actualizada

Si todos están ✅ → **Sistema funcionando correctamente**

## 🆘 Soporte

Si después de aplicar la migración 005 el problema persiste:

1. Ejecuta `DIAGNOSTICO_LOTES.sql` completo
2. Comparte el output para análisis más profundo
3. Verifica logs del servidor Supabase para errores de triggers

---

**Resumen**: Ejecuta `005_fix_lote_triggers_v2.sql` en Supabase Dashboard y el problema se resolverá automáticamente.
