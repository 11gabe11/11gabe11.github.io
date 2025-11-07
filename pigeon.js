// pigeon.js — Supabase client (JS module)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⬇️ put your real values here (Project Settings → API)
const SUPABASE_URL = 'https://uzzcupnudyhvzdtwpjiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6emN1cG51ZHlodnpkdHdwaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3MTUsImV4cCI6MjA3ODA1ODcxNX0.ez6WS7tUemjAKr8fCyM2_WH4fNg6aoo7UoudFqmFd8E';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
