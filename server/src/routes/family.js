const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  const token = auth.slice(7);
  const session = db.prepare(`
    SELECT fs.user_id, fu.username, fu.display_name, fu.avatar_color, fu.phone
    FROM family_sessions fs
    JOIN family_users fu ON fu.id = fs.user_id
    WHERE fs.token = ? AND fs.expires_at > datetime('now')
  `).get(token);
  if (!session) return res.status(401).json({ error: 'Session expired' });
  req.familyUser = session;
  next();
}

const todoSelect = `
  SELECT t.*,
    tc.name as category_name, tc.color as category_color, tc.icon as category_icon,
    creator.display_name as created_by_name, creator.avatar_color as created_by_color,
    completer.display_name as completed_by_name
  FROM todos t
  LEFT JOIN todo_categories tc ON tc.id = t.category_id
  LEFT JOIN family_users creator ON creator.id = t.created_by
  LEFT JOIN family_users completer ON completer.id = t.completed_by
`;

function formatTodo(t) {
  return { ...t, completed: t.completed === 1 };
}

// Auth
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = db.prepare('SELECT * FROM family_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO family_sessions (user_id, token, expires_at) VALUES (?,?,?)').run(user.id, token, expiresAt);
  const { password_hash: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post('/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization.slice(7);
  db.prepare('DELETE FROM family_sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar_color, phone FROM family_users WHERE id = ?').get(req.familyUser.user_id);
  res.json({ user });
});

router.patch('/auth/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  const user = db.prepare('SELECT * FROM family_users WHERE id = ?').get(req.familyUser.user_id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE family_users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), user.id);
  res.json({ ok: true });
});

// Users
router.get('/users', requireAuth, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, avatar_color, phone FROM family_users').all();
  res.json({ users });
});

router.patch('/users/me', requireAuth, (req, res) => {
  const { display_name, phone, avatar_color } = req.body;
  db.prepare(`UPDATE family_users SET
    display_name = COALESCE(?, display_name),
    phone = COALESCE(?, phone),
    avatar_color = COALESCE(?, avatar_color)
    WHERE id = ?`).run(display_name || null, phone !== undefined ? phone : null, avatar_color || null, req.familyUser.user_id);
  const user = db.prepare('SELECT id, username, display_name, avatar_color, phone FROM family_users WHERE id = ?').get(req.familyUser.user_id);
  res.json({ user });
});

// Categories
router.get('/categories', requireAuth, (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM todo_categories ORDER BY name').all() });
});

