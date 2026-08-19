'use strict';

const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const useSsl = process.env.DATABASE_SSL !== 'false';

const sql = postgres(databaseUrl, {
  ssl: useSsl ? 'require' : false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true,
  transform: { undefined: null },
  onnotice: () => {}
});

async function healthCheck() {
  const [row] = await sql`select now() as server_time`;
  return row;
}

async function closeDatabase() {
  await sql.end({ timeout: 5 });
}

module.exports = { sql, healthCheck, closeDatabase };
