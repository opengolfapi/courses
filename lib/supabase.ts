import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

// Anon-key client only — never use service_role here. Server admin actions live in lib/supabase-admin.
export const supabase = createClient(url, key);
