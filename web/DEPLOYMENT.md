# Deployment en Azure App Service

## Configuración Completada

### ✅ GitHub Actions Workflow
- Compila la aplicación Next.js en modo standalone
- Empaqueta todos los archivos necesarios
- Deploya automáticamente en Azure cuando hay push a la rama `main`

### ✅ Configuración de Next.js
- `output: 'standalone'` para optimizar el empaquetado
- Imágenes sin optimización (compatible con Azure App Service)
- Puerto configurado a 8080 (estándar de Azure)

### ✅ Comando de Inicio
El comando configurado en Azure:
```bash
node_modules/.bin/next start -p 8080
```

## Pasos para Verificar el Deployment

### 1. Configuración en Azure Portal

Verifica que tu Azure App Service tenga la siguiente configuración:

**Configuración General:**
- Stack: Node 20 LTS
- Startup Command: `node_modules/.bin/next start -p 8080`

**Variables de Entorno (Application Settings):**
```
PORT=8080
NODE_ENV=production
```

Para autenticación real (cuando se implemente), agregar:
```
AUTH_SECRET=tu-secreto-seguro-aqui
```

### 2. Verificar GitHub Secrets

Asegúrate de que tu repositorio tenga el siguiente secret configurado:
- `AZUREAPPSERVICE_PUBLISHPROFILE_D714FF7A49F94EC5ADB11F943A71ABCB`

Para verificar:
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Verifica que el secret esté presente

### 3. Proceso de Deployment

1. **Push a main**: El workflow se activa automáticamente
2. **Build**: Se instalan dependencias y compila Next.js
3. **Deploy**: Se sube a Azure App Service
4. **Verify**: Accede a https://ernibots-v2.azurewebsites.net

### 4. Verificar que Funciona

Después del deployment, verifica:

- [ ] La aplicación está accesible en la URL de Azure
- [ ] El middleware redirige a `/login` cuando no hay autenticación
- [ ] La página de login se muestra correctamente con el diseño glitch
- [ ] Los assets estáticos (CSS, fuentes) cargan correctamente
- [ ] El formulario de login funciona (crea la cookie y redirige)
- [ ] La página principal es accesible después del login
- [ ] El botón de logout elimina la cookie y redirige a login

## Limitaciones Actuales

⚠️ **Autenticación Simulada**: El sistema acepta cualquier usuario/contraseña y solo guarda una cookie. Para producción real, necesitarás:

1. **Backend de Autenticación**: Implementar API routes en `/app/api/auth/`
2. **Base de Datos**: Conectar a Azure SQL, Cosmos DB, o similar
3. **Tokens JWT**: Usar tokens firmados en lugar de cookies simples
4. **Validación**: Verificar credenciales contra base de datos

## Troubleshooting

### Error: "Application Error"
- Verifica los logs en Azure Portal → Monitoring → Log Stream
- Confirma que el startup command es correcto
- Verifica que `NODE_ENV=production` esté configurado

### Error: "Cannot find module"
- El build standalone debe incluir todas las dependencias
- Verifica que el workflow no esté eliminando `node_modules`

### Assets no cargan (404)
- Verifica que `NEXT_PUBLIC_ASSET_PREFIX` esté vacío o configurado correctamente
- Los assets en `/public` deben estar en el artifact

### Redirección infinita
- Verifica que la cookie `auth-token` se esté creando correctamente
- Revisa la configuración del middleware

## Próximos Pasos

Para hacer que la aplicación sea production-ready:

1. **Implementar autenticación real** con base de datos
2. **Agregar variables de entorno** para secrets
3. **Configurar HTTPS** (Azure lo proporciona por defecto)
4. **Agregar logging y monitoring** con Application Insights
5. **Implementar rate limiting** para prevenir ataques
6. **Agregar validación de formularios** en backend
7. **Implementar CSRF protection**
8. **Configurar CORS** si hay API externa

## Contacto

Para reportar problemas o sugerencias, consulta con el equipo de desarrollo.
