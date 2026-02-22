import { db } from '../firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { MERCHANTS, CATEGORIES, ALL_USERS } from '../data/seedData';

export const seedDatabase = async () => {
    try {
        const batch = writeBatch(db);

        // 1. Seed Categories
        CATEGORIES.forEach(cat => {
            const catRef = doc(collection(db, 'categories'), cat.id);
            batch.set(catRef, cat);
        });

        // 2. Seed Users
        ALL_USERS.forEach(user => {
            const userRef = doc(collection(db, 'users'), user.id);
            batch.set(userRef, user);
        });

        // 3. Seed Merchants and their Menus
        MERCHANTS.forEach(merchant => {
            // Separa el menú del resto de los datos del merchant
            const { menu, ...merchantData } = merchant;

            // Crea el documento principal del negocio en la colección 'restaurants'
            const merchantRef = doc(collection(db, 'restaurants'), merchant.id);
            // Agregamos el campo ownerId necesario para las reglas de seguridad:
            // Buscamos el owner asociado en ALL_USERS o le asignamos un default
            const owner = ALL_USERS.find(u => u.merchantId === merchant.id);
            merchantData.ownerId = owner ? owner.id : 'user-admin';

            batch.set(merchantRef, merchantData);

            // Crea los platillos dentro de la subcolección 'menu'
            if (menu && menu.length > 0) {
                menu.forEach(item => {
                    const itemRef = doc(collection(db, 'restaurants', merchant.id, 'menu'), item.id);
                    batch.set(itemRef, item);
                });
            }
        });

        // Ejecutar todas las escrituras de forma atómica
        await batch.commit();
        console.log("✅ BASE DE DATOS INICIALIZADA CON ÉXITO EN FIRESTORE");
        return true;
    } catch (error) {
        console.error("🔥 Error inicializando la base de datos:", error);
        return false;
    }
};
