// Database client configuration for Supabase Postgres and Storage
// Exports the official @supabase/supabase-js client and the pg Pool for session storage.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Startup validation for critical environment variables
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];
const missingEnv = requiredEnv.filter(variable => !process.env[variable]);

if (missingEnv.length > 0) {
  console.error(`❌ CRITICAL STARTUP ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// 1. Initialize official server-side Supabase Client using the service role key to bypass RLS safely
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 2. Initialize pg connection pool (for connect-pg-simple session store)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

console.log('✅ Supabase database clients initialized successfully.');

module.exports = {
  db: pool,
  supabase
};
