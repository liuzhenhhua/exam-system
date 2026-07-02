/**
 * 用户路由 — 考生账号 CRUD
 * 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users
router.get('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { search, status, department } = req.query;
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (search) { sql += ' AND (username LIKE ? OR real_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (department) { sql += ' AND department LIKE ?'; params.push(`%${department}%`); }

    sql += ' ORDER BY id DESC';
    const users = (await db.all(sql, ...params)).map(u => {
      u.project_ids = JSON.parse(u.project_ids || '[]');
      delete u.password_hash;
      return u;
    });
    res.json({ users });
  } catch (err) {
    console.error('[users/list] 错误:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// GET /api/users/:id
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    user.project_ids = JSON.parse(user.project_ids || '[]');
    delete user.password_hash;
    res.json({ user });
  } catch (err) {
    console.error('[users/get] 错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// POST /api/users
router.post('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { username, password, real_name, department_id, department, position, status, project_ids } = req.body;
    if (!username || !password) return res.status(400).json({ error: '工号和密码为必填项' });

    const existing = await db.get('SELECT id FROM users WHERE username = ?', username);
    if (existing) return res.status(400).json({ error: '工号已存在' });

    const hash = bcrypt.hashSync(password || '123456', 10);
    const result = await db.run(`
      INSERT INTO users (username, password_hash, real_name, department_id, department, position, status, project_ids, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, username, hash, real_name || '', department_id || null, department || '',
      position || '', status || 'active', JSON.stringify(project_ids || []),
      new Date().toISOString().slice(0, 10));

    res.json({ id: result.lastInsertRowid, username, real_name });
  } catch (err) {
    console.error('[users/create] 错误:', err);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// POST /api/users/batch
router.post('/batch', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { users: userList } = req.body;
    if (!Array.isArray(userList) || userList.length === 0) return res.status(400).json({ error: '请提交有效的用户列表' });

    const date = new Date().toISOString().slice(0, 10);
    let count = 0;
    const errors = [];

    await db.transaction(async (tx) => {
      for (const u of userList) {
        if (!u.username || !u.password) {
          errors.push('工号和密码为必填项');
          continue;
        }
        const existing = await tx.get('SELECT id FROM users WHERE username = ?', u.username);
        if (existing) {
          errors.push(`工号 ${u.username} 已存在`);
          continue;
        }
        await tx.run(`
          INSERT INTO users (username, password_hash, real_name, department_id, department, position, status, project_ids, created)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, u.username, bcrypt.hashSync(u.password, 10), u.real_name || '', u.department_id || null,
          u.department || '', u.position || '', u.status || 'active', JSON.stringify(u.project_ids || []), u.created || date);
        count++;
      }
    });

    res.json({ success: true, count, errors });
  } catch (err) {
    console.error('[users/batch] 错误:', err);
    res.status(500).json({ error: '批量创建用户失败' });
  }
});

// PUT /api/users/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { username, real_name, department_id, department, position, status, password, project_ids } = req.body;
    const id = parseInt(req.params.id);

    const user = await db.get('SELECT * FROM users WHERE id = ?', id);
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
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, ...params);
    res.json({ success: true });
  } catch (err) {
    console.error('[users/update] 错误:', err);
    res.status(500).json({ error: '更新用户失败' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM users WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[users/delete] 错误:', err);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;
