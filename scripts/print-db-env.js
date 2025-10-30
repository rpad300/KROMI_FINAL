#!/usr/bin/env node
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch {}

function maskSecret(url) {
  if (!url) return null;
  try {
    const u = new URL(url.replace('postgres://','postgresql://'));
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.replace(/:(.*?)@/, ':***@');
  }
}

const out = {
  SUPABASE_DB_URL: maskSecret(process.env.SUPABASE_DB_URL),
  DATABASE_URL: maskSecret(process.env.DATABASE_URL),
  SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST || null,
  SUPABASE_DB_USER: process.env.SUPABASE_DB_USER || null,
  SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME || null,
  SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT || null,
};

console.log(JSON.stringify(out, null, 2));

