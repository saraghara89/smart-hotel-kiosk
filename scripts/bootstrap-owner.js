'use strict';

require('dotenv').config();
const argon2 = require('argon2');
const { z } = require('zod');
const { sql, closeDatabase } = require('../server/db/postgres');

const input = z.object({
  HOTEL_SLUG: z.string().min(1),
  BOOTSTRAP_OWNER_NAME: z.string().trim().min(2).max(120),
  BOOTSTRAP_OWNER_EMAIL: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  BOOTSTRAP_OWNER_PASSWORD: z.string().min(14).max(256)
}).parse(process.env);

async function main() {
  const hotels = await sql`SELECT id FROM hotels WHERE slug = ${input.HOTEL_SLUG} AND is_active = TRUE LIMIT 1`;
  if (!hotels[0]) throw new Error('Configured hotel was not found.');

  const hotelId = hotels[0].id;
  const existing = await sql`
    SELECT id FROM users WHERE hotel_id = ${hotelId} AND lower(email) = ${input.BOOTSTRAP_OWNER_EMAIL} LIMIT 1
  `;
  if (existing[0]) throw new Error('An account with this email already exists for the hotel.');

  const passwordHash = await argon2.hash(input.BOOTSTRAP_OWNER_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
  });

  await sql`
    INSERT INTO users (hotel_id, name, email, password_hash, role)
    VALUES (${hotelId}, ${input.BOOTSTRAP_OWNER_NAME}, ${input.BOOTSTRAP_OWNER_EMAIL}, ${passwordHash}, 'owner')
  `;

  console.log('Owner account created. Remove BOOTSTRAP_OWNER_* environment variables now.');
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error(error.message);
    try { await closeDatabase(); } catch (_) {}
    process.exit(1);
  });
