/**
 * 部门路由
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const depts = db.prepare('SELECT * FROM departments ORDER BY level, id').all();
  res.json({ departments: depts });
});

router.post('/', adminOnly, (req, res) => {
  const db = getDb();
  const { name, level, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: '部门名称不能为空' });
  const result = db.prepare('INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)').run(name, level || 1, parent_id || null);
  res.json({ id: result.lastInsertRowid, name, level, parent_id });
});

router.put('/:id', adminOnly, (req, res) => {
  const db = getDb();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '部门名称不能为空' });
  db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', adminOnly, (req, res) => {
  const db = getDb();
  const children = db.prepare('SELECT COUNT(*) as count FROM departments WHERE parent_id = ?').get(req.params.id);
  if (children.count > 0) return res.status(400).json({ error: '请先删除子部门' });
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