router.post('/categories', requireAuth, (req, res) => {
  const { name, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO todo_categories (name, color, icon, created_by) VALUES (?,?,?,?)')
    .run(name, color || '#6366F1', icon || '📋', req.familyUser.user_id);
  res.json({ category: db.prepare('SELECT * FROM todo_categories WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/categories/:id', requireAuth, (req, res) => {
  const { name, color, icon } = req.body;
  db.prepare('UPDATE todo_categories SET name=COALESCE(?,name), color=COALESCE(?,color), icon=COALESCE(?,icon) WHERE id=?')
    .run(name || null, color || null, icon || null, req.params.id);
  res.json({ category: db.prepare('SELECT * FROM todo_categories WHERE id = ?').get(req.params.id) });
});

router.delete('/categories/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE todos SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM todo_categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Todos
router.get('/todos', requireAuth, (req, res) => {
  const { category_id, priority, completed, sort = 'priority' } = req.query;
  let query = todoSelect + ' WHERE 1=1';
  const params = [];
  if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (completed !== undefined) { query += ' AND t.completed = ?'; params.push(completed === 'true' ? 1 : 0); }
  const sortMap = {
    priority: `ORDER BY t.completed ASC, CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.deadline ASC NULLS LAST`,
    deadline: 'ORDER BY t.completed ASC, CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END, t.deadline ASC',
    created: 'ORDER BY t.completed ASC, t.created_at DESC',
    alpha: 'ORDER BY t.completed ASC, t.title ASC',
  };
  query += ' ' + (sortMap[sort] || sortMap.priority);
  res.json({ todos: db.prepare(query).all(...params).map(formatTodo) });
});

router.post('/todos', requireAuth, (req, res) => {
  const { title, description, category_id, priority, deadline } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const result = db.prepare('INSERT INTO todos (title, description, category_id, priority, deadline, created_by) VALUES (?,?,?,?,?,?)')
    .run(title.trim(), description || null, category_id || null, priority || 'medium', deadline || null, req.familyUser.user_id);
  const todo = db.prepare(todoSelect + ' WHERE t.id = ?').get(result.lastInsertRowid);
  res.json({ todo: formatTodo(todo) });
});

router.put('/todos/:id', requireAuth, (req, res) => {
  const { title, description, category_id, priority, deadline } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  db.prepare(`UPDATE todos SET
    title = ?,
    description = ?,
    category_id = ?,
    priority = ?,
    deadline = ?,
    updated_at = datetime('now')
    WHERE id = ?`).run(
    title.trim(),
    description || null,
    category_id || null,
    priority || 'medium',
    deadline || null,
    req.params.id
  );
  const todo = db.prepare(todoSelect + ' WHERE t.id = ?').get(req.params.id);
  res.json({ todo: formatTodo(todo) });
});

router.patch('/todos/:id/complete', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT completed FROM todos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const nowDone = existing.completed === 1 ? 0 : 1;
  db.prepare(`UPDATE todos SET completed=?, completed_by=?, completed_at=?, updated_at=datetime('now') WHERE id=?`)
    .run(nowDone, nowDone ? req.familyUser.user_id : null, nowDone ? new Date().toISOString() : null, req.params.id);
  const todo = db.prepare(todoSelect + ' WHERE t.id = ?').get(req.params.id);
  res.json({ todo: formatTodo(todo) });
});

router.delete('/todos/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// SMS webhook (Twilio)
router.post('/sms/webhook', (req, res) => {
  const { From, Body } = req.body;
  res.set('Content-Type', 'text/xml');
  if (!From || !Body) return res.send('<Response><Message>Invalid request.</Message></Response>');

  const user = db.prepare('SELECT * FROM family_users WHERE phone = ?').get(From);
  if (!user) {
    return res.send(`<Response><Message>Your number isn't registered. Add it in the Family Todos app settings.</Message></Response>`);
  }

  let text = Body.trim();
  let title = text;
  let category_id = null;
  let priority = 'medium';
  let deadline = null;

  const catMatch = text.match(/#(\w+)/i);
  if (catMatch) {
    const cat = db.prepare('SELECT * FROM todo_categories WHERE name LIKE ?').get(`%${catMatch[1]}%`);
    if (cat) category_id = cat.id;
    title = title.replace(catMatch[0], '').trim();
  }

  const priMatch = text.match(/!(urgent|high|medium|low)/i);
  if (priMatch) {
    priority = priMatch[1].toLowerCase();
    title = title.replace(priMatch[0], '').trim();
  }

  const dueMatch = text.match(/(?:by|due)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
  if (dueMatch) {
    const parts = dueMatch[1].split('/');
    const yr = parts[2] ? (parts[2].length === 2 ? '20' + parts[2] : parts[2]) : new Date().getFullYear();
    deadline = `${yr}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    title = title.replace(dueMatch[0], '').trim();
  }

  if (!title) title = 'New task';
  db.prepare('INSERT INTO todos (title, category_id, priority, deadline, created_by) VALUES (?,?,?,?,?)')
    .run(title, category_id, priority, deadline, user.id);

  const reply = `Added: "${title}"${priority !== 'medium' ? ` [${priority}]` : ''}${deadline ? ` • due ${deadline}` : ''}`;
  res.send(`<Response><Message>${reply}</Message></Response>`);
});

module.exports = router;
