import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfsmorwxipeuvdriqzft.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmc21vcnd4aXBldXZkcmlxemZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODY1NzAsImV4cCI6MjA5NjQ2MjU3MH0.wWDRcHgal2VeB1PJWn1MNQxxzP4dJIVmErr8WNTIXD4';

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
