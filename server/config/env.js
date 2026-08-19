'use strict';

const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(20),
  DATABASE_SSL: z.enum(['true', 'false']).default('true'),
  SESSION_SECRET: z.string().min(32),
  TOKEN_ISSUER: z.string().min(3).default('smart-stay-api'),
  TOKEN_AUDIENCE: z.string().min(3).default('smart-stay-admin'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid or missing environment configuration: ${names}`);
}

module.exports = Object.freeze(parsed.data);
