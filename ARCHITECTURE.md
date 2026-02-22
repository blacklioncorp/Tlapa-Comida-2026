# Arquitectura Firebase — Tlapa Comida
## Guía de Producción para Firestore + Cloud Functions

---

## 1. Modelo de Datos NoSQL (Firestore)

### Principio: **Denormalizar para minimizar reads**
En Firestore pagas por cada lectura. La regla de oro es: **un documento = una pantalla**.

### Colecciones Principales

```
firestore/
├── users/{userId}              ← Perfil + addresses + trustScore
├── restaurants/{restaurantId}  ← Info + menú completo (denormalizado)
├── orders/{orderId}            ← Todo el pedido en 1 documento
├── drivers/{driverId}          ← Estado + ubicación en tiempo real
└── driver_locations/{driverId} ← Subcolección para GeoQueries (opcional)
```

### 1.1 Documento `users/{userId}`

```json
{
  "uid": "abc123",
  "email": "cliente@example.com",
  "displayName": "María López",
  "phone": "7571234567",
  "role": "client",
  "avatarUrl": "https://...",
  "trustScore": 100,
  "fcmTokens": ["token1_movil", "token2_web"],
  "savedAddresses": [
    {
      "id": "addr_1",
      "label": "Casa",
      "street": "Calle Juárez #15",
      "colony": "Centro",
      "reference": "Portón azul frente a la papelería Don Memo",
      "coordinates": { "lat": 17.5445, "lng": -98.5730 },
      "phone": "7571234567"
    }
  ],
  "stats": {
    "totalOrders": 23,
    "cancelledOrders": 1,
    "lastOrderAt": "2026-02-20T..."
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 1.2 Documento `restaurants/{restaurantId}`

```json
{
  "id": "restaurant_1",
  "ownerId": "uid_merchant_1",
  "name": "La Terraza",
  "isOpen": true,
  "phone": "7579876543",
  "fcmTokens": ["token_tablet_cocina"],
  "coordinates": { "lat": 17.5512, "lng": -98.5756 },
  "address": {
    "street": "Calle Juárez #10, Centro",
    "colony": "Centro"
  },
  "deliveryFee": 25,
  "minOrder": 100,
  "commissionRate": 0.15,
  "avgPrepTime": 20,
  "rating": 4.8,
  "menu": [
    {
      "id": "item_1",
      "name": "Pizza Pepperoni",
      "price": 180,
      "category": "Pizzas",
      "isAvailable": true,
      "image": "https://...",
      "baseIngredients": ["Salsa de tomate", "Mozzarella", "Pepperoni"],
      "modifierGroups": [
        {
          "id": "mg_size",
          "name": "Tamaño",
          "required": true,
          "multiSelect": false,
          "options": [
            { "id": "opt_med", "name": "Mediana", "price": 0 },
            { "id": "opt_gde", "name": "Grande", "price": 40 }
          ]
        },
        {
          "id": "mg_extras",
          "name": "Extras",
          "required": false,
          "multiSelect": true,
          "options": [
            { "id": "opt_cheese", "name": "Doble queso", "price": 30 },
            { "id": "opt_bacon", "name": "Tocino", "price": 25 }
          ]
        }
      ]
    }
  ],
  "updatedAt": "Timestamp"
}
```

> **¿Por qué el menú va DENTRO del documento?** Porque cuando el cliente abre un restaurante, necesitas 1 read, no 1 + N reads por cada platillo.  
> **Límite**: Un documento Firestore soporta hasta 1MB. Un menú de 200 items con modifiers ≈ 50-80KB. Estás bien.

### 1.3 Documento `orders/{orderId}` — El más importante

```json
{
  "orderNumber": "TLP-20260221-A3F2",
  "clientId": "uid_client_1",
  "merchantId": "restaurant_1",
  "driverId": null,

  "status": "created",

  "items": [
    {
      "itemId": "item_1",
      "name": "Pizza Pepperoni",
      "price": 180,
      "quantity": 2,
      "modifiers": [
        {
          "groupId": "mg_size",
          "groupName": "Tamaño",
          "selected": [{ "id": "opt_gde", "name": "Grande", "price": 40 }]
        },
        {
          "groupId": "mg_extras",
          "groupName": "Extras",
          "selected": [
            { "id": "opt_cheese", "name": "Doble queso", "price": 30 },
            { "id": "opt_bacon", "name": "Tocino", "price": 25 }
          ]
        }
      ],
      "removedIngredients": ["Cebolla"],
      "notes": "",
      "unitPrice": 275,
      "subtotal": 550
    }
  ],

  "totals": {
    "subtotal": 550,
    "deliveryFee": 25,
    "serviceFee": 15,
    "discount": 0,
    "total": 590
  },

  "payment": {
    "method": "cash",
    "status": "pending_cash",
    "paidAt": null,
    "cashCollected": null
  },

  "deliveryAddress": {
    "street": "Calle Juárez #15, Centro",
    "colony": "Centro",
    "reference": "Portón azul frente a la papelería Don Memo",
    "coordinates": { "lat": 17.5445, "lng": -98.5730 },
    "phone": "7571234567"
  },

  "timestamps": {
    "createdAt": "2026-02-21T07:30:00Z",
    "confirmedAt": null,
    "preparingAt": null,
    "readyAt": null,
    "searchingDriverAt": null,
    "pickedUpAt": null,
    "onTheWayAt": null,
    "deliveredAt": null,
    "cancelledAt": null
  },

  "statusHistory": [
    { "status": "created", "at": "2026-02-21T07:30:00Z", "actor": "uid_client_1" }
  ],

  "eta": {
    "estimatedDelivery": "2026-02-21T08:05:00Z",
    "prepMinutes": 20,
    "deliveryMinutes": 15
  },

  "cancelReason": null,
  "rating": null,
  "notes": "",
  "createdAt": "Timestamp (server)",
  "updatedAt": "Timestamp (server)"
}
```

> **Clave**: `items[].unitPrice` es el precio calculado en el SERVIDOR (Cloud Function), no el que envió el frontend. Esto previene manipulación de precios.

### 1.4 Documento `drivers/{driverId}`

```json
{
  "uid": "uid_driver_1",
  "displayName": "Carlos Sánchez",
  "isOnline": true,
  "isAvailable": true,
  "currentOrderId": null,
  "vehicleType": "moto",
  "phone": "7575551234",
  "fcmTokens": ["token_celular_driver"],
  "location": {
    "geohash": "9ewmx",
    "lat": 17.5500,
    "lng": -98.5740,
    "updatedAt": "Timestamp"
  },
  "stats": {
    "rating": 4.7,
    "totalDeliveries": 156,
    "todayDeliveries": 5,
    "todayEarnings": 325
  }
}
```

### 1.5 Índices Necesarios

```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "merchantId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "driverId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 2. Cloud Functions — Trigger `onDocumentCreated`

