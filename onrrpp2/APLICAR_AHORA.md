# 🚀 SOLUCIÓN RÁPIDA - Aplicar AHORA

## ❌ Error: "El lote no existe"

Este error ocurre porque la validación anterior era demasiado estricta. He creado una **versión simplificada que funciona**.

---

## ✅ SOLUCIÓN (2 minutos)

### 1. Abre Supabase Dashboard
- Ve a tu proyecto en Supabase
- Click en **SQL Editor** (menú izquierdo)

### 2. Copia y ejecuta este script

Abre el archivo:
```
supabase/migrations/update/006_fix_lote_simple.sql
```

**Copia TODO el contenido** y pégalo en el SQL Editor.

Click **RUN** (botón verde) ▶️

---

## 🎯 ¿Qué hace este script?

1. ✅ Elimina TODOS los triggers anteriores (limpieza total)
2. ✅ Crea 3 triggers simples que SÍ funcionan:
   - Al crear invitado → Incrementa contador
   - Al eliminar invitado → Decrementa contador
   - Al cambiar de lote → Actualiza ambos contadores
3. ✅ Sincroniza todos los contadores automáticamente
4. ✅ Muestra mensaje de confirmación

---

## ✅ Verificar que funcionó

Ejecuta esto en el SQL Editor:

```sql
-- Ver contadores de lotes
SELECT
    nombre,
    cantidad_actual,
    cantidad_maxima,
    (cantidad_maxima - cantidad_actual) as disponibles
FROM public.lotes
WHERE activo = true
ORDER BY nombre;
```

Los números deben ser correctos ahora.

---

## 🧪 Probar en el frontend

1. Ve a **Eventos** en tu app
2. Selecciona un evento con un lote (ej: 5/10 disponibles)
3. **Crea un invitado** en ese lote
4. **Refresca la página** o cierra y abre el diálogo
5. **Verifica**: Debe mostrar 6/10 disponibles ✅

Si ves que el número cambia → **¡Funciona!** 🎉

---

## 🔧 Si sigue dando error

### Verifica que los triggers se crearon:

```sql
SELECT
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'invitados'
  AND trigger_name LIKE '%lote%'
ORDER BY trigger_name;
```

**Debes ver exactamente esto:**
```
trigger_actualizar_lote_al_cambiar     | UPDATE | BEFORE
trigger_decrementar_lote_al_eliminar   | DELETE | AFTER
trigger_incrementar_lote_al_crear      | INSERT | BEFORE
```

Si ves otros triggers, ejecuta el script de nuevo (limpiará todo y recreará).

---

## 🆘 Depuración adicional

Si después de aplicar el script 006 TODAVÍA ves errores:

### Opción 1: Verificar que el lote existe

```sql
-- Ver todos los lotes activos
SELECT id, nombre, activo FROM public.lotes ORDER BY nombre;
```

Copia un `id` de lote y prueba crear un invitado manualmente:

```sql
-- Reemplaza los UUIDs con valores reales de tu DB
INSERT INTO public.invitados (
    nombre,
    apellido,
    edad,
    dni,
    sexo,
    uuid_evento,
    uuid_lote,
    id_rrpp
) VALUES (
    'Test',
    'Usuario',
    25,
    'test-' || NOW(),
    'hombre',
    'uuid-del-evento-aqui',
    'uuid-del-lote-aqui',
    'uuid-del-rrpp-aqui'
);
```

Si esto da error → Hay un problema con las referencias FK.

### Opción 2: Desactivar temporalmente la validación

Si necesitas que funcione YA y arreglar después:

```sql
-- TEMPORAL: Crear trigger que NO valida, solo incrementa
DROP TRIGGER IF EXISTS trigger_incrementar_lote_al_crear ON public.invitados;

CREATE OR REPLACE FUNCTION incrementar_lote_sin_validar()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.uuid_lote IS NOT NULL THEN
        UPDATE public.lotes
        SET cantidad_actual = cantidad_actual + 1
        WHERE id = NEW.uuid_lote;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_incrementar_lote_al_crear
AFTER INSERT ON public.invitados
FOR EACH ROW
EXECUTE FUNCTION incrementar_lote_sin_validar();
```

Esto incrementará sin validar (permitirá superar el máximo, pero al menos funcionará).

---

## 📊 Diferencias entre versiones

| Versión | Estado | Problema |
|---------|--------|----------|
| 002_create_lotes.sql | ❌ Bug | Incrementa DESPUÉS de validar |
| 004_fix_lote_triggers.sql | ❌ Bug | Validación incompleta |
| 005_fix_lote_triggers_v2.sql | ⚠️ Error | Demasiado estricta (FOR UPDATE) |
| **006_fix_lote_simple.sql** | ✅ **USA ESTA** | Simplificada y funcional |

---

## 📝 Resumen

**Para resolver el error "lote no existe":**

1. Ejecuta `006_fix_lote_simple.sql` en Supabase Dashboard
2. Verifica que los 3 triggers se crearon
3. Prueba crear un invitado en el frontend
4. Confirma que el contador se incrementa

**Tiempo estimado:** 2-3 minutos

---

## ✅ Checklist Final

Después de aplicar el script 006:

- [ ] Script ejecutado sin errores en Supabase
- [ ] 3 triggers visibles en `information_schema.triggers`
- [ ] Contadores sincronizados (cantidad_actual = invitados reales)
- [ ] Puedo crear un invitado sin error
- [ ] El contador se incrementa correctamente
- [ ] El contador se decrementa al eliminar

Si TODOS están ✅ → **Sistema funcionando** 🎉

---

**TL;DR:** Ejecuta `006_fix_lote_simple.sql` en Supabase Dashboard → SQL Editor → RUN
