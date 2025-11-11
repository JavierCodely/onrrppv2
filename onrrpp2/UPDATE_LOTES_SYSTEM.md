# Sistema de Lotes para Eventos - Guía de Implementación

## 🎯 Resumen de Cambios

Se ha iniciado la implementación de un sistema de lotes para eventos con las siguientes características:

- **Lotes**: Cada evento puede tener múltiples lotes con nombre, cantidad máxima, precio y categoría VIP
- **RRPP**: Ve eventos en modo lectura, selecciona lote y crea invitados
- **Seguridad**: Ve información del lote al escanear y permite múltiples escaneos para VIP
- **Validación**: QR de eventos inactivos son rechazados

---

## ✅ Implementado Hasta Ahora

### 1. Migración de Base de Datos ✅
**Archivo:** `supabase/migrations/update/002_create_lotes.sql`

#### Tabla `lotes`
```sql
- id (UUID)
- nombre (TEXT) - Nombre del lote
- cantidad_maxima (INTEGER) - Cupos totales
- cantidad_actual (INTEGER) - Cupos usados
- precio (DECIMAL) - Precio (puede ser 0 para free)
- es_vip (BOOLEAN) - Si es categoría VIP
- uuid_evento (UUID) - Relación con evento
- activo (BOOLEAN)
- created_at, updated_at
```

#### Relación en `invitados`
- Agregado: `uuid_lote UUID` (relación opcional con lotes)

#### Triggers Automáticos
- **increment_lote_cantidad**: Incrementa contador al crear invitado
- **decrement_lote_cantidad**: Decrementa contador al eliminar invitado
- **update_lote_cantidad**: Ajusta contadores al cambiar lote
- **Validación**: Lanza error si lote está completo

#### RLS Policies
- Todos pueden ver lotes de su club
- Solo admins pueden crear/editar/eliminar lotes

### 2. Tipos TypeScript Actualizados ✅
**Archivo:** `src/types/database.ts`

```typescript
export interface Lote {
  id: string
  nombre: string
  cantidad_maxima: number
  cantidad_actual: number
  precio: number
  es_vip: boolean
  uuid_evento: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface InvitadoConDetalles extends InvitadoConRRPP {
  lote: Lote | null
  evento: {
    nombre: string
    estado: boolean
  }
}
```

### 3. Servicio de Lotes ✅
**Archivo:** `src/services/lotes.service.ts`

Funciones:
- `getLotesByEvento()` - Obtiene todos los lotes de un evento
- `getLotesDisponiblesByEvento()` - Solo lotes con cupos disponibles
- `getLoteById()` - Obtiene un lote específico
- `createLote()` - Crea nuevo lote (solo admin)
- `updateLote()` - Actualiza lote (solo admin)
- `deleteLote()` - Elimina lote (solo admin)

### 4. Servicio de Invitados Actualizado ✅
**Archivo:** `src/services/invitados.service.ts`

Cambios:
- `CreateInvitadoDTO` ahora incluye `uuid_lote` opcional
- `getInvitadoByQR()` retorna `InvitadoConDetalles` con:
  - Datos del lote
  - Datos del evento
  - Validación de evento activo (rechaza si inactivo)

### 5. Página de Eventos para RRPP ✅
**Archivo:** `src/components/pages/rrpp/EventosRRPPPage.tsx`

Funcionalidades:
- Vista de eventos activos en cards con banner
- Click en evento abre modal con lotes disponibles
- Muestra por cada lote:
  - Nombre
  - Badge VIP si corresponde
  - Precio (o GRATIS si es 0)
  - Disponibilidad (X / Y disponibles)
  - Barra de progreso visual
- Al seleccionar lote, navega a crear invitado con lote preseleccionado

---

## ⚠️ Pendiente de Implementación

### 6. Actualizar RRPPLayout - TODO

**Archivo a modificar:** `src/components/organisms/RRPPLayout.tsx`

Agregar item de menú:
```typescript
const menuItems = [
  {
    name: 'Eventos',
    icon: Calendar,
    path: '/dashboard/rrpp',
  },
  {
    name: 'Mis Invitados',
    icon: UserPlus,
    path: '/dashboard/rrpp/invitados',
  },
]
```

### 7. Actualizar RRPPDashboard - TODO

**Archivo a modificar:** `src/components/pages/RRPPDashboard.tsx`

