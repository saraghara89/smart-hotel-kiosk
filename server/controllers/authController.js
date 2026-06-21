const { readDatabase } = require('../db/fileDatabase');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const db = await readDatabase();
    const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid login details.' });
    }

    const { password: hiddenPassword, ...safeUser } = user;
    res.json({ success: true, message: 'Login completed successfully.', data: safeUser });
  } catch (error) {
    next(error);
  }
}

module.exports = { login };
