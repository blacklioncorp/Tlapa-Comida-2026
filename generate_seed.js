import fs from 'fs';
import { MERCHANTS } from './src/data/seedData.js';

let sql = `-- Seed Data for Tlapa-Comida Postgres\n\n`;

// Clear existing
sql += `DELETE FROM public.products;\n`;
sql += `DELETE FROM public.merchants;\n\n`;

// Insert Merchants
for (const m of MERCHANTS) {
    const id = m.id;
    const name = m.name.replace(/'/g, "''");
    const desc = m.description ? m.description.replace(/'/g, "''") : '';
    const cat = m.category || '';
    const logo = m.logoUrl || '';
    const banner = m.bannerUrl || m.image || '';
    const prep = m.deliveryTime || '';
    const rating = m.rating || 4.5;
    const fee = m.deliveryFee || 0;
    const minOrder = m.minOrder || 0;
    const status = m.isOpen ? 'open' : 'closed';
    const coords = JSON.stringify(m.coordinates || {});
    const address = JSON.stringify(m.address || {});

    sql += `INSERT INTO public.merchants (id, name, description, category, "logoUrl", "bannerUrl", "prepTime", rating, "deliveryFee", "minOrder", status, coordinates, address) 
VALUES ('${id}', '${name}', '${desc}', '${cat}', '${logo}', '${banner}', '${prep}', ${rating}, ${fee}, ${minOrder}, '${status}', '${coords}'::jsonb, '${address}');\n`;
}

sql += `\n`;

// Insert Products
for (const m of MERCHANTS) {
    if (m.menu) {
        for (const p of m.menu) {
            const id = p.id;
            const mid = m.id;
            const name = p.name.replace(/'/g, "''");
            const desc = p.description ? p.description.replace(/'/g, "''") : '';
            const price = p.price || 0;
            const origPrice = p.price || 0;
            const cat = p.category ? p.category.replace(/'/g, "''") : '';
            const img = p.image || '';
            const avail = p.isAvailable ? 'true' : 'false';

            // Format modifiers natively
            const modifiers = JSON.stringify((p.modifierGroups || []).map(mg => ({
                id: mg.id,
                name: mg.name,
                required: mg.required,
                multiSelect: mg.multiSelect,
                minSelect: mg.minSelect,
                maxSelect: mg.maxSelect,
                options: (mg.options || []).map(o => ({
                    id: o.id,
                    name: o.name,
                    price: o.price
                }))
            }))).replace(/'/g, "''");

            sql += `INSERT INTO public.products (id, "merchantId", name, description, price, "originalPrice", category, "imageUrl", "isAvailable", modifiers)
VALUES ('${id}', '${mid}', '${name}', '${desc}', ${price}, ${origPrice}, '${cat}', '${img}', ${avail}, '${modifiers}'::jsonb);\n`;
        }
    }
}

fs.writeFileSync('supabase_seed.sql', sql);
console.log('✅ Generated supabase_seed.sql successfully!');
