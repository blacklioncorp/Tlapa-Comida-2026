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

async function listUsers() {
    console.log('--- USER CANDIDATE LIST ---');

    const { data: merchants, error: mErr } = await supabase.from('users').select('email').eq('role', 'merchant').limit(5);
    console.log('Merchant candidates:', merchants?.map(m => m.email) || []);

    const { data: drivers, error: dErr } = await supabase.from('users').select('email').eq('role', 'driver').limit(5);
    console.log('Driver candidates:', drivers?.map(d => d.email) || []);

    console.log('--- LIST COMPLETE ---');
}

listUsers();
