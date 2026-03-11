import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: users, error: ue } = await supabase.from('users').select('*').eq('email', 'terraza@tlapacomida.mx');
  console.log("USERS:", users, ue);

  const { data: merchants, error: me } = await supabase.from('merchants').select('*');
  console.log("MERCHANTS:", merchants, me);
}
test();
