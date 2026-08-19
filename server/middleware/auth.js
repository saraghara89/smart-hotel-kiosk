const crypto = require('crypto');
const { sql } = require('../db/postgresDatabase');

const isProduction = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = isProduction ? '__Host-smartstay_session' : 'smartstay_session';

function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function authenticate(req, res, next) {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE];
    if (!rawToken) return res.status(401).json({ success: false, message: 'Authentication required.' });

    const tokenHash = hashToken(rawToken);
    const rows = await sql`
      SELECT s.id AS session_id, s.csrf_hash, s.expires_at,
             u.id, u.hotel_id, u.name, u.email, u.role, u.is_active
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${tokenHash}
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    req.auth = {
      sessionId: user.session_id,
      csrfHash: user.csrf_hash,
      user: {
        id: user.id,
        hotelId: user.hotel_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };

    sql`UPDATE sessions SET last_seen_at = NOW() WHERE id = ${user.session_id}`.catch(() => {});
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.auth) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const token = req.get('X-CSRF-Token');
  if (!token) return res.status(403).json({ success: false, message: 'Invalid request token.' });

  const supplied = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(req.auth.csrfHash, 'hex');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(403).json({ success: false, message: 'Invalid request token.' });
  }
  next();
}

module.exports = { authenticate, requireRole, requireCsrf, hashToken, SESSION_COOKIE };