Cambiar a sistema de rutas:
```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { RRPPLayout } from '@/components/organisms/RRPPLayout'
import { EventosRRPPPage } from '@/components/pages/rrpp/EventosRRPPPage'
import { InvitadosPage } from '@/components/pages/rrpp/InvitadosPage'

export function RRPPDashboard() {
  return (
    <RRPPLayout>
      <Routes>
        <Route index element={<EventosRRPPPage />} />
        <Route path="invitados" element={<InvitadosPage />} />
        <Route path="*" element={<Navigate to="/dashboard/rrpp" replace />} />
      </Routes>
    </RRPPLayout>
  )
}
```

### 8. Actualizar InvitadosPage - TODO

**Archivo a modificar:** `src/components/pages/rrpp/InvitadosPage.tsx`

Cambios necesarios:

1. **Recibir state de navegación:**
```typescript
import { useLocation } from 'react-router-dom'

const location = useLocation()
const state = location.state as { eventoId?: string; loteId?: string } | null

// Si hay eventoId en state, preseleccionar evento
// Si hay loteId en state, preseleccionar lote
```

2. **Agregar campo de lote en formulario:**
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes
  uuid_lote: '', // Nuevo campo
})

// En el formulario, agregar selector de lote
```

3. **Mostrar información del lote en tabla:**
```typescript
// En la tabla de invitados, agregar columna "Lote"
<TableCell>
  {invitado.lote ? (
    <div>
      {invitado.lote.nombre}
      {invitado.lote.es_vip && <Crown className="h-3 w-3" />}
    </div>
  ) : (
    'Sin lote'
  )}
</TableCell>
```

4. **Cargar lotes al seleccionar evento:**
```typescript
useEffect(() => {
  if (selectedEvento) {
    loadLotesDisponibles(selectedEvento)
  }
}, [selectedEvento])

const loadLotesDisponibles = async (eventoId: string) => {
  const { data } = await lotesService.getLotesDisponiblesByEvento(eventoId)
  setLotesDisponibles(data || [])
}
```

### 9. Actualizar ScannerPage - TODO

**Archivo a modificar:** `src/components/pages/seguridad/ScannerPage.tsx`

Cambios necesarios:

1. **Mostrar información del lote:**
```typescript
{invitado.lote && (
  <div className="flex items-center gap-3 p-4 border rounded-lg">
    <Tag className="h-5 w-5" />
    <div>
      <p className="text-sm text-muted-foreground">Lote</p>
      <p className="font-medium flex items-center gap-2">
        {invitado.lote.nombre}
        {invitado.lote.es_vip && (
          <Badge className="bg-yellow-500 gap-1">
            <Crown className="h-3 w-3" />
            VIP
          </Badge>
        )}
      </p>
    </div>
  </div>
)}
```

2. **Permitir múltiples escaneos para VIP:**
```typescript
const handleQRDetected = async (qrCode: string) => {
  setLoading(true)
  const { data, error } = await invitadosService.getInvitadoByQR(qrCode)
  setLoading(false)

  if (error) {
    // Verificar si es evento inactivo
    if (error.message === 'QR de evento inactivo') {
      toast.error('Evento Inactivo', {
        description: 'Este QR corresponde a un evento que ya no está activo',
      })
      return
    }

    toast.error('QR no válido', {
      description: error.message,
    })
    return
  }

  setInvitado(data)

  // Si ya está ingresado y NO es VIP, avisar
  if (data.ingresado && !data.lote?.es_vip) {
    toast.info('Invitado ya ingresó', {
      description: 'Este invitado ya ingresó anteriormente',
    })
  }

  // Si es VIP y ya ingresó, permitir visualización pero avisar
  if (data.ingresado && data.lote?.es_vip) {
    toast.success('VIP Verificado', {
      description: 'Invitado VIP con acceso múltiple',
    })
  }
}
```

3. **Botón especial para VIP:**
```typescript
{invitado.lote?.es_vip ? (
  // VIP: Siempre mostrar como verificado, sin botones de marcar/desmarcar
  <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
    <div className="flex items-center gap-3">
      <Crown className="h-6 w-6 text-yellow-600" />
      <div>
        <p className="font-semibold">Invitado VIP</p>
        <p className="text-sm text-muted-foreground">
          Acceso múltiple permitido
        </p>
      </div>
    </div>
  </div>
) : (
  // Normal: Botones de marcar/desmarcar ingreso
  <>{/* Botones existentes */}</>
)}
```

### 10. Agregar Gestión de Lotes en Admin - TODO

**Archivo a modificar:** `src/components/pages/admin/EventosPage.tsx`

Agregar sección de lotes después de crear/editar evento:

1. **Botón para gestionar lotes:**
```typescript
<Button
  variant="outline"
  onClick={() => {
    setSelectedEvento(evento)
    setLotesManagementOpen(true)
  }}
