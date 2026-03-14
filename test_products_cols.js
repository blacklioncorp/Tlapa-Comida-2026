import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function check() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) console.error(error);
    else if (data && data.length > 0) console.log("Columns:", Object.keys(data[0]));
    else console.log("No data");
}
check();