### Flujo al crear una orden:

```
Frontend (createOrder)
    │
    ▼
Firestore escribe orders/{orderId}  ──► Cloud Function se dispara
                                            │
                                            ├─ 1. Valida precios vs menu real
                                            ├─ 2. Verifica restaurante abierto
                                            ├─ 3. Recalcula totales en servidor
                                            ├─ 4. Valida trustScore del cliente
                                            ├─ 5. Actualiza el documento con precios correctos
                                            └─ 6. Envía push al restaurante
```

### Flujo al cambiar status a `ready`:

```
Merchant cambia status → "ready"
    │
    ▼
onDocumentUpdated ──► Cloud Function
                          │
                          ├─ 1. Cambia status → "searching_driver"
                          ├─ 2. Query drivers online + cercanos (GeoHash)
                          ├─ 3. Envía push al driver más cercano
                          ├─ 4. Si no acepta en 30s → siguiente driver
                          └─ 5. Actualiza orden con driverId
```

---

## 3. Realtime Listeners — Best Practices

### ❌ Lo que haces ahora (costoso):

```javascript
// PROBLEMA: El driver escucha TODAS las órdenes
query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
// Cada vez que CUALQUIER orden cambia → read de TODOS los documentos
```

### ✅ Lo que debes hacer:

```javascript
// CLIENTE: Solo escucha SUS pedidos activos (1-2 docs máximo)
const q = query(
  collection(db, 'orders'),
  where('clientId', '==', userId),
  where('status', 'not-in', ['delivered', 'cancelled']),
  limit(5)
);

// MERCHANT: Solo escucha pedidos de SU restaurante activos
const q = query(
  collection(db, 'orders'),
  where('merchantId', '==', merchantId),
  where('status', 'in', ['created','confirmed','preparing','ready','searching_driver']),
);

// DRIVER: Solo escucha SU pedido actual (1 doc)
const q = doc(db, 'orders', currentOrderId);
// Para disponibles: query con status 'searching_driver' + limit
const available = query(
  collection(db, 'orders'),
  where('status', '==', 'searching_driver'),
  limit(10)
);
```

