const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'psychstuff.db');

const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function setup() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('provider','patient')),
      provider_id INTEGER,
      avatar_color TEXT DEFAULT '#4F46E5',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intervention_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      evidence_summary TEXT,
      evidence_grade TEXT,
      icon TEXT,
      unit TEXT,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS patient_interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES users(id),
      intervention_type_id INTEGER NOT NULL REFERENCES intervention_types(id),
      goal_value INTEGER NOT NULL,
      goal_frequency TEXT NOT NULL,
      provider_notes TEXT,
      start_date TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      assigned_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intervention_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES users(id),
      patient_intervention_id INTEGER NOT NULL REFERENCES patient_interventions(id),
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(patient_intervention_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS symptom_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES users(id),
      log_date TEXT NOT NULL,
      mood INTEGER,
      energy INTEGER,
      anxiety INTEGER,
      depression INTEGER,
      stress INTEGER,
      sleep_quality INTEGER,
      concentration INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(patient_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS biography_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_name TEXT NOT NULL,
      detail_level TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      draft TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS biography_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES biography_sessions(id),
      topic TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return;

  // Providers
  const insertUser = db.prepare(`
    INSERT INTO users (email, password, name, role, provider_id, avatar_color) VALUES (?,?,?,?,?,?)
  `);

  const p1 = insertUser.run('sarah@clinic.com', 'demo', 'Dr. Sarah Chen', 'provider', null, '#4F46E5').lastInsertRowid;
  const p2 = insertUser.run('marcus@clinic.com', 'demo', 'Dr. Marcus Williams', 'provider', null, '#0D9488').lastInsertRowid;

  // Patients
  const alex = insertUser.run('alex@patient.com', 'demo', 'Alex Johnson', 'patient', p1, '#F97316').lastInsertRowid;
  const jamie = insertUser.run('jamie@patient.com', 'demo', 'Jamie Smith', 'patient', p1, '#8B5CF6').lastInsertRowid;
  const sam = insertUser.run('sam@patient.com', 'demo', 'Sam Rivera', 'patient', p1, '#EC4899').lastInsertRowid;
  const riya = insertUser.run('riya@patient.com', 'demo', 'Riya Patel', 'patient', p2, '#22C55E').lastInsertRowid;
  const tom = insertUser.run('tom@patient.com', 'demo', 'Tom Nakamura', 'patient', p2, '#F59E0B').lastInsertRowid;

  // Intervention types
  const insertType = db.prepare(`
    INSERT INTO intervention_types (name, category, description, evidence_summary, evidence_grade, icon, unit, color) VALUES (?,?,?,?,?,?,?,?)
  `);

  const types = [
    ['Aerobic Exercise', 'exercise',
      'Regular moderate-to-vigorous physical activity, including walking, running, cycling, or swimming.',
      'Multiple RCTs demonstrate exercise is as effective as antidepressants for mild-to-moderate depression. 150 min/week of moderate activity is the evidence-based target.',
      'A', '🏃', 'days', '#3B82F6'],
    ['Sleep Hygiene', 'sleep',
      'Consistent sleep schedule and sleep-promoting habits — consistent bedtime, screen-free wind-down, dark/cool room.',
      'Insomnia and depression are bidirectional. CBT-I (Cognitive Behavioral Therapy for Insomnia) is gold standard; good sleep hygiene significantly reduces anxiety and depression.',
      'A', '🌙', 'days', '#8B5CF6'],
    ['Mindfulness & Meditation', 'mindfulness',
      '10–20 minutes of daily mindfulness meditation, breathwork, or body scan practice.',
      'MBSR (Mindfulness-Based Stress Reduction) meta-analyses show significant reductions in anxiety, depression, and stress. Neuroimaging evidence shows changes in amygdala reactivity.',
      'A', '🧘', 'days', '#0D9488'],
    ['Social Connection', 'social',
      'Meaningful in-person or video social interaction — coffee with a friend, family call, community activity.',
      'Social isolation is one of the strongest predictors of depression and mortality. Regular meaningful contact is as important as other lifestyle factors for mental health.',
      'A', '👥', 'days', '#F97316'],
    ['Medication Adherence', 'medication',
      'Taking prescribed psychiatric medications as directed — consistent timing, correct dose.',
      'Consistent adherence is critical for medication efficacy. Abrupt discontinuation increases relapse risk significantly. Many patients discontinue too early before therapeutic effect.',
      'A', '💊', 'days', '#EC4899'],
    ['Nutrition — Anti-inflammatory Diet', 'nutrition',
      'Following a Mediterranean-style diet rich in vegetables, whole grains, lean protein, and omega-3 fatty acids.',
      'SMILES trial (2017) found Mediterranean diet significantly reduced depression scores vs. social support alone. Gut-brain axis mediates much of this effect.',
      'B', '🥗', 'days', '#22C55E'],
    ['Behavioral Activation', 'behavioral',
      'Scheduling one rewarding or meaningful activity per day — a hobby, creative pursuit, or valued task.',
      'Behavioral Activation is a Grade-A CBT component for depression, supported by 45+ RCTs. Counteracts the withdrawal and avoidance cycle that perpetuates depression.',
      'A', '⭐', 'days', '#F59E0B'],
    ['Sunlight Exposure', 'lifestyle',
      '20–30 minutes of outdoor sunlight exposure, preferably in the morning.',
      'Light therapy (10,000 lux) has Grade A evidence for seasonal depression and Grade B for non-seasonal. Natural sunlight also supports circadian rhythm and Vitamin D synthesis.',
      'B', '☀️', 'days', '#EAB308'],
    ['Journaling', 'behavioral',
      '15–20 minutes of expressive or reflective writing — free writing, thought records, or gratitude journaling.',
      'Pennebaker paradigm studies show expressive writing reduces depression and anxiety. CBT thought records improve cognitive flexibility. Daily gratitude reduces depressive symptoms.',
      'B', '📓', 'days', '#6366F1'],
    ['Alcohol Reduction', 'lifestyle',
      'Reducing or abstaining from alcohol consumption.',
      'Alcohol is a CNS depressant that worsens anxiety, depression, and sleep quality. Comorbid alcohol use significantly worsens mental health outcomes. Abstinence is often therapeutic.',
      'A', '🚫', 'days', '#EF4444'],
  ];

  const typeIds = {};
  for (const t of types) {
    const id = insertType.run(...t).lastInsertRowid;
    typeIds[t[0]] = id;
  }

  // Assign interventions to Alex (patient of Dr. Sarah Chen)
  const insertPI = db.prepare(`
    INSERT INTO patient_interventions (patient_id, intervention_type_id, goal_value, goal_frequency, provider_notes, start_date, assigned_by)
    VALUES (?,?,?,?,?,?,?)
  `);

  const thirtyDaysAgo = offsetDate(-30);

  const alexExercise = insertPI.run(alex, typeIds['Aerobic Exercise'], 4, 'weekly',
    'Aim for 4 days per week of at least 30 minutes moderate activity. Brisk walking counts!', thirtyDaysAgo, p1).lastInsertRowid;
  const alexSleep = insertPI.run(alex, typeIds['Sleep Hygiene'], 7, 'weekly',
    'Consistent 10:30pm bedtime. No screens 30 min before bed. Keep room cool and dark.', thirtyDaysAgo, p1).lastInsertRowid;
  const alexMindful = insertPI.run(alex, typeIds['Mindfulness & Meditation'], 5, 'weekly',
    'Try the Headspace or Calm app. Even 10 minutes counts. Focus on the breath, not clearing the mind.', thirtyDaysAgo, p1).lastInsertRowid;
  const alexSocial = insertPI.run(alex, typeIds['Social Connection'], 3, 'weekly',
    'At least one meaningful social interaction per day you choose — quality over quantity.', thirtyDaysAgo, p1).lastInsertRowid;

  // Assign interventions to Jamie
  const jamieExercise = insertPI.run(jamie, typeIds['Aerobic Exercise'], 3, 'weekly',
    'Start gentle — even a 20-minute walk counts. Build up from there.', offsetDate(-20), p1).lastInsertRowid;
  const jamieMeds = insertPI.run(jamie, typeIds['Medication Adherence'], 7, 'weekly',
    'Take sertraline every morning with food. Set a phone reminder if helpful.', offsetDate(-20), p1).lastInsertRowid;
  const jamieSocial = insertPI.run(jamie, typeIds['Social Connection'], 3, 'weekly',
    'At least 3 meaningful social interactions per week.', offsetDate(-20), p1).lastInsertRowid;

  // Assign interventions to Sam
  const samMindful = insertPI.run(sam, typeIds['Mindfulness & Meditation'], 5, 'weekly',
    'Daily meditation practice.', offsetDate(-10), p1).lastInsertRowid;
  const samNutrition = insertPI.run(sam, typeIds['Nutrition — Anti-inflammatory Diet'], 5, 'weekly',
    'Follow Mediterranean-style diet. Add fish twice a week, reduce processed foods.', offsetDate(-10), p1).lastInsertRowid;

  // Generate 30 days of realistic data for Alex
  // Pattern: starts struggling, improves over time (showing correlation)
  const insertLog = db.prepare(`
    INSERT OR IGNORE INTO intervention_logs (patient_id, patient_intervention_id, log_date, completed)
    VALUES (?,?,?,?)
  `);
  const insertSymptom = db.prepare(`
    INSERT OR IGNORE INTO symptom_logs
    (patient_id, log_date, mood, energy, anxiety, depression, stress, sleep_quality, concentration)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);

  // Adherence rates by week (fraction):
  // Week 1: struggling (exercise 0.25, sleep 0.43, mindful 0.29, social 0.29)
  // Week 2: slight improvement
  // Week 3: noticeable improvement
  // Week 4: doing well
  const adherenceByWeek = {
    exercise: [0.25, 0.5, 0.75, 0.9],
    sleep: [0.43, 0.57, 0.71, 0.86],
    mindful: [0.29, 0.43, 0.71, 0.86],
    social: [0.29, 0.57, 0.71, 0.86],
  };

  // Symptom trajectories (1-10): mood/energy/concentration go UP, anxiety/depression/stress go DOWN
  // Week 1: mood=4, energy=3, anxiety=7, depression=6, stress=7, sleep=4, conc=4
  // Week 4: mood=7, energy=7, anxiety=4, depression=3, stress=4, sleep=7, conc=7
  function lerpSym(start, end, t) {
    return Math.round(start + (end - start) * t + (Math.random() - 0.5) * 1.2);
  }

  for (let d = 0; d < 30; d++) {
    const dateStr = offsetDate(-30 + d);
    const week = Math.min(3, Math.floor(d / 7));
    const t = d / 29;

    // Exercise (weekly goal 4/7)
    const doExercise = Math.random() < adherenceByWeek.exercise[week] ? 1 : 0;
    insertLog.run(alex, alexExercise, dateStr, doExercise);

    // Sleep
    const doSleep = Math.random() < adherenceByWeek.sleep[week] ? 1 : 0;
    insertLog.run(alex, alexSleep, dateStr, doSleep);

    // Mindfulness
    const doMindful = Math.random() < adherenceByWeek.mindful[week] ? 1 : 0;
    insertLog.run(alex, alexMindful, dateStr, doMindful);

    // Social
    const doSocial = Math.random() < adherenceByWeek.social[week] ? 1 : 0;
    insertLog.run(alex, alexSocial, dateStr, doSocial);

    // Symptoms
    const mood = clamp(lerpSym(4, 7, t), 1, 10);
    const energy = clamp(lerpSym(3, 7, t), 1, 10);
    const anxiety = clamp(lerpSym(7, 4, t), 1, 10);
    const depression = clamp(lerpSym(6, 3, t), 1, 10);
    const stress = clamp(lerpSym(7, 4, t), 1, 10);
    const sleep_q = clamp(lerpSym(4, 7, t), 1, 10);
    const conc = clamp(lerpSym(4, 7, t), 1, 10);
    insertSymptom.run(alex, dateStr, mood, energy, anxiety, depression, stress, sleep_q, conc);
  }

  // Generate 20 days for Jamie (more inconsistent)
  const jamieAdherence = { exercise: [0.4, 0.5, 0.6], meds: [0.7, 0.8, 0.9], social: [0.3, 0.5, 0.6] };
  for (let d = 0; d < 20; d++) {
    const dateStr = offsetDate(-20 + d);
    const week = Math.min(2, Math.floor(d / 7));
    const t = d / 19;

    insertLog.run(jamie, jamieExercise, dateStr, Math.random() < jamieAdherence.exercise[week] ? 1 : 0);
    insertLog.run(jamie, jamieMeds, dateStr, Math.random() < jamieAdherence.meds[week] ? 1 : 0);
    insertLog.run(jamie, jamieSocial, dateStr, Math.random() < jamieAdherence.social[week] ? 1 : 0);

    const mood = clamp(lerpSym(5, 6, t), 1, 10);
    const energy = clamp(lerpSym(4, 6, t), 1, 10);
    const anxiety = clamp(lerpSym(6, 5, t), 1, 10);
    const depression = clamp(lerpSym(5, 4, t), 1, 10);
    const stress = clamp(lerpSym(6, 5, t), 1, 10);
    const sleep_q = clamp(lerpSym(5, 6, t), 1, 10);
    const conc = clamp(lerpSym(5, 6, t), 1, 10);
    insertSymptom.run(jamie, dateStr, mood, energy, anxiety, depression, stress, sleep_q, conc);
  }

  // Sam: 10 days
  for (let d = 0; d < 10; d++) {
    const dateStr = offsetDate(-10 + d);
    const t = d / 9;
    insertLog.run(sam, samMindful, dateStr, Math.random() < 0.6 ? 1 : 0);
    insertLog.run(sam, samNutrition, dateStr, Math.random() < 0.7 ? 1 : 0);
    insertSymptom.run(sam, dateStr,
      clamp(lerpSym(6, 7, t), 1, 10), clamp(lerpSym(5, 6, t), 1, 10),
      clamp(lerpSym(5, 4, t), 1, 10), clamp(lerpSym(4, 3, t), 1, 10),
      clamp(lerpSym(5, 4, t), 1, 10), clamp(lerpSym(6, 7, t), 1, 10),
      clamp(lerpSym(6, 7, t), 1, 10));
  }

  console.log('Database seeded successfully.');
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function offsetDate(days) {
  const d = new Date('2026-02-22');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

setup();
seed();

module.exports = db;
