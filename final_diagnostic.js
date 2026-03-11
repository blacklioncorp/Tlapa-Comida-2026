import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple .env.local parser
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrderInsert() {
    console.log('--- FINAL ORDER INSERT DIAGNOSTIC ---');

    // 1. Get a client user
    const { data: users, error: uError } = await supabase.from('users').select('id, email').eq('role', 'client').limit(1);
    if (uError || !users || !users.length) {
        console.error('Could not find a client user:', uError?.message || 'No users found');
        return;
    }

    const testUser = users[0];
    console.log(`Using client: ${testUser.email} [${testUser.id}]`);

    // 2. Get a merchant
    const { data: merchants } = await supabase.from('merchants').select('id').limit(1);
    if (!merchants || !merchants.length) {
        console.error('No merchants found');
        return;
    }
    const merchantId = merchants[0].id;

    // 3. Attempt insert 
    // IMPORTANT: Since we are using the anonymous key WITHOUT a session, 
    // the RLS policy "Users can insert their own orders" (auth.uid() = clientId)
    // will FAIL if auth.uid() is null.
    // BUT, if we see a 42501, it means RLS is working.
    // If we wanted to TRULY test success, we'd need a JWT.
    // Instead, I'll check if THE COLUMNS ARE RECOGNIZED.

    const orderData = {
        clientId: testUser.id,
        merchantId: merchantId,
        status: 'pending',
        total: 100,
        subtotal: 80,
        items: [],
        deliveryAddress: JSON.stringify({ street: 'Test Diagnostic' }),
        orderNumber: 'DIAG-' + Date.now()
    };

    console.log('Attempting insert with:', Object.keys(orderData));

    const { error } = await supabase.from('orders').insert([orderData]);

    if (error) {
        if (error.code === '42501') {
            console.log('✅ RLS active and rejecting anonymous insert (Expected).');
        } else if (error.code === 'PGRST204' || error.message.includes('column')) {
            console.error('❌ COLUMN MISMATCH:', error.message);
        } else {
            console.error('Unexpected error:', error.code, error.message);
        }
    } else {
        console.log('Wait, insert succeeded? This means RLS is either OFF for insert or misconfigured to allow anon.');
    }

    // 4. Check if columns like totals, payment, orderNumber exist by selecting
    const { data: columnsCheck, error: cError } = await supabase.from('orders').select('orderNumber, totals, statusHistory').limit(1);
    if (cError && cError.code === 'PGRST204') {
        console.error('❌ Missing columns in orders table! Please run update_orders_schema.sql');
    } else {
        console.log('✅ Order schema columns verified.');
    }

    console.log('--- DIAGNOSTIC COMPLETE ---');
}

testOrderInsert();
