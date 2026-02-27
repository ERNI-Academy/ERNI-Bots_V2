# ERNI BOTS V2 | EL PROTOCOLO FRAGMENTADO

Sistema de autenticación con diseño cyberpunk/feudal adaptado a Next.js.

## Características

- **Página de Login**: Diseño "glitch feudalism" con efectos CRT, aberración cromática y lluvia de símbolos medievales
- **Protección de Rutas**: Middleware que redirige automáticamente al login si no hay autenticación
- **Modo Oscuro**: Tema oscuro forzado con colores cyan (#00ffff) como primario
- **Animaciones**: Efectos de parpadeo, jitter, y glitch en botones
- **Tipografía**: Space Grotesk como fuente principal con Material Symbols para iconos

## Estructura del Proyecto

```
app/
  ├── login/
  │   └── page.tsx          # Página de login con diseño glitch feudalism
  ├── layout.tsx            # Layout principal con fuentes y modo oscuro
  ├── page.tsx              # Página principal protegida
  └── globals.css           # Estilos globales y animaciones personalizadas
middleware.ts               # Protección de rutas y redirección al login
```

## Cómo Funciona

1. **Acceso Inicial**: Al intentar acceder a cualquier ruta, el middleware verifica si existe una cookie `auth-token`
2. **Sin Autenticación**: Si no hay token, redirige automáticamente a `/login`
3. **Login**: El usuario ingresa credenciales y al enviar el formulario, se crea una cookie de autenticación
4. **Acceso Concedido**: Con la cookie válida, el usuario puede acceder a todas las rutas protegidas
5. **Logout**: El botón de desconexión elimina la cookie y redirige al login

## Desarrollo

Para ejecutar el proyecto:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) - serás redirigido automáticamente a `/login`

## Personalización

### Autenticación Real

Actualmente, el sistema acepta cualquier usuario/contraseña. Para implementar autenticación real:

1. **Modifica** [app/login/page.tsx](app/login/page.tsx) en la función `handleSubmit`
2. **Agrega** validación backend (API route en `/app/api/auth/login/route.ts`)
3. **Implementa** JWT o session tokens en lugar de cookies simples
4. **Conecta** con tu base de datos o servicio de autenticación

### Rutas Públicas

Para añadir rutas que no requieran autenticación, edita [middleware.ts](middleware.ts):

```typescript
const publicPaths = ["/login", "/registro", "/publica"];
```

### Estilos

Todos los estilos personalizados están en [app/globals.css](app/globals.css):
- Animaciones: `blink`, `jitter`
- Efectos: `crt-overlay`, `chromatic-aberration`
- Clases: `glitch-button`, `medieval-rain`

## Tecnologías

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **TypeScript 5**
- **Google Fonts**: Space Grotesk
- **Material Symbols**: Iconografía

## Próximos Pasos

- [ ] Implementar autenticación real con JWT
- [ ] Agregar API routes para login/logout
- [ ] Conectar con base de datos
- [ ] Añadir validación de formularios
- [ ] Implementar manejo de errores
- [ ] Agregar página de registro
- [ ] Implementar recuperación de contraseña

---

**SYSTEM_STATUS**: OPERATIONAL | **VERSION**: 1.0.4 | **PROTOCOL**: FEUDAL_OVERRIDE
