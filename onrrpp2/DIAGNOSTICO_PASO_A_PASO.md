# 🔍 DIAGNÓSTICO: "El lote seleccionado no existe"

El error persiste después de ejecutar la migración 006. Vamos a diagnosticar exactamente qué está pasando.

---

## 📋 PASO 1: Verificar que hay lotes en la BD

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta:

```sql
-- Ver todos los lotes
SELECT
    id,
    nombre,
    activo,
    cantidad_actual,
    cantidad_maxima,
    uuid_evento
FROM public.lotes
ORDER BY created_at DESC;
```

### ❓ ¿Qué resultado obtienes?

**A) No hay resultados / Tabla vacía**
→ El problema es que **NO HAY LOTES CREADOS**
→ Necesitas crear lotes primero desde el panel Admin
→ Salta al **PASO 5: Solución A**

**B) Hay lotes pero `activo = false`**
→ Los lotes están inactivos
→ Ejecuta: `UPDATE public.lotes SET activo = true;`
→ Salta al **PASO 5: Solución B**

**C) Hay lotes activos (activo = true)**
→ Los lotes existen correctamente
→ Continúa al **PASO 2**

---

## 📋 PASO 2: Copiar un ID de lote y probarlo

De la query del PASO 1, **copia el `id`** de un lote activo.

Ejemplo: `550e8400-e29b-41d4-a716-446655440000`

Ejecuta esto reemplazando el UUID:

```sql
-- Reemplaza 'TU-UUID-AQUI' con el ID real
SELECT
    id,
    nombre,
    activo,
    cantidad_actual,
    cantidad_maxima
FROM public.lotes
WHERE id = 'TU-UUID-AQUI' AND activo = true;
```

### ❓ ¿Qué resultado obtienes?

**A) No devuelve nada**
→ El lote no existe O no está activo
→ Verifica que copiaste bien el UUID
→ Verifica que `activo = true`

**B) Devuelve el lote**
→ El lote existe correctamente
→ Continúa al **PASO 3**

---

## 📋 PASO 3: Ver el UUID que envía el frontend

En tu aplicación web:

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Intenta crear un invitado
4. Click en la petición `invitados` que falla
5. Ve a la pestaña **Payload** o **Request**

### Busca el campo `uuid_lote`

Ejemplo de lo que deberías ver:
```json
{
  "nombre": "Juan",
  "apellido": "Perez",
  "uuid_lote": "550e8400-e29b-41d4-a716-446655440000",
  ...
}
```

### ❓ ¿Qué valor tiene `uuid_lote`?

**A) Es `null` o no aparece**
→ No estás seleccionando ningún lote
→ Asegúrate de seleccionar un lote en el formulario

**B) Es un UUID (ej: `550e8400-...`)**
→ Copia ese UUID y vuelve al **PASO 2** para verificar si existe
→ Si existe → El problema es el trigger
→ Si NO existe → El frontend está enviando un UUID incorrecto

**C) Es un string vacío `""`**
→ El problema está en el frontend
→ Salta al **PASO 5: Solución C**

---

## 📋 PASO 4: Verificar el trigger

Ejecuta:

```sql
-- Ver función del trigger
SELECT pg_get_functiondef('incrementar_lote_al_crear'::regproc);
```

En el código que aparece, busca esta línea:

```sql
WHERE id = NEW.uuid_lote AND activo = true;
```

### ❓ ¿Aparece `AND activo = true`?

**Si aparece:**
El trigger está validando que el lote esté activo. Si el lote tiene `activo = false`, dará error.

**Solución:**
```sql
UPDATE public.lotes SET activo = true WHERE activo = false;
```

---

## 📋 PASO 5: SOLUCIONES

### ✅ Solución A: Crear lotes

Si NO hay lotes en la BD, necesitas crearlos:

```sql
-- Obtener UUID de un evento existente
SELECT id, nombre FROM public.eventos LIMIT 1;

-- Crear un lote de prueba (reemplaza el UUID del evento)
INSERT INTO public.lotes (
    nombre,
    cantidad_maxima,
    precio,
    es_vip,
    uuid_evento,
    activo
) VALUES (
    'Lote General',
    100,
    0,
    false,
    'UUID-DEL-EVENTO-AQUI',
    true
);
```

### ✅ Solución B: Activar lotes

```sql
-- Activar todos los lotes
UPDATE public.lotes SET activo = true;

-- Verificar
SELECT nombre, activo FROM public.lotes;
```

### ✅ Solución C: Corregir frontend

Si el frontend envía `uuid_lote: ""` (string vacío), ve al archivo:

`src/components/pages/rrpp/InvitadosPage.tsx`

Y verifica que la línea 287 sea:

```typescript
uuid_lote: formData.uuid_lote || null,  // ✅ Correcto
// NO:
uuid_lote: formData.uuid_lote,  // ❌ Incorrecto (envía "")
```

### ✅ Solución D: Desactivar validación temporalmente

**SOLO mientras diagnosticamos**, ejecuta:

```sql
-- Archivo: 007_trigger_sin_validacion.sql
```

Esto permite crear invitados SIN validar el lote, para que puedas trabajar mientras encontramos el problema real.

⚠️ **IMPORTANTE**: Esta es una solución TEMPORAL. Los lotes podrán superar su máximo.

---

## 🎯 RESUMEN - Checklist de Diagnóstico

Ejecuta estos pasos en orden y marca lo que encuentras:

- [ ] **PASO 1:** Ver lotes en la BD
  - [ ] ¿Hay lotes? Sí / No
  - [ ] ¿Están activos? Sí / No

- [ ] **PASO 2:** Copiar ID de lote y verificar que existe
  - [ ] ¿El lote existe con ese ID? Sí / No

- [ ] **PASO 3:** Ver qué UUID envía el frontend
  - [ ] ¿Es null? Sí / No
  - [ ] ¿Es un UUID válido? Sí / No
  - [ ] ¿Es string vacío ""? Sí / No

- [ ] **PASO 4:** Verificar el trigger
  - [ ] ¿Valida `activo = true`? Sí / No

---

## 🆘 Reportar Resultados

Después de ejecutar el diagnóstico, comparte:

1. Resultado del **PASO 1** (captura o texto)
2. Resultado del **PASO 3** (el JSON del Payload)
3. ¿Cuál es el problema encontrado?

Con esa información podré darte la solución exacta.

---

## 🚀 Solución Rápida (mientras diagnosticamos)

Si necesitas que funcione YA mientras diagnosticamos:

1. Ejecuta: `supabase/migrations/update/007_trigger_sin_validacion.sql`
2. Esto desactiva la validación temporalmente
3. Podrás crear invitados normalmente
4. Luego corregimos el problema de raíz

**Ejecuta el archivo 007 en Supabase Dashboard → SQL Editor**