>
  Gestionar Lotes
</Button>
```

2. **Dialog de gestión de lotes:**
```typescript
<Dialog open={lotesManagementOpen} onOpenChange={setLotesManagementOpen}>
  <DialogContent>
    {/* Lista de lotes del evento */}
    {/* Botón para crear nuevo lote */}
    {/* Botones para editar/eliminar lotes */}
  </DialogContent>
</Dialog>
```

3. **Formulario de lote:**
```typescript
<form onSubmit={handleSubmitLote}>
  <Input label="Nombre" />
  <Input label="Cantidad Máxima" type="number" />
  <Input label="Precio" type="number" />
  <Checkbox label="Es VIP" />
</form>
```

---

## 🗄️ Migración Requerida

**IMPORTANTE:** Debes ejecutar la migración en Supabase antes de usar el sistema:

```bash
# Desde Supabase Dashboard → SQL Editor
# Ejecuta: supabase/migrations/update/002_create_lotes.sql
```

O con Supabase CLI:
```bash
cd supabase
supabase db push
```

---

## 🧪 Flujo de Uso Esperado

### Admin
1. Crear evento
2. Agregar lotes al evento:
   - "Early Bird" - 100 cupos - $50 - Normal
   - "VIP Gold" - 20 cupos - $200 - VIP
   - "Free Pass" - 50 cupos - $0 - Normal

### RRPP
1. Ver eventos activos
2. Click en banner de evento
3. Ver lotes disponibles con precios y disponibilidad
4. Seleccionar lote
5. Crear invitado con datos personales
6. QR generado automáticamente con relación al lote

### Seguridad
1. Escanear QR del invitado
2. Ver:
   - Nombre, apellido
   - Lote asignado
   - Badge VIP si corresponde
   - Quién lo invitó
   - Estado de ingreso
3. Si es VIP:
   - Puede escanear múltiples veces
   - Mostrar "Acceso múltiple permitido"
4. Si NO es VIP:
   - Solo un ingreso
   - Marcar como ingresado
5. Si evento inactivo:
   - Rechazar QR con mensaje "Evento inactivo"

---

## 📝 Tareas Pendientes

- [ ] Actualizar `RRPPLayout` con nuevos items de menú
- [ ] Modificar `RRPPDashboard` para usar rutas
- [ ] Actualizar `InvitadosPage` para manejar lotes
- [ ] Actualizar `ScannerPage` con lógica VIP
- [ ] Agregar gestión de lotes en `EventosPage` (Admin)
- [ ] Ejecutar migración `002_create_lotes.sql` en Supabase
- [ ] Testing completo del flujo
- [ ] Compilar y verificar errores

---

## 🔧 Comandos Útiles

```bash
# Compilar aplicación
cd onrrpp2
npm run build

# Ejecutar en desarrollo
npm run dev

# Aplicar migraciones
cd supabase
supabase db push
```

---

## ⚠️ Notas Importantes

1. **Lotes llenos:** El trigger SQL automáticamente rechaza crear invitados en lotes completos
2. **VIP múltiple:** Los VIP pueden ingresar varias veces (sin limite)
3. **Evento inactivo:** QR de eventos inactivos son rechazados automáticamente
4. **Precio 0:** Los lotes gratuitos se muestran como "GRATIS"
5. **Contadores automáticos:** No requieren actualización manual

---

## 🎨 Diseño Visual

### Lotes
- VIP: Badge amarillo con icono de corona
- Precio: $XX.XX o "GRATIS"
- Progreso: Barra visual (verde → amarillo → rojo)
- Disponibilidad: "X / Y disponibles"

### Escáner VIP
- Fondo amarillo/dorado
- Icono de corona
- Mensaje "Acceso múltiple permitido"
- Sin botones de marcar/desmarcar

---

Esta es la guía completa. Continúa con las tareas pendientes en el orden listado.
