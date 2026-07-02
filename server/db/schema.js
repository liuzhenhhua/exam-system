/**
 * 数据库 Schema 初始化
 * 包含 seed 数据，首次运行时自动插入
 */
const bcrypt = require('bcryptjs');

function initSchema(db) {
  db.exec(`
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
  `);

  // Seed 数据
  seedData(db);
}

function seedData(db) {
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
    const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    insertCat.run('公共红线考试');
    insertCat.run('项目红线考试');
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
