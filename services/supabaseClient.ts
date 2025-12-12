import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xtsexrrtgsrovppbacav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0c2V4cnJ0Z3Nyb3ZwcGJhY2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mjc5MjEsImV4cCI6MjA4MTAwMzkyMX0.Pb-6p1Ubs8BRm9dFABkL4eqtzOr7j7RJgjeS1VulP4k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);