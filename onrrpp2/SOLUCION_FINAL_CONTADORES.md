# 🔧 SOLUCIÓN: Contadores No Se Actualizan

## ❌ Problema Actual

- ✅ Los invitados se crean correctamente
- ❌ Pero `cantidad_actual` no se incrementa
- ❌ Los "disponibles" no bajan

**Causa:** Los triggers no tienen permisos para actualizar la tabla `lotes`.

---

## ✅ SOLUCIÓN DEFINITIVA (1 paso)

### Ejecuta este script en Supabase:

```
supabase/migrations/update/009_fix_permisos_triggers.sql
```

**Cómo:**
1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia **TODO** el contenido del archivo `009_fix_permisos_triggers.sql`
3. Pégalo en SQL Editor
4. Click **RUN** ▶️

---

## 🎯 Lo que hace el script 009

### ✅ Otorga permisos necesarios
```sql
GRANT UPDATE ON public.lotes TO authenticated;
```
Esto permite que los triggers actualicen los contadores.

### ✅ Usa SECURITY DEFINER
Las funciones se ejecutan con permisos elevados, sin importar quién crea el invitado.

### ✅ Agrega logs de debugging
Los triggers ahora muestran mensajes cuando se ejecutan.

### ✅ Prueba automática
El script crea un invitado de prueba, verifica que el contador sube, y lo elimina.

### ✅ Sincroniza todos los contadores
Recalcula todos los contadores para que coincidan con la realidad.

---

## ✅ Resultado Esperado

Después de ejecutar verás:

```
========================================
PRUEBA AUTOMÁTICA DE TRIGGERS
========================================
Cantidad ANTES:   5
Cantidad DESPUÉS: 6
✅ ¡TRIGGER FUNCIONA CORRECTAMENTE!
========================================

📊 RESUMEN FINAL
========================================
Triggers instalados: 3/3
Lotes sincronizados: 2/2

✅ SISTEMA COMPLETAMENTE FUNCIONAL

🎯 Ahora los contadores se actualizarán automáticamente
🎯 Crea un invitado en tu app y verifica
========================================
```

---

## 🧪 Probar en tu App

1. **Recarga tu app** (Ctrl + R)
2. Ve a **Eventos** → Selecciona un lote
3. **Anota** el número de disponibles (ej: "8 / 10")
4. **Crea un invitado**
5. **Cierra y abre el diálogo de lotes**
6. **Verifica**: Debe mostrar "9 / 10" ✅
7. **Elimina el invitado**
8. **Verifica**: Debe volver a "8 / 10" ✅

---

## 🔍 Si Aún No Funciona

### Opción A: Verificar triggers manualmente

Ejecuta: `supabase/VERIFICAR_TRIGGERS.sql`

Este script:
- Muestra los triggers instalados
- Cuenta invitados vs contadores
- Prueba manualmente que el trigger funciona
- Verifica permisos

### Opción B: Ver logs del servidor

Si ejecutaste el script 009, los triggers ahora muestran logs.

En Supabase Dashboard:
1. Ve a **Logs** (menú izquierdo)
2. Filtra por "Trigger"
3. Deberías ver:
   ```
   Trigger fn_incrementar_lote ejecutado para lote: xxx-xxx-xxx
   Lote xxx-xxx-xxx incrementado
   ```

Si NO ves logs → El trigger no se está ejecutando.

### Opción C: Verificar permisos

```sql
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'lotes'
  AND grantee = 'authenticated';
```

Debe aparecer `UPDATE` en la lista.

Si NO aparece, ejecuta:
```sql
GRANT UPDATE ON public.lotes TO authenticated;
```

---

## 🆘 Debugging Avanzado

Si después del script 009 todavía no funciona:

### 1. Ver si el trigger se ejecuta:

```sql
-- Contar invitados de un lote específico
SELECT COUNT(*) FROM public.invitados WHERE uuid_lote = 'UUID-DEL-LOTE';

-- Ver contador del lote
SELECT cantidad_actual FROM public.lotes WHERE id = 'UUID-DEL-LOTE';
```

Si los números NO coinciden → El trigger no se ejecuta.

### 2. Sincronizar manualmente:

```sql
-- Corregir UN lote específico
UPDATE public.lotes
SET cantidad_actual = (
    SELECT COUNT(*) FROM public.invitados WHERE uuid_lote = lotes.id
)
WHERE id = 'UUID-DEL-LOTE';

-- O corregir TODOS:
UPDATE public.lotes l
SET cantidad_actual = (
    SELECT COUNT(*) FROM public.invitados i WHERE i.uuid_lote = l.id
);
```

### 3. Verificar que el trigger existe:

```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name = 'trg_incrementar_lote';
```

Debe devolver una fila. Si NO → El trigger no se creó.

---

## 📊 Diferencia entre Scripts

| Script | Problema que resuelve |
|--------|----------------------|
| 008_solucion_definitiva.sql | Error "lote no existe" ✅ |
| **009_fix_permisos_triggers.sql** | **Contadores no se actualizan** ✅ |

**Nota:** Si ejecutaste el 008, ejecuta también el 009 para completar la solución.

---

## 📝 Resumen

**Para que los contadores se actualicen:**

1. ✅ Ejecuta `009_fix_permisos_triggers.sql`
2. ✅ Verifica mensaje "SISTEMA COMPLETAMENTE FUNCIONAL"
3. ✅ Recarga tu app
4. ✅ Crea un invitado
5. ✅ Verifica que disponibles bajen

**Tiempo: 1-2 minutos**

---

## ✅ Checklist Final

- [ ] Script 009 ejecutado sin errores
- [ ] Prueba automática exitosa (mensaje verde)
- [ ] 3/3 triggers instalados
- [ ] Todos los lotes sincronizados
- [ ] Crear invitado → contador sube
- [ ] Eliminar invitado → contador baja
- [ ] Frontend muestra disponibles correctos

Si TODOS están ✅ → **PROBLEMA RESUELTO** 🎉

---

**TL;DR:** Ejecuta `009_fix_permisos_triggers.sql` → Los contadores se actualizarán 🚀
