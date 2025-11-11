# 🔧 SOLUCIÓN: Recursión Infinita en Políticas RLS

## ❌ Problema

Al intentar **editar el lote de un invitado**, aparece el error:
```
infinity recursion detected in policy for relation "invitados"
```

### Causa Raíz

Las políticas RLS para UPDATE en la tabla `invitados` tenían **subconsultas recursivas**:

```sql
WITH CHECK (
    ingresado = (SELECT ingresado FROM public.invitados WHERE id = invitados.id)
)
```

Cuando PostgreSQL ejecuta el UPDATE:
1. Activa la política RLS
2. La política hace SELECT sobre `invitados`
3. El SELECT activa nuevamente la política RLS
4. **Loop infinito** 🔁

---

## ✅ SOLUCIÓN

### Ejecuta este script en Supabase:

```
supabase/migrations/update/010_fix_rls_recursion.sql
```

**Cómo ejecutar:**
1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Copia el contenido completo de `010_fix_rls_recursion.sql`
3. Pégalo en SQL Editor
4. Click **RUN** ▶️

---

## 🎯 Lo que hace el script

### 1. Elimina políticas problemáticas
```sql
DROP POLICY "RRPP can update their own invitados" ON public.invitados;
DROP POLICY "Seguridad can update ingresado status" ON public.invitados;
```

### 2. Crea funciones helper con SECURITY DEFINER

Las funciones con `SECURITY DEFINER` ejecutan con permisos elevados **sin activar RLS**:

```sql
CREATE FUNCTION check_invitado_unchanged_fields(...)
RETURNS BOOLEAN SECURITY DEFINER
```

Esto permite verificar valores antiguos **sin causar recursión**.

### 3. Recrea políticas sin recursión

**Para RRPP:**
- Permite editar todos los campos de sus invitados
- **Ahora permite cambiar el lote** ✅
- Excepto `ingresado` y `fecha_ingreso` (solo Seguridad puede cambiar eso)

**Para Seguridad:**
- Solo permite cambiar `ingresado` y `fecha_ingreso`
- No puede modificar nombre, apellido, lote, etc.

---

## ✅ Resultado Esperado

Después de ejecutar verás:

```
========================================
✅ POLÍTICAS RLS CORREGIDAS
========================================
Problema resuelto: Recursión infinita eliminada
RRPP ahora puede editar invitados incluyendo lote
Seguridad solo puede cambiar ingresado/fecha_ingreso
========================================
```

---

## 🧪 Probar en tu App

1. **Recarga tu app** (Ctrl + R)
2. Ve a **Mis Invitados**
3. Haz click en **Editar** ✏️ en cualquier invitado
4. **Cambia el lote** a otro disponible
5. Click **Guardar cambios**
6. ✅ Debe guardar sin error de recursión

---

## 🔍 Diferencia Antes/Después

### ❌ ANTES (con recursión)
```sql
WITH CHECK (
    ingresado = (SELECT ingresado FROM invitados WHERE id = invitados.id)
    -- ⬆️ Causa loop infinito
)
```

### ✅ DESPUÉS (sin recursión)
```sql
WITH CHECK (
    check_invitado_unchanged_fields(id, ingresado, fecha_ingreso)
    -- ⬆️ Función SECURITY DEFINER que NO activa RLS
)
```

---

## 📝 Resumen

**Para resolver el error de recursión infinita:**

1. ✅ Ejecuta `010_fix_rls_recursion.sql` en Supabase
2. ✅ Verifica mensaje de confirmación
3. ✅ Recarga tu app
4. ✅ Prueba editando el lote de un invitado

**Tiempo estimado: 1 minuto**

---

## ✅ Checklist

- [ ] Script 010 ejecutado sin errores
- [ ] Mensaje "POLÍTICAS RLS CORREGIDAS" visible
- [ ] App recargada
- [ ] Editar invitado funciona
- [ ] Cambiar lote funciona sin error
- [ ] No aparece error de recursión infinita

Si TODOS están ✅ → **PROBLEMA RESUELTO** 🎉
