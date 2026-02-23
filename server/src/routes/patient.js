const express = require('express');
const router = express.Router();
const db = require('../db');

function requirePatient(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || user.role !== 'patient') return res.status(403).json({ error: 'Forbidden' });
  req.patient = user;
  next();
}

function today() {
  return new Date('2026-02-22').toISOString().slice(0, 10);
}

// GET /api/patient/dashboard
router.get('/dashboard', requirePatient, (req, res) => {
  const date = today();

  const interventions = db.prepare(`
    SELECT pi.*, it.name, it.category, it.description, it.evidence_summary, it.evidence_grade, it.icon, it.unit, it.color,
      (SELECT completed FROM intervention_logs WHERE patient_intervention_id = pi.id AND log_date = ?) as logged_today,
      (SELECT COUNT(*) FROM intervention_logs WHERE patient_intervention_id = pi.id AND completed = 1 AND log_date >= date(?, '-7 days')) as completed_this_week,
      (SELECT COUNT(*) FROM intervention_logs WHERE patient_intervention_id = pi.id AND log_date >= date(?, '-7 days')) as logged_this_week,
      (SELECT COUNT(*) FROM intervention_logs WHERE patient_intervention_id = pi.id AND completed = 1) as total_completed,
      (SELECT COUNT(*) FROM intervention_logs WHERE patient_intervention_id = pi.id) as total_logged
    FROM patient_interventions pi
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE pi.patient_id = ? AND pi.active = 1
    ORDER BY pi.created_at
  `).all(date, date, date, req.patient.id);

  const todaySymptoms = db.prepare(
    'SELECT * FROM symptom_logs WHERE patient_id = ? AND log_date = ?'
  ).get(req.patient.id, date) ?? null;

  const provider = db.prepare(
    'SELECT id, name, email FROM users WHERE id = ?'
  ).get(req.patient.provider_id);

  // Compute streak: consecutive days with at least one completed log
  const recentLogs = db.prepare(`
    SELECT log_date, MAX(completed) as any_completed
    FROM intervention_logs WHERE patient_id = ? AND log_date <= ?
    GROUP BY log_date ORDER BY log_date DESC LIMIT 60
  `).all(req.patient.id, date);

  let streak = 0;
  const expected = new Date('2026-02-22');
  for (const log of recentLogs) {
    const logDate = new Date(log.log_date);
    const diff = Math.round((expected - logDate) / 86400000);
    if (diff === streak && log.any_completed) {
      streak++;
    } else if (diff > streak) {
      break;
    }
  }

  res.json({ interventions, todaySymptoms, provider, streak, date });
});

// GET /api/patient/interventions
router.get('/interventions', requirePatient, (req, res) => {
  const interventions = db.prepare(`
    SELECT pi.*, it.name, it.category, it.description, it.evidence_summary, it.evidence_grade, it.icon, it.unit, it.color
    FROM patient_interventions pi
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE pi.patient_id = ? AND pi.active = 1
    ORDER BY pi.created_at
  `).all(req.patient.id);
  res.json({ interventions });
});

// POST /api/patient/logs — log or update today's completion
router.post('/logs', requirePatient, (req, res) => {
  const { patient_intervention_id, completed, notes } = req.body;
  if (patient_intervention_id === undefined || completed === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const date = today();
  db.prepare(`
    INSERT INTO intervention_logs (patient_id, patient_intervention_id, log_date, completed, notes)
    VALUES (?,?,?,?,?)
    ON CONFLICT(patient_intervention_id, log_date) DO UPDATE SET completed = excluded.completed, notes = excluded.notes
  `).run(req.patient.id, patient_intervention_id, date, completed ? 1 : 0, notes || null);

  res.json({ ok: true });
});

// POST /api/patient/symptoms — log or update today's symptoms
router.post('/symptoms', requirePatient, (req, res) => {
  const { mood, energy, anxiety, depression, stress, sleep_quality, concentration, notes } = req.body;
  const date = today();

  db.prepare(`
    INSERT INTO symptom_logs (patient_id, log_date, mood, energy, anxiety, depression, stress, sleep_quality, concentration, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(patient_id, log_date) DO UPDATE SET
      mood = excluded.mood, energy = excluded.energy, anxiety = excluded.anxiety,
      depression = excluded.depression, stress = excluded.stress,
      sleep_quality = excluded.sleep_quality, concentration = excluded.concentration, notes = excluded.notes
  `).run(req.patient.id, date, mood, energy, anxiety, depression, stress, sleep_quality, concentration, notes || null);

  res.json({ ok: true });
});

// GET /api/patient/insights
router.get('/insights', requirePatient, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const date = today();

  const symptoms = db.prepare(`
    SELECT * FROM symptom_logs WHERE patient_id = ?
    AND log_date >= date(?, ? || ' days')
    ORDER BY log_date
  `).all(req.patient.id, date, `-${days}`);

  const adherenceByDay = db.prepare(`
    SELECT il.log_date, it.name, it.color, it.icon, it.category,
      il.completed
    FROM intervention_logs il
    JOIN patient_interventions pi ON pi.id = il.patient_intervention_id
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE il.patient_id = ? AND il.log_date >= date(?, ? || ' days')
    ORDER BY il.log_date, it.name
  `).all(req.patient.id, date, `-${days}`);

  // Weekly adherence summary
  const weeklyAdherence = db.prepare(`
    SELECT strftime('%Y-W%W', il.log_date) as week, it.name, it.color,
      ROUND(AVG(il.completed) * 100) as adherence_pct
    FROM intervention_logs il
    JOIN patient_interventions pi ON pi.id = il.patient_intervention_id
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE il.patient_id = ? AND il.log_date >= date(?, ? || ' days')
    GROUP BY week, it.name
    ORDER BY week, it.name
  `).all(req.patient.id, date, `-${days}`);

  res.json({ symptoms, adherenceByDay, weeklyAdherence });
});

// GET /api/patient/history — recent logs with symptom data
router.get('/history', requirePatient, (req, res) => {
  const date = today();
  const recentSymptoms = db.prepare(`
    SELECT * FROM symptom_logs WHERE patient_id = ? ORDER BY log_date DESC LIMIT 7
  `).all(req.patient.id);
  const recentLogs = db.prepare(`
    SELECT il.log_date, it.name, it.icon, it.color, il.completed
    FROM intervention_logs il
    JOIN patient_interventions pi ON pi.id = il.patient_intervention_id
    JOIN intervention_types it ON it.id = pi.intervention_type_id
    WHERE il.patient_id = ? ORDER BY il.log_date DESC LIMIT 30
  `).all(req.patient.id);
  res.json({ recentSymptoms, recentLogs });
});

module.exports = router;
