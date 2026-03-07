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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
    console.log('--- AUDIT START ---');

    try {
        // 1. Check Merchants
        const { data: merchants, error: mError } = await supabase.from('merchants').select('*');
        if (mError) {
            console.error('Error fetching merchants:', mError.message);
        } else {
            console.log(`Found ${merchants.length} merchants.`);
            merchants.forEach(m => console.log(` - [${m.id}] ${m.name} (Status: ${m.status}, Coordinates: ${JSON.stringify(m.coordinates)})`));
        }

        // 2. Check Users
        const { data: users, error: uError } = await supabase.from('users').select('*').limit(10);
        if (uError) {
            console.error('Error fetching users:', uError.message);
        } else {
            console.log(`Found ${users.length} users in public.users table.`);
            users.forEach(u => console.log(` - [${u.id}] ${u.email} (Role: ${u.role})`));
        }

        // 3. Check Categories
        const { data: cat, error: cError } = await supabase.from('categories').select('*');
        if (cError) {
            console.error('Error fetching categories:', cError.message);
        } else {
            console.log(`Found ${cat.length} categories.`);
        }
    } catch (err) {
        console.error('Unexpected error during audit:', err);
    }

    console.log('--- AUDIT END ---');
}

runAudit();
