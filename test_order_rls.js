import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testOrderCreation() {
    console.log('--- TESTING ORDER CREATION (RLS) ---');
    // Log in as a test client
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'client1@tlapacomida.mx',
        password: 'password123'
    });

    if (authError || !authData.user) {
        console.error('Login failed:', authError?.message);
        return;
    }

    const userId = authData.user.id;
    console.log('Logged in as User ID:', userId);

    // Attempt creation
    const orderData = {
        orderNumber: `TLP-TEST-${Date.now()}`,
        clientId: userId,
        merchantId: '809fe0f7-dca4-4f05-ab92-911855b461cd', // Random merchant UUID format
        driverId: null,
        status: 'created',
        items: [],
        payment: { method: 'cash', status: 'pending' },
        deliveryAddress: { street: 'Main 123' }
    };

    const { data, error } = await supabase.from('orders').insert([orderData]).select();

    if (error) {
        console.error('❌ Insert failed!', error);

        // Test if we can read the orders at least
        const { data: readData, error: readError } = await supabase.from('orders').select('id, clientId').limit(1);
        console.log('Read test:', readError ? readError.message : `Success, got ${readData.length} records`);
    } else {
        console.log('✅ Insert successful!', data);
    }
}

testOrderCreation();
