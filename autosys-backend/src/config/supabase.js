'use strict';

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Service-role client — bypasses RLS. NEVER expose to frontend.
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth:   { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-app-version': process.env.npm_package_version || '1.0.0' } },
    db:     { schema: 'public' },
  }
);

module.exports = { supabase };
