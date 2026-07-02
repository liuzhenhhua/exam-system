/**
 * 认证路由 — 登录 / 修改密码 / 当前用户
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '请输入账号和密码' });
  }

  const db = getDb();

  // 1. 检查管理员
  let user = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (user) {
    if (user.status !== 'active') {
      return res.status(403).json({ error: '该账号已被禁用' });
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '密码错误' });
    }
    return res.json({
      token: signToken({ id: user.id, username: user.username, real_name: user.real_name, role: 'admin', department: user.department }),
      user: {
        id: user.id, username: user.username, real_name: user.real_name,
        role: 'admin', department: user.department, employee_id: 'ADMIN' + user.id,
        project_ids: JSON.parse(user.project_ids || '[]'),
        modules: JSON.parse(user.modules || '[]')
      }
    });
  }

  // 2. 检查考生
  user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: '账号不存在' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: '该账号已被禁用' });
  }
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '密码错误' });
  }

  return res.json({
    token: signToken({ id: user.id, username: user.username, real_name: user.real_name, role: 'employee', department: user.department }),
    user: {
      id: user.id, username: user.username, real_name: user.real_name,
      role: 'employee', department: user.department, department_id: user.department_id,
      position: user.position, employee_id: user.username,
      project_ids: JSON.parse(user.project_ids || '[]')
    }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

  let user;
  if (isAdmin) {
    user = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);
    if (user) {
      user.role = 'admin';
      user.employee_id = 'ADMIN' + user.id;
      user.project_ids = JSON.parse(user.project_ids || '[]');
      user.modules = JSON.parse(user.modules || '[]');
    }
  } else {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (user) {
      user.role = 'employee';
      user.employee_id = user.username;
      user.project_ids = JSON.parse(user.project_ids || '[]');
    }
  }

  if (!user) return res.status(404).json({ error: '用户不存在' });
  delete user.password_hash;
  return res.json({ user });
});

// PUT /api/auth/password
router.put('/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入旧密码和新密码' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  const db = getDb();
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  const table = isAdmin ? 'admins' : 'users';
  const user = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.user.id);

  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(401).json({ error: '旧密码错误' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE ${table} SET password_hash = ? WHERE id = ?`).run(newHash, req.user.id);

  return res.json({ success: true });
});

module.exports = router;
