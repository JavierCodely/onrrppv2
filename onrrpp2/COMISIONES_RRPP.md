# Sistema de Comisiones para RRPP

## Resumen

Se ha implementado un sistema completo de comisiones para RRPP por cada lote vendido. Los administradores pueden configurar comisiones en **monto fijo** (pesos) o **porcentaje** para cada lote que crean.

## Características Implementadas

### 1. **Configuración de Comisiones por Lote** (Admin)

Cuando un admin crea o edita un lote, puede configurar:

- **Tipo de comisión**: Monto fijo o porcentaje
- **Comisión en pesos**: Ejemplo: $500 por cada venta
- **Comisión en porcentaje**: Ejemplo: 15% del precio de venta

#### Ejemplo:
- **Lote Normal**: Precio $3000, comisión $500 por venta
- **Lote VIP**: Precio $5000, comisión 20% ($1000 por venta)

### 2. **Vista de Estadísticas de Ventas** (RRPP)

Los RRPP pueden ver en la sección "Mis Ventas":

#### Tarjeta Principal de Comisión Total
- Muestra el **total de comisiones ganadas** en el evento seleccionado
- Diseño destacado en amarillo/naranja

#### Desglose por Lote
Para cada lote vendido se muestra:
- Nombre del lote
- Cantidad de ventas realizadas
- Precio del lote
- Tipo y monto de comisión configurada
- **Total ganado** en ese lote específico

#### Estadísticas Generales
- Total de ventas
- Total recaudado
- Desglose por método de pago (efectivo, transferencia, mixto)

## Cambios en Base de Datos

### Nueva Migración: `028_add_comision_rrpp_to_lotes.sql`

Se agregaron los siguientes campos a la tabla `lotes`:

```sql
-- Tipo de comisión (ENUM)
comision_tipo: 'monto' | 'porcentaje'

-- Comisión en monto fijo (pesos)
comision_rrpp_monto: DECIMAL(10, 2)

-- Comisión en porcentaje
comision_rrpp_porcentaje: DECIMAL(5, 2)
```

### Nueva Vista SQL: `ventas_rrpp_stats`

Vista materializada que calcula automáticamente:
- Cantidad de ventas por RRPP y lote
- Monto total vendido
- Desglose por método de pago
- **Comisión total calculada** según el tipo configurado

La fórmula de cálculo:
```sql
CASE
  WHEN comision_tipo = 'monto' THEN
    cantidad_ventas * comision_rrpp_monto
  WHEN comision_tipo = 'porcentaje' THEN
    monto_total_vendido * (comision_rrpp_porcentaje / 100)
END as comision_total
```

## Archivos Modificados

### Backend/Database
- ✅ `supabase/migrations/028_add_comision_rrpp_to_lotes.sql` (nuevo)
- ✅ `src/types/database.ts` - Agregado `ComisionTipo` y `VentasRRPPStats`
- ✅ `src/services/lotes.service.ts` - DTOs actualizados con campos de comisión
- ✅ `src/services/ventas.service.ts` - Métodos para obtener estadísticas con comisiones

### Frontend
- ✅ `src/components/pages/admin/EventosPage.tsx` - Formulario de lotes con sección de comisiones
- ✅ `src/components/pages/rrpp/VentasPage.tsx` - Vista de estadísticas con comisiones por lote

## Instrucciones de Instalación

### 1. Ejecutar la Migración

**Opción A: Dashboard de Supabase**
1. Ve a tu proyecto en https://app.supabase.com
2. Navega a "SQL Editor"
3. Ejecuta el contenido de `supabase/migrations/028_add_comision_rrpp_to_lotes.sql`

**Opción B: Supabase CLI**
```bash
supabase db push
```

### 2. Verificar la Migración

Ejecuta en SQL Editor:
```sql
-- Verificar columnas nuevas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'lotes'
AND column_name LIKE '%comision%';

-- Verificar vista
SELECT * FROM ventas_rrpp_stats LIMIT 1;
```

### 3. Actualizar Lotes Existentes (Opcional)

Si tienes lotes creados antes de la migración, actualízalos:
```sql
-- Ejemplo: Asignar comisión de $500 a todos los lotes normales
UPDATE lotes
SET
  comision_tipo = 'monto',
  comision_rrpp_monto = 500,
  comision_rrpp_porcentaje = 0
WHERE es_vip = false;

-- Ejemplo: Asignar comisión de 20% a lotes VIP
UPDATE lotes
SET
  comision_tipo = 'porcentaje',
  comision_rrpp_monto = 0,
  comision_rrpp_porcentaje = 20
WHERE es_vip = true;
```

## Uso del Sistema

### Como Admin

1. Ve a la sección "Eventos"
2. Selecciona un evento y haz clic en "Ver Lotes"
3. Al crear o editar un lote:
   - Configura el precio del lote
   - Selecciona el tipo de comisión (Monto fijo o Porcentaje)
   - Ingresa el valor de la comisión
   - El sistema mostrará un preview del cálculo (en caso de porcentaje)

### Como RRPP

1. Ve a la sección "Mis Ventas"
2. Selecciona un evento del dropdown
3. Verás:
   - **Tarjeta amarilla destacada**: Tu comisión total del evento
   - **Sección "Comisiones por Lote"**: Detalle de cada lote vendido
   - **Tabla de ventas**: Historial completo de tus ventas

## Ejemplos de Configuración

### Ejemplo 1: Comisión Fija
```
Lote: "Early Bird"
Precio: $2500
Tipo: Monto fijo
Comisión: $400

Si vendes 10 entradas → Ganas $4000
```

### Ejemplo 2: Comisión Porcentual
```
Lote: "VIP Premium"
Precio: $8000
Tipo: Porcentaje
Comisión: 15%

Si vendes 5 entradas → Ganas $6000 (15% de $40000)
```

### Ejemplo 3: Múltiples Lotes
```
Evento: "Fiesta de Año Nuevo"

Lote Normal: 20 ventas × $300 comisión = $6000
Lote VIP: 5 ventas × 25% de $5000 = $6250

Total comisión del evento: $12250
```

## Validaciones Implementadas

### Backend (SQL)
- ✅ Comisión monto ≥ 0
- ✅ Comisión porcentaje entre 0 y 100
- ✅ Tipo de comisión coherente con valores ingresados

### Frontend
- ✅ Validación de valores numéricos
- ✅ Preview del cálculo de porcentaje en tiempo real
- ✅ Required fields según tipo de comisión seleccionado

## Seguridad (RLS)

La vista `ventas_rrpp_stats` utiliza `security_invoker = true`, lo que significa que:
- ✅ Solo RRPP pueden ver sus propias comisiones
- ✅ Solo eventos del club del usuario son visibles
- ✅ Respeta todas las políticas RLS existentes

## Próximos Pasos (Opcional)

Posibles mejoras futuras:
- [ ] Dashboard admin para ver comisiones totales pagadas
- [ ] Exportación de reporte de comisiones por período
- [ ] Notificaciones cuando se alcanza un umbral de comisiones
- [ ] Gráficos de evolución de comisiones por RRPP
- [ ] Sistema de pagos/liquidaciones de comisiones

## Soporte

Si encuentras algún problema:
1. Verifica que la migración se ejecutó correctamente
2. Revisa los logs del browser console para errores
3. Verifica que el usuario tenga los permisos RLS correctos
4. Confirma que la vista `ventas_rrpp_stats` existe en la base de datos
