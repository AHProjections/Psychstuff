const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware: ensure request user is a provider
function requireProvider(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || user.role !== 'provider') return res.status(403).json({ error: 'Forbidden' });
  req.provider = user;
  next();
}

// GET /api/provider/patients
router.get('/patients', requireProvider, (req, res) => {
  const patients = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, u.created_at,
      (SELECT COUNT(*) FROM patient_interventions WHERE patient_id = u.id AND active = 1) as active_interventions,
      (SELECT MAX(log_date) FROM intervention_logs WHERE patient_id = u.id) as last_checkin,
      (SELECT COUNT(*) FROM intervention_logs WHERE patient_id = u.id AND log_date >= date('now','-7 days')) as logs_7d,
      (SELECT COUNT(*) FROM patient_interventions pi WHERE patient_id = u.id AND active = 1) * 7 as possible_7d
    FROM users u WHERE u.role = 'patient' AND u.provider_id = ?
    ORDER BY u.name
  `).all(req.provider.id);

  res.json({ patients });
});

// GET /api/provider/patients/:id
router.get('/patients/:id', requireProvider, (req, res) => {
  const patient = db.prepare(`
    SELECT id, name, email, avatar_color, created_at FROM users WHERE id = ? AND provider_id = ?
  `).get(req.params.id, req.provider.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const interventions = db.prepare(`
    SELECT pi.*, it.name, it.category, it.description, it.evidence_summary, it.evidence_grade, it.icon, it.unit, it.color,
      (SELECT COUNT(*) FROM intervention_logs il WHERE il.patient_intervention_id = pi.id AND il.completed = 1) as total_completed,
      (SELECT COUNT(*) FROM intervention_logs il WHERE il.patient_intervention_id = pi.id) as total_logged
    FROM patient_interventions pi
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE pi.patient_id = ? AND pi.active = 1
    ORDER BY pi.created_at
  `).all(req.params.id);

  const recentSymptoms = db.prepare(`
    SELECT * FROM symptom_logs WHERE patient_id = ? ORDER BY log_date DESC LIMIT 14
  `).all(req.params.id);

  const recentLogs = db.prepare(`
    SELECT il.*, it.name as intervention_name, it.icon, it.color
    FROM intervention_logs il
    JOIN patient_interventions pi ON pi.id = il.patient_intervention_id
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE il.patient_id = ?
    ORDER BY il.log_date DESC LIMIT 30
  `).all(req.params.id);

  res.json({ patient, interventions, recentSymptoms, recentLogs });
});

// GET /api/provider/intervention-types
router.get('/intervention-types', requireProvider, (req, res) => {
  const types = db.prepare('SELECT * FROM intervention_types ORDER BY name').all();
  res.json({ types });
});

// POST /api/provider/interventions — assign intervention
router.post('/interventions', requireProvider, (req, res) => {
  const { patient_id, intervention_type_id, goal_value, goal_frequency, provider_notes } = req.body;
  if (!patient_id || !intervention_type_id || !goal_value || !goal_frequency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Verify patient belongs to this provider
  const patient = db.prepare('SELECT id FROM users WHERE id = ? AND provider_id = ?').get(patient_id, req.provider.id);
  if (!patient) return res.status(403).json({ error: 'Patient not found' });

  const today = new Date().toISOString().slice(0, 10);
  const result = db.prepare(`
    INSERT INTO patient_interventions (patient_id, intervention_type_id, goal_value, goal_frequency, provider_notes, start_date, assigned_by)
    VALUES (?,?,?,?,?,?,?)
  `).run(patient_id, intervention_type_id, goal_value, goal_frequency, provider_notes || null, today, req.provider.id);

  const intervention = db.prepare(`
    SELECT pi.*, it.name, it.category, it.description, it.evidence_summary, it.evidence_grade, it.icon, it.unit, it.color
    FROM patient_interventions pi JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE pi.id = ?
  `).get(result.lastInsertRowid);

  res.json({ intervention });
});

// PUT /api/provider/interventions/:id
router.put('/interventions/:id', requireProvider, (req, res) => {
  const { goal_value, goal_frequency, provider_notes, active } = req.body;
  db.prepare(`
    UPDATE patient_interventions SET goal_value = COALESCE(?, goal_value),
      goal_frequency = COALESCE(?, goal_frequency),
      provider_notes = COALESCE(?, provider_notes),
      active = COALESCE(?, active)
    WHERE id = ?
  `).run(goal_value, goal_frequency, provider_notes, active !== undefined ? (active ? 1 : 0) : null, req.params.id);

  res.json({ ok: true });
});

// GET /api/provider/patients/:id/insights
router.get('/patients/:id/insights', requireProvider, (req, res) => {
  const patient = db.prepare('SELECT id FROM users WHERE id = ? AND provider_id = ?').get(req.params.id, req.provider.id);
  if (!patient) return res.status(404).json({ error: 'Not found' });

  const days = parseInt(req.query.days) || 30;

  const symptoms = db.prepare(`
    SELECT * FROM symptom_logs WHERE patient_id = ? AND log_date >= date('now', ? || ' days')
    ORDER BY log_date
  `).all(req.params.id, `-${days}`);

  const adherence = db.prepare(`
    SELECT il.log_date, pi.intervention_type_id, it.name, it.color, it.icon,
      AVG(il.completed) as rate
    FROM intervention_logs il
    JOIN patient_interventions pi ON pi.id = il.patient_intervention_id
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE il.patient_id = ? AND il.log_date >= date('now', ? || ' days')
    GROUP BY il.log_date, pi.intervention_type_id
    ORDER BY il.log_date
  `).all(req.params.id, `-${days}`);

  res.json({ symptoms, adherence });
});

module.exports = router;
