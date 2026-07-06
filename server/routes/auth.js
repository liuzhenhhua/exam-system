/**
 * 认证路由 — 登录 / 修改密码 / 当前用户
 * 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    const db = getDb();

    // 1. 检查管理员
    let user = await db.get('SELECT * FROM admins WHERE username = ?', username);
    if (user) {
      if (user.status !== 'active') {
        return res.status(403).json({ error: '该账号已被禁用' });
      }
      if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: '密码错误' });
      }
      // 使用数据库中存储的实际角色，不再硬编码
      const actualRole = user.role || 'admin';
      return res.json({
        token: signToken({ id: user.id, username: user.username, real_name: user.real_name, role: actualRole, department: user.department }),
        user: {
          id: user.id, username: user.username, real_name: user.real_name,
          role: actualRole, department: user.department, employee_id: 'ADMIN' + user.id,
          project_ids: JSON.parse(user.project_ids || '[]'),
          modules: JSON.parse(user.modules || '[]')
        }
      });
    }

    // 2. 检查考生
    user = await db.get('SELECT * FROM users WHERE username = ?', username);
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
  } catch (err) {
    console.error('[auth/login] 错误:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const isAdmin = ['super_admin', 'admin', 'reviewer'].includes(req.user.role);

    let user;
    if (isAdmin) {
      user = await db.get('SELECT * FROM admins WHERE id = ?', req.user.id);
      if (user) {
        // 保留数据库中的实际角色（不再硬编码为 'admin'）
        user.employee_id = 'ADMIN' + user.id;
        user.project_ids = JSON.parse(user.project_ids || '[]');
        user.modules = JSON.parse(user.modules || '[]');
      }
    } else {
      user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
      if (user) {
        user.role = 'employee';
        user.employee_id = user.username;
        user.project_ids = JSON.parse(user.project_ids || '[]');
      }
    }

    if (!user) return res.status(404).json({ error: '用户不存在' });
    delete user.password_hash;
    return res.json({ user });
  } catch (err) {
    console.error('[auth/me] 错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6位' });
    }

    const db = getDb();
    const isAdmin = ['super_admin', 'admin', 'reviewer'].includes(req.user.role);
    const table = isAdmin ? 'admins' : 'users';
    const user = await db.get(`SELECT * FROM ${table} WHERE id = ?`, req.user.id);

    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.run(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, newHash, req.user.id);

    return res.json({ success: true });
  } catch (err) {
    console.error('[auth/password] 错误:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;
