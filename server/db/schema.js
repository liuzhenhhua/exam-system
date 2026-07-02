/**
 * 数据库 Schema 初始化
 * 支持 SQLite 和 PostgreSQL 两种数据库
 * dbType = 'sqlite' 时使用同步 API，dbType = 'pg' 时使用 async API
 */
const bcrypt = require('bcryptjs');

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL DEFAULT '',
  department TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  project_ids TEXT DEFAULT '[]',
  modules TEXT DEFAULT '[]',
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL DEFAULT '',
  department_id INTEGER,
  department TEXT DEFAULT '',
  position TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  project_ids TEXT DEFAULT '[]',
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  parent_id INTEGER,
  FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'public',
  project_id INTEGER,
  category TEXT DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  options TEXT,
  answer TEXT,
  analysis TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'public',
  project_id INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  start_time TEXT,
  end_time TEXT,
  duration INTEGER DEFAULT 60,
  participants INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 100,
  pass_score INTEGER DEFAULT 60,
  rules TEXT DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  original_id INTEGER,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  options TEXT,
  answer TEXT,
  analysis TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1,
  category TEXT DEFAULT '',
  score INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  user_id INTEGER,
  username TEXT NOT NULL,
  real_name TEXT DEFAULT '',
  department TEXT DEFAULT '',
  score REAL DEFAULT 0,
  pass_score INTEGER DEFAULT 60,
  passed INTEGER,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 100,
  auto_score REAL DEFAULT 0,
  objective_score REAL DEFAULT 0,
  manual_review_count INTEGER DEFAULT 0,
  review_completed INTEGER NOT NULL DEFAULT 0,
  time_spent TEXT DEFAULT '',
  submitted_at TEXT NOT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS result_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL,
  question_index INTEGER NOT NULL,
  question_id INTEGER,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  user_answer TEXT,
  is_correct INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  manual_review INTEGER NOT NULL DEFAULT 0,
  review_score INTEGER,
  review_comment TEXT DEFAULT '',
  max_score INTEGER DEFAULT 10,
  FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_scope ON questions(scope, project_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_username ON results(username);
CREATE INDEX IF NOT EXISTS idx_result_details_result_id ON result_details(result_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
`;

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name VARCHAR(100) NOT NULL DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  project_ids TEXT DEFAULT '[]',
  modules TEXT DEFAULT '[]',
  created VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name VARCHAR(100) NOT NULL DEFAULT '',
  department_id INTEGER,
  department VARCHAR(100) DEFAULT '',
  position VARCHAR(100) DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  project_ids TEXT DEFAULT '[]',
  created VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  parent_id INTEGER REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) DEFAULT '',
  description TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'public',
  project_id INTEGER,
  category VARCHAR(100) DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  options TEXT,
  answer TEXT,
  analysis TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  scope VARCHAR(20) NOT NULL DEFAULT 'public',
  project_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  start_time VARCHAR(30),
  end_time VARCHAR(30),
  duration INTEGER DEFAULT 60,
  participants INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 100,
  pass_score INTEGER DEFAULT 60,
  rules TEXT DEFAULT '[]',
  created_at VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  original_id INTEGER,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  options TEXT,
  answer TEXT,
  analysis TEXT DEFAULT '',
  difficulty INTEGER DEFAULT 1,
  category VARCHAR(100) DEFAULT '',
  score INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id INTEGER,
  username VARCHAR(100) NOT NULL,
  real_name VARCHAR(100) DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  score NUMERIC DEFAULT 0,
  pass_score INTEGER DEFAULT 60,
  passed INTEGER,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 100,
  auto_score NUMERIC DEFAULT 0,
  objective_score NUMERIC DEFAULT 0,
  manual_review_count INTEGER DEFAULT 0,
  review_completed INTEGER NOT NULL DEFAULT 0,
  time_spent VARCHAR(50) DEFAULT '',
  submitted_at VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS result_details (
  id SERIAL PRIMARY KEY,
  result_id INTEGER NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_id INTEGER,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  user_answer TEXT,
  is_correct INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  manual_review INTEGER NOT NULL DEFAULT 0,
  review_score INTEGER,
  review_comment TEXT DEFAULT '',
  max_score INTEGER DEFAULT 10
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_scope ON questions(scope, project_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_username ON results(username);
CREATE INDEX IF NOT EXISTS idx_result_details_result_id ON result_details(result_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
`;

async function initSchema(db, dbType) {
  if (dbType === 'pg') {
    await db.exec(PG_SCHEMA);
    await seedData(db, 'pg');
  } else {
    db.exec(SQLITE_SCHEMA);
    seedDataSync(db);
  }
}

// PostgreSQL 异步 seed
async function seedData(db, dbType) {
  const adminCount = await db.get('SELECT COUNT(*) as count FROM admins');
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync('Admin@2026', 10);
    await db.run(`
      INSERT INTO admins (username, password_hash, real_name, department, role, status, project_ids, modules, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, 'admin', hash, '系统管理员', '管理员', 'super_admin', 'active', '[]', '["dashboard","questions","exams","statistics","users","review","settings"]', new Date().toISOString().slice(0, 10));
  }

  const catCount = await db.get('SELECT COUNT(*) as count FROM categories');
  if (catCount.count === 0) {
    await db.run('INSERT INTO categories (name) VALUES (?)', '公共红线考试');
    await db.run('INSERT INTO categories (name) VALUES (?)', '项目红线考试');
  }

  const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
  if (deptCount.count === 0) {
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '产品研发部', 1, null);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '市场营销部', 1, null);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '财务部', 1, null);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '人力资源部', 1, null);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '前端组', 2, 1);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '后端组', 2, 1);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '产品组', 2, 1);
    await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', '视频二部', 2, 2);
  }

  const settingsCount = await db.get('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.count === 0) {
    const defaults = {
      defaultPassScore: '60',
      defaultDuration: '60',
      maxCheatCount: '3',
      enableAntiCheat: 'true',
      enableShuffle: 'true'
    };
    for (const [key, value] of Object.entries(defaults)) {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', key, value);
    }
  }
}

// SQLite 同步 seed（兼容旧模式）
function seedDataSync(db) {
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const hash = bcrypt.hashSync('Admin@2026', 10);
    db.prepare(`
      INSERT INTO admins (username, password_hash, real_name, department, role, status, project_ids, modules, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin', hash, '系统管理员', '管理员', 'super_admin', 'active', '[]', '["dashboard","questions","exams","statistics","users","review","settings"]', new Date().toISOString().slice(0, 10));
  }

  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (catCount.count === 0) {
    db.prepare('INSERT INTO categories (name) VALUES (?)').run('公共红线考试');
    db.prepare('INSERT INTO categories (name) VALUES (?)').run('项目红线考试');
  }

  const deptCount = db.prepare('SELECT COUNT(*) as count FROM departments').get();
  if (deptCount.count === 0) {
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('产品研发部', 1, null);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('市场营销部', 1, null);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('财务部', 1, null);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('人力资源部', 1, null);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('前端组', 2, 1);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('后端组', 2, 1);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('产品组', 2, 1);
    db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run('视频二部', 2, 2);
  }

  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const defaults = {
      defaultPassScore: '60',
      defaultDuration: '60',
      maxCheatCount: '3',
      enableAntiCheat: 'true',
      enableShuffle: 'true'
    };
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value);
    }
  }
}

module.exports = { initSchema };
