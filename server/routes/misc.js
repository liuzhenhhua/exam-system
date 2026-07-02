/**
 * 项目管理 / 分类管理 / 设置 / 统计
 * 合集路由
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ==================== 管理员管理 ====================

router.get('/admins', adminOnly, (req, res) => {
  const db = getDb();
  const admins = db.prepare('SELECT * FROM admins ORDER BY id').all().map(a => {
    a.project_ids = JSON.parse(a.project_ids || '[]');
    a.modules = JSON.parse(a.modules || '[]');
    delete a.password_hash;
    return a;
  });
  res.json({ admins });
});

router.post('/admins', adminOnly, (req, res) => {
  const db = getDb();
  const { username, password, real_name, role, department } = req.body;
  if (!username || !password) return res.status(400).json({ error: '账号和密码为必填项' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO admins (username, password_hash, real_name, department, role, status, created)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(username, hash, real_name || '', department || '', role || 'admin', 'active', new Date().toISOString().slice(0, 10));
  res.json({ id: result.lastInsertRowid });
});

router.put('/admins/:id', adminOnly, (req, res) => {
  const db = getDb();
  const { real_name, role, status, password, modules, project_ids } = req.body;
  const fields = []; const params = [];
  if (real_name !== undefined) { fields.push('real_name = ?'); params.push(real_name); }
  if (role !== undefined) { fields.push('role = ?'); params.push(role); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (password) { fields.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (modules !== undefined) { fields.push('modules = ?'); params.push(JSON.stringify(modules)); }
  if (project_ids !== undefined) { fields.push('project_ids = ?'); params.push(JSON.stringify(project_ids)); }
  if (fields.length > 0) { params.push(req.params.id); db.prepare(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete('/admins/:id', adminOnly, (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (count.count <= 1) return res.status(400).json({ error: '至少保留一个管理员' });
  db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== 项目管理 ====================

router.get('/projects', (req, res) => {
  const db = getDb();
  const projects = db.prepare("SELECT * FROM projects WHERE status != 'deleted' ORDER BY id").all();
  res.json({ projects });
});

router.post('/projects', adminOnly, (req, res) => {
  const db = getDb();
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ error: '项目名称不能为空' });
  const result = db.prepare('INSERT INTO projects (name, code, description, status, created) VALUES (?, ?, ?, ?, ?)')
    .run(name, code || '', description || '', 'active', new Date().toISOString().slice(0, 10));
  res.json({ id: result.lastInsertRowid, name });
});

router.put('/projects/:id', adminOnly, (req, res) => {
  const db = getDb();
  const { name, code, description, status } = req.body;
  const fields = []; const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (code !== undefined) { fields.push('code = ?'); params.push(code); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (fields.length > 0) { params.push(req.params.id); db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params); }
  res.json({ success: true });
});

router.delete('/projects/:id', adminOnly, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE projects SET status = 'deleted' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ==================== 分类管理 ====================

router.get('/categories', (req, res) => {
  const db = getDb();
  const cats = db.prepare('SELECT * FROM categories ORDER BY id').all();
  res.json({ categories: cats });
});

router.post('/categories', adminOnly, (req, res) => {
  const db = getDb();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '分类名称不能为空' });
  const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

router.delete('/categories/:id', adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== 系统设置 ====================

router.get('/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json({ settings });
});

router.put('/settings', adminOnly, (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(req.body)) {
    upsert.run(key, String(value));
  }
  res.json({ success: true });
});

// ==================== 数据统计 ====================

router.get('/stats', adminOnly, (req, res) => {
  const db = getDb();
  const questionCount = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status != 'deleted'").get();
  const examCount = db.prepare('SELECT COUNT(*) as count FROM exams').get();
  const activeExams = db.prepare("SELECT COUNT(*) as count FROM exams WHERE status = 'published'").get();
  const resultCount = db.prepare('SELECT COUNT(*) as count FROM results').get();
  const reviewedOnly = db.prepare('SELECT * FROM results WHERE review_completed = 1').all();

  const passRate = reviewedOnly.length > 0
    ? Math.round((reviewedOnly.filter(r => r.passed).length / reviewedOnly.length) * 100)
    : 0;
  const avgScore = reviewedOnly.length > 0
    ? (reviewedOnly.reduce((a, b) => a + b.score, 0) / reviewedOnly.length).toFixed(1)
    : 0;

  res.json({
    total_questions: questionCount.count,
    total_exams: examCount.count,
    active_exams: activeExams.count,
    total_examinees: resultCount.count,
    pass_rate: passRate,
    avg_score: avgScore
  });
});

// 按部门统计
router.get('/stats/dept', adminOnly, (req, res) => {
  const db = getDb();
  const depts = db.prepare('SELECT * FROM departments ORDER BY level, id').all();
  const results = db.prepare('SELECT * FROM results WHERE review_completed = 1').all();
  const users = db.prepare('SELECT * FROM users ORDER BY id').all();

  const deptStats = depts.map(d => {
    // 获取该部门下的所有子部门ID
    const subIds = new Set([d.id]);
    depts.filter(dd => dd.parent_id === d.id).forEach(dd => { subIds.add(dd.id); });

    const deptUsers = users.filter(u => u.department_id && subIds.has(u.department_id));
    const deptResults = results.filter(r => deptUsers.some(u => u.username === r.username));

    const avgScore = deptResults.length > 0
      ? (deptResults.reduce((a, b) => a + b.score, 0) / deptResults.length).toFixed(1)
      : 0;
    const passRate = deptResults.length > 0
      ? Math.round((deptResults.filter(r => r.passed).length / deptResults.length) * 100)
      : 0;

    return {
      id: d.id, name: d.name, level: d.level,
      userCount: deptUsers.length,
      examCount: deptResults.length,
      avgScore, passRate
    };
  });

  res.json({ departments: deptStats });
});

module.exports = router;
