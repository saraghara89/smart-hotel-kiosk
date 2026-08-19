'use strict';

const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(20),
  DATABASE_SSL: z.enum(['true', 'false']).default('true'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(30).default(10),
  HOTEL_SLUG: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid or missing environment configuration: ${names}`);
}

module.exports = Object.freeze(parsed.data);
