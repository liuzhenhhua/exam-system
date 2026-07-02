/**
 * 项目管理 / 分类管理 / 设置 / 统计
 * 合集路由 — 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, getDbType } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ==================== 管理员管理 ====================

router.get('/admins', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const admins = (await db.all('SELECT * FROM admins ORDER BY id')).map(a => {
      a.project_ids = JSON.parse(a.project_ids || '[]');
      a.modules = JSON.parse(a.modules || '[]');
      delete a.password_hash;
      return a;
    });
    res.json({ admins });
  } catch (err) {
    console.error('[admins/list] 错误:', err);
    res.status(500).json({ error: '获取管理员列表失败' });
  }
});

router.post('/admins', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { username, password, real_name, role, department } = req.body;
    if (!username || !password) return res.status(400).json({ error: '账号和密码为必填项' });
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(`
      INSERT INTO admins (username, password_hash, real_name, department, role, status, created)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, username, hash, real_name || '', department || '', role || 'admin', 'active', new Date().toISOString().slice(0, 10));
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('[admins/create] 错误:', err);
    res.status(500).json({ error: '创建管理员失败' });
  }
});

router.put('/admins/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { real_name, role, status, password, modules, project_ids } = req.body;
    const fields = []; const params = [];
    if (real_name !== undefined) { fields.push('real_name = ?'); params.push(real_name); }
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (password) { fields.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
    if (modules !== undefined) { fields.push('modules = ?'); params.push(JSON.stringify(modules)); }
    if (project_ids !== undefined) { fields.push('project_ids = ?'); params.push(JSON.stringify(project_ids)); }
    if (fields.length > 0) { params.push(req.params.id); await db.run(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`, ...params); }
    res.json({ success: true });
  } catch (err) {
    console.error('[admins/update] 错误:', err);
    res.status(500).json({ error: '更新管理员失败' });
  }
});

router.delete('/admins/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const count = await db.get('SELECT COUNT(*) as count FROM admins');
    if (count.count <= 1) return res.status(400).json({ error: '至少保留一个管理员' });
    await db.run('DELETE FROM admins WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[admins/delete] 错误:', err);
    res.status(500).json({ error: '删除管理员失败' });
  }
});

// ==================== 项目管理 ====================

router.get('/projects', async (req, res) => {
  try {
    const db = getDb();
    const projects = await db.all("SELECT * FROM projects WHERE status != 'deleted' ORDER BY id");
    res.json({ projects });
  } catch (err) {
    console.error('[projects/list] 错误:', err);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

router.post('/projects', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, code, description } = req.body;
    if (!name) return res.status(400).json({ error: '项目名称不能为空' });
    const result = await db.run('INSERT INTO projects (name, code, description, status, created) VALUES (?, ?, ?, ?, ?)',
      name, code || '', description || '', 'active', new Date().toISOString().slice(0, 10));
    res.json({ id: result.lastInsertRowid, name });
  } catch (err) {
    console.error('[projects/create] 错误:', err);
    res.status(500).json({ error: '创建项目失败' });
  }
});

router.put('/projects/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, code, description, status } = req.body;
    const fields = []; const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (code !== undefined) { fields.push('code = ?'); params.push(code); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (fields.length > 0) { params.push(req.params.id); await db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, ...params); }
    res.json({ success: true });
  } catch (err) {
    console.error('[projects/update] 错误:', err);
    res.status(500).json({ error: '更新项目失败' });
  }
});

router.delete('/projects/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    await db.run("UPDATE projects SET status = 'deleted' WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects/delete] 错误:', err);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// ==================== 分类管理 ====================

router.get('/categories', async (req, res) => {
  try {
    const db = getDb();
    const cats = await db.all('SELECT * FROM categories ORDER BY id');
    res.json({ categories: cats });
  } catch (err) {
    console.error('[categories/list] 错误:', err);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

router.post('/categories', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '分类名称不能为空' });
    const result = await db.run('INSERT INTO categories (name) VALUES (?)', name);
    res.json({ id: result.lastInsertRowid, name });
  } catch (err) {
    console.error('[categories/create] 错误:', err);
    res.status(500).json({ error: '创建分类失败' });
  }
});

router.delete('/categories/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM categories WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[categories/delete] 错误:', err);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// ==================== 系统设置 ====================

router.get('/settings', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ settings });
  } catch (err) {
    console.error('[settings/list] 错误:', err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

router.put('/settings', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const dbType = getDbType();
    for (const [key, value] of Object.entries(req.body)) {
      if (dbType === 'pg') {
        // PostgreSQL: UPSERT
        await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', key, String(value));
      } else {
        // SQLite: INSERT OR REPLACE
        await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, String(value));
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[settings/update] 错误:', err);
    res.status(500).json({ error: '更新设置失败' });
  }
});

// ==================== 数据统计 ====================

router.get('/stats', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const questionCount = await db.get("SELECT COUNT(*) as count FROM questions WHERE status != 'deleted'");
    const examCount = await db.get('SELECT COUNT(*) as count FROM exams');
    const activeExams = await db.get("SELECT COUNT(*) as count FROM exams WHERE status = 'published'");
    const resultCount = await db.get('SELECT COUNT(*) as count FROM results');
    const reviewedOnly = await db.all('SELECT * FROM results WHERE review_completed = 1');

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
  } catch (err) {
    console.error('[stats] 错误:', err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 按部门统计
router.get('/stats/dept', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const depts = await db.all('SELECT * FROM departments ORDER BY level, id');
    const results = await db.all('SELECT * FROM results WHERE review_completed = 1');
    const users = await db.all('SELECT * FROM users ORDER BY id');

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
  } catch (err) {
    console.error('[stats/dept] 错误:', err);
    res.status(500).json({ error: '获取部门统计失败' });
  }
});

module.exports = router;
