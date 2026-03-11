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

async function inspectColumns() {
    console.log('--- COLUMN INSPECTION START ---');

    // Try to get one row to see keys
    const { data, error } = await supabase.from('orders').select('*').limit(1);

    if (error) {
        console.error('Error fetching from orders:', error.message);
    } else if (data.length > 0) {
        console.log('Columns found in orders row:', Object.keys(data[0]));
    } else {
        console.log('Orders table is empty. Attempting to fetch metadata via RPC or internal queries is not possible via JS SDK.');
        console.log('Checking merchants columns instead to see naming convention...');
        const { data: mData } = await supabase.from('merchants').select('*').limit(1);
        if (mData && mData.length > 0) {
            console.log('Columns found in merchants row:', Object.keys(mData[0]));
        }
    }

    console.log('--- COLUMN INSPECTION END ---');
}

inspectColumns();
