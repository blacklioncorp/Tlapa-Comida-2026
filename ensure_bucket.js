import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
        env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
// We need the SERVICE ROLE KEY to create buckets
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreate() {
    console.log("Checking buckets...");
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
        console.error("List error:", listError.message);
        return;
    }
    
    console.log("Existing buckets:", buckets.map(b => b.name));

    if (!buckets.some(b => b.name === 'product-images')) {
        console.log("Creating product-images bucket...");
        const { data, error } = await supabase.storage.createBucket('product-images', { public: true });
        if (error) {
            console.error("Error creating bucket:", error.message);
            console.log("If this failed due to RLS, please manually create a public bucket named 'product-images' in the Supabase Dashboard.");
        } else {
            console.log("Bucket created successfully.");
        }
    } else {
        console.log("Bucket already exists.");
    }
}
checkAndCreate();
