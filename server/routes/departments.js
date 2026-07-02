/**
 * 部门路由
 * 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const depts = await db.all('SELECT * FROM departments ORDER BY level, id');
    res.json({ departments: depts });
  } catch (err) {
    console.error('[departments/list] 错误:', err);
    res.status(500).json({ error: '获取部门列表失败' });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, level, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: '部门名称不能为空' });
    const result = await db.run('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)', name, level || 1, parent_id || null);
    res.json({ id: result.lastInsertRowid, name, level, parent_id });
  } catch (err) {
    console.error('[departments/create] 错误:', err);
    res.status(500).json({ error: '创建部门失败' });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '部门名称不能为空' });
    await db.run('UPDATE departments SET name = ? WHERE id = ?', name, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[departments/update] 错误:', err);
    res.status(500).json({ error: '更新部门失败' });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const children = await db.get('SELECT COUNT(*) as count FROM departments WHERE parent_id = ?', req.params.id);
    if (children.count > 0) return res.status(400).json({ error: '请先删除子部门' });
    await db.run('DELETE FROM departments WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[departments/delete] 错误:', err);
    res.status(500).json({ error: '删除部门失败' });
  }
});

module.exports = router;