### Reglas de oro para listeners:

| Regla | Razón |
|-------|-------|
| Siempre usar `where` + `limit` | Reduce docs escuchados |
| Filtrar por status activos | No escuchar históricos |
| `doc()` para pedido individual | 1 read por cambio, no N |
| Desuscribir en `useEffect` cleanup | Evita listeners huérfanos |
| No escuchar en páginas inactivas | Usa `visibilitychange` API |

### Patrón de visibilidad (ahorro masivo):

```javascript
useEffect(() => {
  let unsubscribe = null;

  const startListening = () => {
    if (unsubscribe) return;
    unsubscribe = onSnapshot(query, callback);
  };

  const stopListening = () => {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  };

  // Solo escuchar cuando la pestaña está visible
  const handleVisibility = () => {
    document.hidden ? stopListening() : startListening();
  };

  document.addEventListener('visibilitychange', handleVisibility);
  startListening();

  return () => {
    stopListening();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}, []);
```

---

## 4. Asignación de Repartidores — Cloud Function

### Estrategia: **Broadcast con timeout escalonado**

```
Orden lista ("ready")
    │
    ▼
Cloud Function: findNearestDriver
    │
    ├─ 1. Query: drivers WHERE isOnline=true AND isAvailable=true
    │     AND geohash STARTS WITH "9ewm" (≈5km radio de Tlapa)
    │
    ├─ 2. Calcular distancia real (Haversine) para cada driver
    │
    ├─ 3. Ordenar por: distancia ASC, rating DESC
    │
    ├─ 4. Tomar top 3 candidatos
    │
    ├─ 5. Enviar push al #1: "Nuevo pedido de La Terraza — $25 ganancia"
    │     └─ Escribir en drivers/{id}/offers/{orderId} con TTL 30s
    │
    ├─ 6. Si no acepta en 30s → push al #2
    │
    ├─ 7. Si no acepta en 30s → push al #3
    │
    └─ 8. Si ninguno acepta → marcar orden como "no_driver_found"
           y notificar al merchant
```

### GeoHash para queries de proximidad:

```
Tlapa de Comonfort ≈ geohash "9ewmx..."

Radio 1km → prefijo longitud 6: "9ewmx6"
Radio 5km → prefijo longitud 5: "9ewmx"
Radio 15km → prefijo longitud 4: "9ewm"

Query: WHERE geohash >= "9ewmx" AND geohash < "9ewmy"
```

> **Nota**: Firestore no soporta queries geoespaciales nativas. Usamos GeoHash (librería `geofire-common`) para convertir lat/lng en strings comparables.

---

## 5. Security Rules (Firestore)

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: solo tú puedes leer/escribir tu perfil
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Restaurants: cualquiera lee, solo el dueño escribe
    match /restaurants/{restaurantId} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/restaurants/$(restaurantId)).data.ownerId == request.auth.uid;
    }

    // Orders: las Cloud Functions manejan la lógica crítica
    match /orders/{orderId} {
      allow read: if request.auth != null && (
        resource.data.clientId == request.auth.uid ||
        resource.data.driverId == request.auth.uid ||
        get(/databases/$(database)/documents/restaurants/$(resource.data.merchantId)).data.ownerId == request.auth.uid
      );
      // Solo el backend (Cloud Functions) debe crear/actualizar órdenes
      // El frontend llama a un callable function, no escribe directo
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }

    // Driver locations: el driver escribe, el sistema lee
    match /drivers/{driverId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == driverId;
    }
  }
}
```

---

## Resumen de Costos Estimados

| Operación | Reads/día (100 pedidos) | Costo aprox |
|-----------|------------------------|-------------|
| Cliente abre app + lista restaurantes | ~500 | Gratis (tier) |
| Cliente ve menú (1 read por restaurante) | ~300 | Gratis |
| Listener de pedido activo (1 doc × ~8 cambios) | ~800 | Gratis |
| Merchant listener (5 docs activos promedio) | ~2,000 | Gratis |
| Driver listener (1 doc + 10 disponibles) | ~1,500 | Gratis |
| **Total diario estimado** | **~5,100** | **Gratis** |

> Firebase Free tier: 50,000 reads/día. Con 100 pedidos/día estás a 10% del límite.
