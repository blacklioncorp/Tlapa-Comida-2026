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
    console.log('--- ORDER INSERT TEST START ---');

    // 1. Get a random client user from the database
    const { data: users, error: uError } = await supabase.from('users').select('id, email').eq('role', 'client').limit(1);
    if (uError || !users.length) {
        console.error('Could not find a client user to test with:', uError?.message || 'No users found');
        return;
    }

    const testUser = users[0];
    console.log(`Testing with user: ${testUser.email} [${testUser.id}]`);

    // 2. Get a merchant
    const { data: merchants } = await supabase.from('merchants').select('id').limit(1);
    const merchantId = merchants[0]?.id || 'merchant-1';

    // 3. Attempt insert (Note: As anon/service key, RLS applies if we use the right token, 
    // but here we are using anon key. Without a JWT, auth.uid() is null, so it SHOULD fail RLS 
    // if RLS is on. But if we see 42501, it confirms RLS is the gatekeeper.)

    const orderData = {
        id: 'test-order-' + Date.now(),
        clientId: testUser.id,
        merchantId: merchantId,
        status: 'pending',
        total: 100,
        subtotal: 80,
        items: [],
        deliveryAddress: { street: 'Test' }
    };

    console.log('Attempting insert with orderData...', JSON.stringify(orderData, null, 2));

    const { error } = await supabase.from('orders').insert([orderData]);

    if (error) {
        console.error('Insert failed:', error.code, error.message);
    } else {
        console.log('Insert succeeded (Wait, this shouldn\'t happen with RLS if we are anonymous!)');
    }

    console.log('--- ORDER INSERT TEST END ---');
}

testOrderInsert();
