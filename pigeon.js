// pigeon.js — Supabase client (JS module)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⬇️ put your real values here (Project Settings → API)
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
