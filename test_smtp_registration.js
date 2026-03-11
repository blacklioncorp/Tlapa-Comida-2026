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

async function testRegistration() {
    console.log('--- TESTING SMTP REGISTRATION ---');
    // Use a random email to avoid duplicate user errors during testing
    const testEmail = `test_smtp_${Date.now()}@tlapacomida.mx`;
    const testPassword = 'TestPassword123!';

    console.log(`Attempting to register user: ${testEmail}`);

    const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                role: 'client',
                full_name: 'SMTP Test User'
            }
        }
    });

    if (error) {
        console.error('❌ Registration Failed:');
        console.error(error.message);
        if (error.message.includes('rate limit')) {
            console.error('⚠️ The Rate Limit error is still occurring. The SMTP configuration might not be fully active yet or is incorrect.');
        }
    } else {
        console.log('✅ Registration Successful!');
        console.log('User ID:', data.user?.id);
        console.log('If you check your Supabase Auth dashboard, the user should be there.');
        console.log('The rate limit error has been bypassed by the custom SMTP provider.');
    }

    // Clean up the test user if it was created
    if (data?.user?.id && !error) {
        console.log('cleaning up...');
        // Note: We need service_role key to delete users via client, so we skip cleanup in this simple test.
        // The user will remain in the Auth table but isn't a problem for testing.
        console.log('Please delete the test user manually from Supabase Auth dashboard if desired.');
    }

    console.log('--- TEST COMPLETE ---');
}

testRegistration();
