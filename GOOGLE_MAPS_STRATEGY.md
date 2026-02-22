# 🗺️ Google Maps API — Estrategia de Costos $0

## Resumen de APIs Utilizadas

| API | SKU | Gratis/Mes | Uso Estimado/Mes | Costo |
|-----|-----|-----------|------------------|-------|
| Maps JavaScript API | Dynamic Maps (Essentials) | 10,000 | ~500 cargas de mapa | **$0** |
| Directions API | Legacy (via Maps JS) | 10,000 | ~600 rutas (con caché) | **$0** |
| Maps URLs | N/A (gratis ilimitado) | ∞ | Botón "Navegar" | **$0** |

> 📊 **Total estimado: ~1,100 llamadas/mes** vs **10,000 gratis** = **$0**

---

## 🧠 Estrategias de Reducción de Llamadas

### 1. Caché de Rutas en localStorage (TTL: 30 min)
```
Restaurante A → Destino B = ruta calculada UNA vez
Si se vuelve a pedir la misma ruta dentro de 30 minutos,
se usa la versión cacheada (0 llamadas API).
```

Las rutas en Tlapa son cortas (~5 km) y las condiciones de tráfico 
cambian muy poco, así que 30 minutos de caché es seguro.

### 2. Coordenadas Pre-Sembradas
Todos los restaurantes tienen coordenadas hardcodeadas en `MapsCache.js`:
```javascript
const MERCHANT_COORDS = {
    'm1': { lat: 17.5455, lng: -98.5750 }, // La Cantina del Sabor
    'm2': { lat: 17.5480, lng: -98.5780 }, // Pollos El Fogón
    // ... etc
};
```
**Resultado:** 0 llamadas de Geocoding API para restaurantes conocidos.

### 3. Caché de Geocoding Permanente
Cuando se geocodifica una dirección nueva (ej: dirección del cliente),
se guarda **permanentemente** en localStorage. Las direcciones no se mueven,
así que una vez geocodificada, nunca se vuelve a llamar.

### 4. Deduplicación de Solicitudes
Si dos componentes piden la misma ruta al mismo tiempo, solo se hace
**una llamada API** y ambos reciben el resultado.

### 5. Fallback Gracioso
Cuando la API key no está configurada, el mapa muestra un placeholder
animado con SVG que simula la ruta. **La app nunca se rompe.**

---

## 📈 Escenarios de Uso

| Escenario | Pedidos/Día | Llamadas API/Mes | ¿Dentro del free tier? |
|-----------|------------|-------------------|----------------------|
| Piloto (5 pedidos/día) | 5 | ~150 + 150 mapas = 300 | ✅ Sí ($0) |
| Normal (20 pedidos/día) | 20 | ~600 + 600 = 1,200 | ✅ Sí ($0) |
| Alto (50 pedidos/día) | 50 | ~1,500 + 1,500 = 3,000 | ✅ Sí ($0) |
| Máximo (100 pedidos/día) | 100 | ~3,000 + 3,000 = 6,000 | ✅ Sí ($0) |

> ⚡ Incluso con **100 pedidos diarios**, seguimos dentro del free tier.
> El caché reduce las llamadas reales un **60-80%** vs sin caché.

---

## 🔑 Configuración

1. Obtener API key en [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)
2. Habilitar APIs:
   - ✅ Maps JavaScript API
   - ✅ Directions API
3. Restringir la key al dominio de la app
4. Crear archivo `.env` en la raíz del proyecto:
```
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

---

## 📁 Archivos del Sistema

```
src/
├── services/
│   ├── GoogleMapsLoader.js   # Singleton loader (carga 1 sola vez)
│   └── MapsCache.js          # Caché agresivo + coords pre-sembradas
├── components/
│   └── DeliveryMap.jsx       # Componente de mapa reutilizable
└── pages/
    ├── client/OrderTracking.jsx   # ← usa DeliveryMap
    └── delivery/ActiveDelivery.jsx # ← usa DeliveryMap
```

---

## ⚠️ Cumplimiento con Términos de Servicio

Este sistema cumple con los [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms):
- ✅ Muestra atribución de Google en el mapa
- ✅ No cachea tiles del mapa (solo datos de rutas)
- ✅ No hace scraping ni obras derivadas
- ✅ Usa key restringida por dominio
- ✅ Incluye internalUsageAttributionId para tracking
