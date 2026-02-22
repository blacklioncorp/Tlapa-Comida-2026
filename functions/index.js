/**
 * Cloud Functions — Tlapa Comida
 *
 * 1. onOrderCreated:  Valida precios, verifica restaurante, notifica merchant
 * 2. onOrderUpdated:  Maneja FSM, busca repartidor cuando status = 'ready'
 * 3. findNearestDriver: Asignación automática con timeout escalonado
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as geofire from "geofire-common";

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// ═══════════════════════════════════════════════════════════
// FSM — Valid transitions (mirror of frontend)
// ═══════════════════════════════════════════════════════════
const VALID_TRANSITIONS = {
    created: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["searching_driver"],
    searching_driver: ["picked_up", "cancelled"],
    picked_up: ["on_the_way"],
    on_the_way: ["delivered"],
    delivered: [],
    cancelled: [],
};

function isValidTransition(from, to) {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ═══════════════════════════════════════════════════════════
// 1. ON ORDER CREATED — Validation + Notification
// ═══════════════════════════════════════════════════════════
export const onOrderCreated = onDocumentCreated(
    { document: "orders/{orderId}", region: "us-east1" },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const order = snap.data();
        const orderId = event.params.orderId;
        const orderRef = db.doc(`orders/${orderId}`);

        try {
            // ── Step 1: Fetch restaurant from Firestore ──
            const restaurantSnap = await db.doc(`restaurants/${order.merchantId}`).get();
            if (!restaurantSnap.exists) {
                await orderRef.update({
                    status: "cancelled",
                    cancelReason: "Restaurante no encontrado",
                    "timestamps.cancelledAt": new Date().toISOString(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                return;
            }

            const restaurant = restaurantSnap.data();

            // ── Step 2: Verify restaurant is open ──
            if (!restaurant.isOpen) {
                await orderRef.update({
                    status: "cancelled",
                    cancelReason: "El restaurante cerró antes de confirmar",
                    "timestamps.cancelledAt": new Date().toISOString(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                return;
            }

            // ── Step 3: Validate & recalculate prices server-side ──
            const menuMap = new Map();
            for (const item of restaurant.menu || []) {
                menuMap.set(item.id, item);
            }

            let serverSubtotal = 0;
            const validatedItems = [];
            let priceManipulated = false;

            for (const orderItem of order.items) {
                const menuItem = menuMap.get(orderItem.itemId || orderItem.id);

                if (!menuItem) {
                    // Item not found in menu — flag but don't cancel
                    validatedItems.push({ ...orderItem, _warning: "item_not_in_menu" });
                    serverSubtotal += orderItem.subtotal || 0;
                    continue;
                }

                if (!menuItem.isAvailable) {
                    await orderRef.update({
                        status: "cancelled",
                        cancelReason: `"${menuItem.name}" ya no está disponible`,
                        "timestamps.cancelledAt": new Date().toISOString(),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    return;
                }

                // Recalculate unit price from server menu data
                let serverUnitPrice = menuItem.price;

                // Add modifier prices from server data
                if (orderItem.modifiers?.length > 0) {
                    for (const mod of orderItem.modifiers) {
                        const serverGroup = menuItem.modifierGroups?.find(
                            (g) => g.id === mod.groupId
                        );
                        if (!serverGroup) continue;

                        for (const sel of mod.selected || []) {
                            const serverOption = serverGroup.options?.find(
                                (o) => o.id === sel.id
                            );
                            if (serverOption) {
                                serverUnitPrice += serverOption.price || 0;
                            }
                        }
                    }
                }

                // Legacy extras support
                if (orderItem.selectedExtras?.length > 0) {
                    for (const extra of orderItem.selectedExtras) {
                        serverUnitPrice += extra.price || 0;
                    }
                }

                const serverItemSubtotal = serverUnitPrice * (orderItem.quantity || 1);

                // Check if client sent a different price (tolerance: $1 MXN)
                if (Math.abs(serverItemSubtotal - (orderItem.subtotal || 0)) > 1) {
                    priceManipulated = true;
                }

                validatedItems.push({
                    ...orderItem,
                    unitPrice: serverUnitPrice,
                    subtotal: serverItemSubtotal,
                    _serverValidated: true,
                });

                serverSubtotal += serverItemSubtotal;
            }

            // ── Step 4: Recalculate totals ──
            const deliveryFee = order.totals?.deliveryFee || restaurant.deliveryFee || 25;
            const serviceFee = order.totals?.serviceFee || Math.round(serverSubtotal * 0.05);
            const discount = order.totals?.discount || 0;
            const serverTotal = serverSubtotal + deliveryFee + serviceFee - discount;

            // ── Step 5: Check trust score for cash orders ──
            let trustWarning = null;
            if (order.payment?.method === "cash" && order.clientId) {
                const userSnap = await db.doc(`users/${order.clientId}`).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    const trustScore = userData.trustScore ?? 100;
                    if (trustScore < 30) {
                        await orderRef.update({
                            status: "cancelled",
                            cancelReason: "Cuenta suspendida — contacta soporte",
                            "timestamps.cancelledAt": new Date().toISOString(),
                            updatedAt: FieldValue.serverTimestamp(),
                        });
                        return;
                    }
                    if (trustScore < 60) {
                        trustWarning = "Cliente con historial de cancelaciones";
                    }
                }
            }

            // ── Step 6: Update order with server-validated data ──
            const updateData = {
                items: validatedItems,
                "totals.subtotal": serverSubtotal,
                "totals.deliveryFee": deliveryFee,
                "totals.serviceFee": serviceFee,
                "totals.total": serverTotal,
                _serverValidated: true,
                _priceManipulated: priceManipulated,
                updatedAt: FieldValue.serverTimestamp(),
            };

            if (trustWarning) {
                updateData._trustWarning = trustWarning;
            }

            await orderRef.update(updateData);

            // ── Step 7: Send push to restaurant ──
            if (restaurant.fcmTokens?.length > 0) {
                const notification = {
                    title: "🔔 Nuevo pedido",
                    body: `${validatedItems.length} producto(s) — $${serverTotal.toFixed(0)} MXN`,
                };

                const payload = {
                    notification,
                    data: {
                        type: "new_order",
                        orderId,
                        total: String(serverTotal),
                    },
                    tokens: restaurant.fcmTokens,
                };

                try {
                    await messaging.sendEachForMulticast(payload);
                } catch (pushErr) {
                    console.warn("Push notification failed:", pushErr.message);
                }
            }

            console.log(
                `✅ Order ${orderId} validated — $${serverTotal} — manipulated: ${priceManipulated}`
            );
        } catch (error) {
            console.error(`❌ onOrderCreated error for ${orderId}:`, error);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// 2. ON ORDER UPDATED — FSM enforcement + driver assignment
// ═══════════════════════════════════════════════════════════
export const onOrderUpdated = onDocumentUpdated(
    { document: "orders/{orderId}", region: "us-east1" },
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();
        if (!before || !after) return;

        // Only act when status actually changed
        if (before.status === after.status) return;

        const orderId = event.params.orderId;
        const newStatus = after.status;

        // ── Validate FSM transition ──
        if (!isValidTransition(before.status, newStatus)) {
            console.warn(
                `⚠️ Invalid transition on ${orderId}: ${before.status} → ${newStatus}. Reverting.`
            );
            await db.doc(`orders/${orderId}`).update({
                status: before.status,
                _lastInvalidTransition: `${before.status} → ${newStatus}`,
                updatedAt: FieldValue.serverTimestamp(),
            });
            return;
        }

        // ── When order becomes "ready" → auto-search for driver ──
        if (newStatus === "ready") {
            await db.doc(`orders/${orderId}`).update({
                status: "searching_driver",
                "timestamps.readyAt": new Date().toISOString(),
                "timestamps.searchingDriverAt": new Date().toISOString(),
                statusHistory: [
                    ...(after.statusHistory || []),
                    { status: "searching_driver", at: new Date().toISOString(), actor: "system" },
                ],
                updatedAt: FieldValue.serverTimestamp(),
            });

            // Trigger driver search (Broadcast)
            await broadcastOrderToDrivers(orderId, after);
        }

        // ── When delivered → update stats ──
        if (newStatus === "delivered") {
            try {
                // Update client stats
                if (after.clientId) {
                    await db.doc(`users/${after.clientId}`).update({
                        "stats.totalOrders": FieldValue.increment(1),
                        "stats.lastOrderAt": new Date().toISOString(),
                    });
                }
                // Update driver stats and handle cash limits securely
                if (after.driverId) {
                    await db.runTransaction(async (transaction) => {
                        const driverRef = db.doc(`drivers/${after.driverId}`);
                        const driverDoc = await transaction.get(driverRef);

                        if (!driverDoc.exists) return;

                        const dData = driverDoc.data();
                        let newCashInHand = dData.cashInHand || 0;
                        const maxCashLimit = dData.maxCashLimit || 1000;
                        let isBlockedDueToCash = dData.isBlockedDueToCash || false;

                        // Exclusión Financiera: Si el repartidor pertenece exclusivamente a este local,
                        // el efectivo cobrado se rinde internamente al restaurante, no suma deuda a la plataforma.
                        const isInternalFleetForThisOrder = dData.assignedRestaurantId === after.merchantId;

                        // Solo sumar a la deuda a repartidores generales y si fue pago en efectivo
                        if (after.payment?.method === 'cash' && !isInternalFleetForThisOrder) {
                            const total = after.totals?.total || 0;
                            const fee = after.totals?.deliveryFee || 0;
                            const cashCollected = total - fee; // El repartidor se queda su tarifa, debe el resto a la plataforma

                            newCashInHand += cashCollected;

                            if (newCashInHand >= maxCashLimit) {
                                isBlockedDueToCash = true;
                            }
                        }

                        const driverUpdates = {
                            isAvailable: !isBlockedDueToCash, // Unavailable if blocked
                            currentOrderId: null,
                            "stats.totalDeliveries": FieldValue.increment(1),
                            "stats.todayDeliveries": FieldValue.increment(1),
                            "stats.todayEarnings": FieldValue.increment(after.totals?.deliveryFee || 0),
                            cashInHand: newCashInHand,
                            isBlockedDueToCash
                        };

                        if (isBlockedDueToCash) {
                            driverUpdates.isOnline = false; // Desconectar del pool
                        }

                        transaction.update(driverRef, driverUpdates);
                    });
                }
            } catch (err) {
                console.warn("Stats update failed:", err.message);
            }
        }

        // ── When cancelled → update trust score if client cancelled late ──
        if (newStatus === "cancelled") {
            const lateCancel = ["preparing", "searching_driver"].includes(before.status);
            if (lateCancel && after.clientId) {
                try {
                    await db.doc(`users/${after.clientId}`).update({
                        trustScore: FieldValue.increment(-15),
                        "stats.cancelledOrders": FieldValue.increment(1),
                    });
                } catch (err) {
                    console.warn("Trust score update failed:", err.message);
                }
            }
            // Free the driver if one was assigned
            if (after.driverId) {
                try {
                    await db.doc(`drivers/${after.driverId}`).update({
                        isAvailable: true,
                        currentOrderId: null,
                    });
                } catch (err) {
                    console.warn("Driver release failed:", err.message);
                }
            }
        }
    }
);

// ═══════════════════════════════════════════════════════════
// 3. DRIVER BROADCAST — Envío de Push a los Online (Batalla por el Pedido)
// ═══════════════════════════════════════════════════════════
async function broadcastOrderToDrivers(orderId, orderData) {
    try {
        // Obtenemos info del restaurante para la push notification
        const restaurantSnap = await db
            .doc(`restaurants/${orderData.merchantId}`)
            .get();
        if (!restaurantSnap.exists) return;

        const restaurant = restaurantSnap.data();

        // Buscar a TODOS los repartidores que estén online y disponibles, no bloqueados por efectivo, verificados y no bloqueados del sistema
        const activeDriversSnap = await db
            .collection("drivers")
            .where("isOnline", "==", true)
            .where("isAvailable", "==", true)
            .where("isBlockedDueToCash", "==", false)
            .where("isVerified", "==", true)
            .get();

        if (activeDriversSnap.empty) {
            console.warn(`No hay repartidores online/verificados para el pedido ${orderId}`);
            return;
        }

        let allActiveDrivers = [];
        activeDriversSnap.forEach(doc => {
            const data = doc.data();
            // Validacion extra por precaución
            if (data.isBlocked !== true) {
                allActiveDrivers.push(data);
            }
        });

        // ── Filtro 2: Flota Exclusiva vs Flota General ──
        // Primero verificamos si hay repartidores exclusivos DE ESTE restaurante online
        const exclusiveDrivers = allActiveDrivers.filter(d => d.assignedRestaurantId === orderData.merchantId);

        let targetDrivers = [];
        if (exclusiveDrivers.length > 0) {
            // Si hay exclusivos disponibles, el pedido SOLO va para ellos.
            console.log(`Enviando pedido ${orderId} a FLOTA EXCLUSIVA del restaurante ${orderData.merchantId}`);
            targetDrivers = exclusiveDrivers;
        } else {
            // Si no hay exclusivos, el pedido sale a la FLOTA GENERAL (los que tienen assignedRestaurantId = null o vacio)
            console.log(`Enviando pedido ${orderId} a FLOTA GENERAL.`);
            targetDrivers = allActiveDrivers.filter(d => !d.assignedRestaurantId);
        }

        // Extraer todos los tokens de FCM de los repartidores target
        let tokens = [];
        targetDrivers.forEach(driver => {
            if (driver.fcmTokens && Array.isArray(driver.fcmTokens)) {
                tokens = tokens.concat(driver.fcmTokens);
            }
        });

        // Filtrar duplicados
        tokens = [...new Set(tokens)];

        if (tokens.length === 0) {
            console.warn(`Target drivers no tienen fcmTokens para pedido ${orderId}`);
            return;
        }

        // Mandar un Push Broadcast (Grito al mundo de los repartidores)
        const payload = {
            notification: {
                title: `🛵 ¡Nuevo pedido de ${restaurant.name}!`,
                body: `Ganancia estimada: $${orderData.totals?.deliveryFee || 0} — ¡Tócalo para aceptar!`,
            },
            data: {
                type: "order_searching",
                orderId,
            },
            tokens: tokens,
        };

        const response = await messaging.sendEachForMulticast(payload);

        console.log(
            `✅ Broadcast enviado a ${tokens.length} dispositivos para el pedido ${orderId}. Exitosos: ${response.successCount}, Fallidos: ${response.failureCount}`
        );
    } catch (error) {
        console.error(`❌ broadcastOrderToDrivers error for ${orderId}:`, error);
    }
}

// ═══════════════════════════════════════════════════════════
// 4. SCHEDULED: Clean stale driver locations (every hour)
// ═══════════════════════════════════════════════════════════
export const cleanStaleDrivers = onSchedule(
    { schedule: "every 60 minutes", region: "us-east1" },
    async () => {
        const staleThreshold = Date.now() - 30 * 60 * 1000; // 30 min ago

        const snap = await db
            .collection("drivers")
            .where("isOnline", "==", true)
            .get();

        const batch = db.batch();
        let count = 0;

        snap.forEach((doc) => {
            const data = doc.data();
            const lastUpdate = data.location?.updatedAt?.toMillis?.() ||
                new Date(data.location?.updatedAt || 0).getTime();

            if (lastUpdate < staleThreshold) {
                batch.update(doc.ref, { isOnline: false });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Marked ${count} stale drivers as offline`);
        }
    }
);

// ═══════════════════════════════════════════════════════════
// 5. LIQUIDATE DEBT — Clear driver's cash in hand (Safe Transaction)
// ═══════════════════════════════════════════════════════════
export const liquidateDebt = onCall({ region: "us-east1" }, async (request) => {
    // Nota: Aquí podrías comprobar permisos (request.auth.token.admin == true)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para liquidar deuda.');
    }

    const { driverId, amountPaid } = request.data;
    if (!driverId || typeof amountPaid !== 'number' || amountPaid <= 0) {
        throw new HttpsError('invalid-argument', 'driverId o amountPaid inválido.');
    }

    const driverRef = db.doc(`drivers/${driverId}`);

    try {
        await db.runTransaction(async (t) => {
            const docSnap = await t.get(driverRef);
            if (!docSnap.exists) {
                throw new HttpsError('not-found', 'Repartidor no encontrado.');
            }

            const data = docSnap.data();
            let newCashInHand = (data.cashInHand || 0) - amountPaid;
            if (newCashInHand < 0) newCashInHand = 0; // Prevent negative

            const maxLimit = data.maxCashLimit || 1000;
            let isBlocked = data.isBlockedDueToCash || false;

            // Si el pago baja la deuda por debajo del límite, quitar el bloqueo
            if (newCashInHand < maxLimit) {
                isBlocked = false;
            }

            t.update(driverRef, {
                cashInHand: newCashInHand,
                isBlockedDueToCash: isBlocked
            });

            // Generar registro inmutable para auditoría
            const txRef = db.collection('transactions_history').doc();
            t.set(txRef, {
                type: 'debt_liquidation_office',
                driverId: driverId,
                amount: amountPaid,
                previousDebt: data.cashInHand || 0,
                newDebt: newCashInHand,
                createdAt: FieldValue.serverTimestamp(),
                adminId: request.auth.uid
            });
        });

        return { success: true, message: 'Deuda liquidada exitosamente.' };
    } catch (error) {
        console.error("Error en liquidateDebt:", error);
        throw new HttpsError('internal', 'Error procesando la liquidación.', error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 6. CREATE ROLE USER — Safe User Creation from Admin Dashboard
// ═══════════════════════════════════════════════════════════
export const createRoleUser = onCall({ region: "us-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para crear usuarios.');
    }

    const { email, password, displayName, role, merchantId, driverData } = request.data;
    if (!email || !password || !role) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos (email, password, role).');
    }

    try {
        const authAdmin = getAuth();
        const userRecord = await authAdmin.createUser({
            email,
            password,
            displayName: displayName || email.split('@')[0],
        });

        const userData = {
            id: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: role,
            createdAt: new Date().toISOString(),
            isActive: true,
            isBlocked: false,
        };

        if (role === 'merchant') {
            userData.merchantId = merchantId || null;
        }

        await db.collection('users').doc(userRecord.uid).set(userData);

        // If it's a driver and they passed initial data from the form
        if (role === 'driver' && driverData) {
            await db.collection('drivers').doc(userRecord.uid).set({
                ...driverData,
                createdAt: new Date().toISOString(),
                isBlocked: false,
                isVerified: false,
                isOnline: false,
                isAvailable: false,
            });
        }

        return { success: true, uid: userRecord.uid, message: `Usuario ${role} creado correctamente.` };
    } catch (error) {
        console.error("Error creating role user:", error);
        throw new HttpsError('internal', error.message || 'Error al crear la cuenta de usuario.');
    }
});
