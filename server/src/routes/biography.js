const express = require('express');
const router = express.Router();
const db = require('../db');
const { getQuestionPlan, getDetailLevels, countQuestions } = require('../biography-questions');
const { generateDraft } = require('../biography-generator');

// GET /api/biography/levels — available detail levels
router.get('/levels', (_req, res) => {
  const levels = getDetailLevels().map(l => ({
    ...l,
    questionCount: countQuestions(l.id),
  }));
  res.json({ levels });
});

// GET /api/biography/questions?level=moderate — question plan for a level
router.get('/questions', (req, res) => {
  const { level } = req.query;
  if (!level) return res.status(400).json({ error: 'level query param required' });

  try {
    const plan = getQuestionPlan(level);
    res.json({ plan });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/biography/sessions — create a new interview session
router.post('/sessions', (req, res) => {
  const { subject_name, detail_level } = req.body;
  if (!subject_name || !detail_level) {
    return res.status(400).json({ error: 'subject_name and detail_level required' });
  }

  try {
    // Validate detail level
    getQuestionPlan(detail_level);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const result = db.prepare(`
    INSERT INTO biography_sessions (subject_name, detail_level)
    VALUES (?, ?)
  `).run(subject_name, detail_level);

  const session = db.prepare('SELECT * FROM biography_sessions WHERE id = ?')
    .get(result.lastInsertRowid);

  res.json({ session });
});

// GET /api/biography/sessions/:id — get session with all responses
router.get('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM biography_sessions WHERE id = ?')
    .get(req.params.id);

  if (!session) return res.status(404).json({ error: 'Session not found' });

  const responses = db.prepare(
    'SELECT * FROM biography_responses WHERE session_id = ? ORDER BY id'
  ).all(session.id);

  res.json({ session, responses });
});

// POST /api/biography/sessions/:id/responses — store a response
router.post('/sessions/:id/responses', (req, res) => {
  const session = db.prepare('SELECT * FROM biography_sessions WHERE id = ?')
    .get(req.params.id);

  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { topic, question, answer } = req.body;
  if (!topic || !question || !answer) {
    return res.status(400).json({ error: 'topic, question, and answer required' });
  }

  // Check if there's already a response for this exact question in this session
  const existing = db.prepare(
    'SELECT id FROM biography_responses WHERE session_id = ? AND topic = ? AND question = ?'
  ).get(session.id, topic, question);

  if (existing) {
    // Update existing response
    db.prepare('UPDATE biography_responses SET answer = ? WHERE id = ?')
      .run(answer, existing.id);

    const updated = db.prepare('SELECT * FROM biography_responses WHERE id = ?')
      .get(existing.id);
    return res.json({ response: updated });
  }

  const result = db.prepare(`
    INSERT INTO biography_responses (session_id, topic, question, answer)
    VALUES (?, ?, ?, ?)
  `).run(session.id, topic, question, answer);

  const response = db.prepare('SELECT * FROM biography_responses WHERE id = ?')
    .get(result.lastInsertRowid);

  // Update session timestamp
  db.prepare('UPDATE biography_sessions SET updated_at = datetime(\'now\') WHERE id = ?')
    .run(session.id);

  res.json({ response });
});

// DELETE /api/biography/sessions/:id/responses/:responseId — delete a response
router.delete('/sessions/:id/responses/:responseId', (req, res) => {
  const session = db.prepare('SELECT * FROM biography_sessions WHERE id = ?')
    .get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  db.prepare('DELETE FROM biography_responses WHERE id = ? AND session_id = ?')
    .run(req.params.responseId, session.id);

  res.json({ ok: true });
});

// POST /api/biography/sessions/:id/generate — generate the biography draft
router.post('/sessions/:id/generate', (req, res) => {
  const session = db.prepare('SELECT * FROM biography_sessions WHERE id = ?')
    .get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const responses = db.prepare(
    'SELECT * FROM biography_responses WHERE session_id = ? ORDER BY id'
  ).all(session.id);

  if (responses.length === 0) {
    return res.status(400).json({ error: 'No responses recorded yet. Answer some questions first.' });
  }

  const draft = generateDraft(session, responses);

  // Store the draft in the session
  db.prepare('UPDATE biography_sessions SET draft = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(draft, 'draft_generated', session.id);

  res.json({ draft });
});

// GET /api/biography/sessions — list all sessions (most recent first)
router.get('/sessions', (_req, res) => {
  const sessions = db.prepare(
    'SELECT *, (SELECT COUNT(*) FROM biography_responses WHERE session_id = biography_sessions.id) as response_count FROM biography_sessions ORDER BY updated_at DESC'
  ).all();

  res.json({ sessions });
});

// DELETE /api/biography/sessions/:id — delete a session and its responses
router.delete('/sessions/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM biography_sessions WHERE id = ?')
    .get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  db.prepare('DELETE FROM biography_responses WHERE session_id = ?').run(session.id);
  db.prepare('DELETE FROM biography_sessions WHERE id = ?').run(session.id);

  res.json({ ok: true });
});

module.exports = router;
