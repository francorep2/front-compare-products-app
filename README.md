# Groceries App — Comparador Super

App móvil (Expo / React Native + expo-router) para comparar precios de supermercados argentinos
(**Coto, Carrefour, Jumbo y Día**). Backend: [api-compare-products-app](https://github.com/francorep2/api-compare-products-app).

## Funciones
- Registro con código por email, login y recuperación de contraseña.
- Listas de compras con ítems y cantidades; marcar como comprado.
- Búsqueda por nombre o escaneo de código de barras, con precios por tienda.
- Comparar una lista completa: total por tienda, faltantes y tienda más barata.
- Elegir qué tiendas incluir, perfil y soporte.

## Correr local
```bash
cd groceries-app
cp .env.example .env     # EXPO_PUBLIC_API_URL = URL del backend
npm install
npx expo start
```
Builds Android con EAS (`eas.json`, perfiles `preview` = APK y `production` = AAB).

## Estructura
`src/app` pantallas (`(auth)`, `(main)`) · `src/api` cliente y tipos · `src/components` UI · `src/providers` auth/query/tema
