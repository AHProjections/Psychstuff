const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

router.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = db.prepare('SELECT id, email, name, role, provider_id, avatar_color, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  res.json({ user });
});

module.exports = router;
