const crypto = require('crypto');
const argon2 = require('argon2');
const { z } = require('zod');
const { sql } = require('../db/postgres');
const { hashToken, SESSION_COOKIE } = require('../middleware/auth');

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(256)
});

const isProduction = process.env.NODE_ENV === 'production';
const SESSION_HOURS = Math.min(Math.max(Number(process.env.SESSION_TTL_HOURS) || 8, 1), 24);

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60 * 1000
  };
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid login request.' });

    const hotelSlug = process.env.HOTEL_SLUG;
    if (!hotelSlug) throw new Error('HOTEL_SLUG is not configured.');

    const { email, password } = parsed.data;
    const rows = await sql`
      SELECT u.id, u.hotel_id, u.name, u.email, u.password_hash, u.role, u.is_active
      FROM users u
      JOIN hotels h ON h.id = u.hotel_id
      WHERE h.slug = ${hotelSlug}
        AND h.is_active = TRUE
        AND lower(u.email) = ${email}
        AND u.is_active = TRUE
      LIMIT 1
    `;

    if (rows.length !== 1 || !(await argon2.verify(rows[0].password_hash, password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(sessionToken);
    const csrfHash = hashToken(csrfToken);
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO sessions (user_id, token_hash, csrf_hash, expires_at, ip_address, user_agent)
        VALUES (${user.id}, ${tokenHash}, ${csrfHash}, ${expiresAt}, ${req.ip || null}, ${String(req.get('user-agent') || '').slice(0, 1000)})
      `;
      await tx`UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ${user.id}`;
      await tx`
        INSERT INTO audit_logs (hotel_id, user_id, action, entity_type, entity_id, ip_address)
        VALUES (${user.hotel_id}, ${user.id}, 'auth.login', 'user', ${user.id}, ${req.ip || null})
      `;
    });

    res.cookie(SESSION_COOKIE, sessionToken, cookieOptions());
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: { id: user.id, hotelId: user.hotel_id, name: user.name, email: user.email, role: user.role },
      csrfToken
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: req.auth.user });
}

async function logout(req, res, next) {
  try {
    await sql`UPDATE sessions SET revoked_at = NOW() WHERE id = ${req.auth.sessionId}`;
    await sql`
      INSERT INTO audit_logs (hotel_id, user_id, action, entity_type, entity_id, ip_address)
      VALUES (${req.auth.user.hotelId}, ${req.auth.user.id}, 'auth.logout', 'user', ${req.auth.user.id}, ${req.ip || null})
    `;
    res.clearCookie(SESSION_COOKIE, { path: '/', secure: isProduction, sameSite: 'strict', httpOnly: true });
    res.set('Cache-Control', 'no-store');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, me, logout };
