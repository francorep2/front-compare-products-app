# Changuito (beta) — versión web

Versión web para probar el comparador desde el navegador. Mismo estilo que la app móvil (`../groceries-app`): ola roja con gradiente, tarjetas blancas redondeadas, barra inferior de 5 íconos y los mismos colores de marca. En escritorio pasa a un layout con **barra lateral**; además tiene **modo oscuro** (Perfil > Apariencia).

Stack: Vite + React 18 + TypeScript + react-router + TanStack Query. Sin librerías de UI; íconos `react-icons/io5` (los mismos Ionicons de la app).

## Correr
```bash
cd web
cp .env.example .env     # VITE_API_URL = URL del backend
npm install
npm run dev              # http://localhost:5173
npm test                 # tests unitarios (vitest)
npm run build            # typecheck + build en dist/
```
El backend permite CORS desde `http://localhost:5173` y `:4173`; para otro dominio configurar `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` en el backend.

## Qué tiene
| Pantalla | Qué hace |
|---|---|
| Login / registro (OTP por mail) / recuperar contraseña | Con panel de marca en escritorio |
| **Inicio** | Saludo, buscador rápido, última lista con progreso, estadísticas (listas, productos, comparaciones, ahorro detectado), comparaciones y listas recientes |
| **Nueva lista** | Uno por uno o **pegando una lista** (“2 leche”, “yerba x3”, “fideos (2)”) |
| **Mis listas** | Tarjetas con progreso, duplicar, eliminar. Pestaña **Comparaciones**: historial guardado |
| **Detalle de lista** | Renombrar, cantidades con +/−, marcar, quitar comprados, compartir (WhatsApp/copiar), **elegir producto exacto** (compara el mismo EAN en todas las tiendas), elegir supermercados, comparar y ver la última comparación |
| **Resultado de comparación** | Ganador y **ahorro**, ranking por tienda, **mejor combinación** (cada producto donde sale más barato, agrupado por tienda), tabla **producto × tienda** con el más barato resaltado, faltantes con link a buscar, volver a comparar, compartir, eliminar |
| **Comparar carritos** | Dos comparaciones lado a lado (dos listas, o la misma en dos momentos): totales por tienda con variación, resumen y productos en común |
| **Buscar** | Por nombre o código de barras (escáner con la cámara si el navegador soporta `BarcodeDetector`), resultados **agrupados por producto** con precio por tienda y ahorro, orden/filtro de promos, búsquedas recientes, agregar a una lista |
| **Perfil** | Datos, supermercados activos, tema claro/oscuro/automático, borrar datos locales |

## Estructura
```
src/
  api/      cliente HTTP, tipos y endpoints; queries.ts = hooks de TanStack Query
  lib/      utilidades puras con tests (formato, parseo de listas, agrupado por producto, texto para compartir)
  ui/       componentes base (botones/campos/modal/toasts/tabs/skeletons…)
  layout/   Shell (barra lateral + barra inferior + ola), PageHeader, AuthScreen
  features/ ProductCard, ProductPicker, AddToListModal, Scanner, SupportModal
  pages/    una por pantalla
  styles/   tokens.css (colores/tema), base.css, components.css, pages.css
```

## Notas
- Token en `localStorage` (`changuito_token`); un 401 cierra la sesión y limpia el cache.
- El producto exacto elegido por ítem y las búsquedas recientes se guardan **solo en este navegador**.
- El backend gratuito en Render se duerme tras 15 min sin uso: la primera acción puede tardar ~1 minuto.
- Las comparaciones guardadas antes de la v2 no traen el detalle por producto: se ven igual, solo sin las pestañas nuevas.
