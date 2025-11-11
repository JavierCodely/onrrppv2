# 🚀 Guía de Deploy en Vercel

Esta guía te ayudará a desplegar tu aplicación onrrpp2 en Vercel con Supabase Realtime funcionando correctamente.

## 📋 Prerrequisitos

1. Una cuenta en [Vercel](https://vercel.com)
2. Tu proyecto Supabase configurado
3. Las credenciales de tu proyecto Supabase

## 🔧 Configuración

### Paso 1: Obtener las credenciales de Supabase

1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Navega a `Settings` → `API`
3. Copia los siguientes valores:
   - **Project URL** (ejemplo: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (la clave pública que comienza con `eyJ...`)

### Paso 2: Deploy en Vercel

#### Opción A: Deploy desde el dashboard de Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de Git
4. Vercel detectará automáticamente que es un proyecto Vite
5. **Configura las variables de entorno:**
   - Haz clic en **"Environment Variables"**
   - Añade las siguientes variables:
     ```
     VITE_SUPABASE_URL = tu_project_url_de_supabase
     VITE_SUPABASE_ANON_KEY = tu_anon_key_de_supabase
     ```
6. Haz clic en **"Deploy"**

#### Opción B: Deploy desde la CLI de Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Iniciar sesión en Vercel
vercel login

# Deploy (desde la raíz del proyecto)
vercel

# Añadir variables de entorno
vercel env add VITE_SUPABASE_URL
# Pega tu URL de Supabase cuando te lo pida

vercel env add VITE_SUPABASE_ANON_KEY
# Pega tu clave anon de Supabase cuando te lo pida

# Deploy a producción
vercel --prod
```

## 🔍 Verificación

Después del deploy, verifica que todo funcione:

1. **Login**: Prueba iniciar sesión con tu usuario
2. **Realtime**: Los cambios en la base de datos deberían reflejarse en tiempo real
3. **Storage**: Las imágenes deberían cargarse correctamente
4. **Rutas**: Navega por las diferentes secciones para verificar que las rutas funcionen

## 🔐 Configuración de Supabase para Producción

Asegúrate de que tu dominio de Vercel esté autorizado en Supabase:

1. Ve a tu proyecto Supabase
2. `Authentication` → `URL Configuration`
3. Añade tu URL de Vercel a **Site URL** y **Redirect URLs**:
   ```
   https://tu-proyecto.vercel.app
   ```

## 🐛 Solución de Problemas

### Error: "Missing Supabase environment variables"
- Verifica que hayas configurado correctamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel
- Las variables deben tener el prefijo `VITE_` para que Vite las reconozca

### Realtime no funciona
- Verifica que las tablas tengan Realtime habilitado en Supabase
- Revisa las políticas RLS (Row Level Security)
- Comprueba la consola del navegador en busca de errores de WebSocket

### Error 404 en rutas
- El archivo `vercel.json` ya está configurado para manejar el routing de SPA
- Si sigues teniendo problemas, verifica que el archivo `vercel.json` esté en la raíz del proyecto

### Problemas con el build
- Asegúrate de que no haya errores de TypeScript ejecutando: `npm run build` localmente
- Verifica que todas las dependencias estén en `package.json`

## 📝 Notas Importantes

- **Variables de Entorno**: Después de cambiar variables de entorno en Vercel, necesitas hacer un redeploy
- **HTTPS**: Vercel proporciona HTTPS automáticamente, lo cual es necesario para WebSockets/Realtime
- **Dominios Personalizados**: Puedes configurar un dominio personalizado en la configuración de tu proyecto en Vercel

## 🔄 Actualizar el Deploy

Para actualizar tu aplicación desplegada:

```bash
# Commit tus cambios
git add .
git commit -m "tus cambios"
git push

# Vercel desplegará automáticamente los cambios
```

O manualmente:

```bash
vercel --prod
```

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Vite](https://vitejs.dev/guide/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

