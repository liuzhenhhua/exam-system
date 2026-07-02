/**
 * 用户路由 — 考生账号 CRUD
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users
router.get('/', adminOnly, (req, res) => {
  const db = getDb();
  const { search, status, department } = req.query;
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (search) { sql += ' AND (username LIKE ? OR real_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (department) { sql += ' AND department LIKE ?'; params.push(`%${department}%`); }

  sql += ' ORDER BY id DESC';
  const users = db.prepare(sql).all(...params).map(u => {
    u.project_ids = JSON.parse(u.project_ids || '[]');
    delete u.password_hash;
    return u;
  });
  res.json({ users });
});

// GET /api/users/:id
router.get('/:id', adminOnly, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  user.project_ids = JSON.parse(user.project_ids || '[]');
  delete user.password_hash;
  res.json({ user });
});

// POST /api/users
router.post('/', adminOnly, (req, res) => {
  const db = getDb();
  const { username, password, real_name, department_id, department, position, status, project_ids } = req.body;
  if (!username || !password) return res.status(400).json({ error: '工号和密码为必填项' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: '工号已存在' });

  const hash = bcrypt.hashSync(password || '123456', 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, real_name, department_id, department, position, status, project_ids, created)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    username, hash, real_name || '', department_id || null, department || '',
    position || '', status || 'active', JSON.stringify(project_ids || []),
    new Date().toISOString().slice(0, 10)
  );

  res.json({ id: result.lastInsertRowid, username, real_name });
});

// POST /api/users/batch
router.post('/batch', adminOnly, (req, res) => {
  const db = getDb();
  const { users: userList } = req.body;
  if (!Array.isArray(userList) || userList.length === 0) return res.status(400).json({ error: '请提交有效的用户列表' });

  const insert = db.prepare(`
    INSERT INTO users (username, password_hash, real_name, department_id, department, position, status, project_ids, created)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const date = new Date().toISOString().slice(0, 10);
  let count = 0;
  const errors = [];

  const transaction = db.transaction(() => {
    for (const u of userList) {
      if (!u.username || !u.password) {
        errors.push('工号和密码为必填项');
        continue;
      }
      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
      if (existing) {
        errors.push(`工号 ${u.username} 已存在`);
        continue;
      }
      insert.run(u.username, bcrypt.hashSync(u.password, 10), u.real_name || '', u.department_id || null,
        u.department || '', u.position || '', u.status || 'active', JSON.stringify(u.project_ids || []), u.created || date);
      count++;
    }
  });

  transaction();
  res.json({ success: true, count, errors });
});

// PUT /api/users/:id
router.put('/:id', adminOnly, (req, res) => {
  const db = getDb();
  const { username, real_name, department_id, department, position, status, password, project_ids } = req.body;
  const id = parseInt(req.params.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const updates = [];
  const params = [];

  if (username !== undefined) { updates.push('username = ?'); params.push(username); }
  if (real_name !== undefined) { updates.push('real_name = ?'); params.push(real_name); }
  if (department_id !== undefined) { updates.push('department_id = ?'); params.push(department_id); }
  if (department !== undefined) { updates.push('department = ?'); params.push(department); }
  if (position !== undefined) { updates.push('position = ?'); params.push(position); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (password) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (project_ids !== undefined) { updates.push('project_ids = ?'); params.push(JSON.stringify(project_ids)); }

  if (updates.length === 0) return res.json({ success: true, msg: '无需更新' });

  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// DELETE /api/users/:id
router.delete('/:id', adminOnly, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
