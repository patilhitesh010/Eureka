// Database client configuration for Supabase Postgres and Storage
// Exports the official @supabase/supabase-js client and the pg Pool for session storage.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Startup validation for critical environment variables
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];
const missingEnv = requiredEnv.filter(variable => !process.env[variable]);

if (missingEnv.length > 0) {
  console.warn(`⚠️ WARNING: Missing required environment variables: ${missingEnv.join(', ')}`);
}

// 1. Initialize official server-side Supabase Client safely
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// 2. Initialize pg connection pool (for connect-pg-simple session store)
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
  });
}

console.log('✅ Supabase database clients initialized.');

module.exports = {
  db: pool,
  supabase
};
