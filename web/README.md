# Changuito (beta) — versión web

Versión web para probar el comparador desde el navegador. Mismo estilo que la app móvil (`../groceries-app`): ola roja con gradiente, tarjetas blancas redondeadas, barra inferior de 5 íconos, mismos colores (`--primary #FD1648`, `--tertiary #4A5899`, ver `src/styles.css`) y el mismo backend.

Stack: Vite + React 18 + TypeScript + react-router. Sin librerías de UI; íconos `react-icons/io5` (los mismos Ionicons de la app).

## Correr
```bash
cd web
cp .env.example .env     # VITE_API_URL = URL del backend
npm install
npm run dev              # http://localhost:5173
npm run build            # typecheck + build en dist/
```

El backend permite CORS desde `http://localhost:5173` y `:4173` por defecto. Para otro dominio (hosting de la web), configurar `CORS_ORIGINS` (lista separada por comas) o `CORS_ORIGIN_REGEX` en el backend.

## Pantallas
| Ruta | Qué hace |
|---|---|
| `/login`, `/register`, `/forgot` | Login, registro con código por mail (OTP) y recuperación de contraseña |
| `/home` | Saludo, última lista, reportar error, accesos rápidos |
| `/new-list` | Armar una lista con productos y guardarla |
| `/search` | Buscar por nombre o por código de barras (escribiéndolo: la web no escanea), elegir tiendas, agregar resultados a una lista |
| `/purchases` | Mis listas |
| `/list/:id` | Marcar, editar cantidades, agregar/quitar y **Comparar Lista** |
| `/compare/:taskId` | Resultado de la comparación: tienda más barata, total por tienda y faltantes |
| `/profile`, `/profile/edit` | Perfil y edición |

## Notas
- El token se guarda en `localStorage` (`changuito_token`); un 401 cierra la sesión.
- El backend gratuito en Render se duerme tras 15 min sin uso: la primera acción puede tardar ~1 minuto.
