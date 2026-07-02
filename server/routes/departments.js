/**
 * 部门路由
 * 全部改为 async 以兼容 PostgreSQL
 * 修复：PUT 支持更新 level/parent_id + 联动更新用户部门文本
 * 修复：DELETE 检查关联用户 + 清理用户 department_id
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// 获取部门完整路径（内部辅助函数）
async function getFullPath(db, deptId) {
  const path = [];
  let currentId = deptId;
  while (currentId) {
    const row = await db.get('SELECT id, name, parent_id FROM departments WHERE id = ?', currentId);
    if (!row) break;
    path.unshift(row.name);
    currentId = row.parent_id;
  }
  return path.join(' / ');
}

// 获取部门列表
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

// 新增部门
router.post('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { name, level, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: '部门名称不能为空' });
    const result = await db.run(
      'INSERT INTO departments (name, level, parent_id) VALUES (?, ?, ?)',
      name, level || 1, parent_id || null
    );
    res.json({ id: result.lastInsertRowid, name, level, parent_id });
  } catch (err) {
    console.error('[departments/create] 错误:', err);
    res.status(500).json({ error: '创建部门失败' });
  }
});

// 更新部门（支持 name + level + parent_id，联动更新用户 department 文本）
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const { name, level, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: '部门名称不能为空' });

    // 更新部门基本信息
    await db.run(
      'UPDATE departments SET name = ?, level = ?, parent_id = ? WHERE id = ?',
      name, level || 1, parent_id || null, id
    );

    // 联动更新所有关联用户的 department 文本字段
    const newPath = await getFullPath(db, id);
    await db.run(
      'UPDATE users SET department = ? WHERE department_id = ?',
      newPath, id
    );

    // 同时更新子部门路径（因为父部门名称变了，子部门的完整路径也会变）
    const children = await db.all('SELECT id FROM departments WHERE parent_id = ?', id);
    for (const child of children) {
      const childPath = await getFullPath(db, child.id);
      await db.run('UPDATE users SET department = ? WHERE department_id = ?', childPath, child.id);
      // 递归处理孙部门
      const grandchildren = await db.all('SELECT id FROM departments WHERE parent_id = ?', child.id);
      for (const gc of grandchildren) {
        const gcPath = await getFullPath(db, gc.id);
        await db.run('UPDATE users SET department = ? WHERE department_id = ?', gcPath, gc.id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[departments/update] 错误:', err);
    res.status(500).json({ error: '更新部门失败' });
  }
});

// 删除部门（检查子部门 + 关联用户，清理用户 department_id）
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;

    // 检查子部门
    const children = await db.get('SELECT COUNT(*) as count FROM departments WHERE parent_id = ?', id);
    if (Number(children.count) > 0) {
      return res.status(400).json({ error: '请先删除子部门' });
    }

    // 检查关联用户
    const users = await db.get('SELECT COUNT(*) as count FROM users WHERE department_id = ?', id);
    if (Number(users.count) > 0) {
      return res.status(400).json({ error: `该部门下还有 ${users.count} 个用户，请先转移或删除这些用户` });
    }

    await db.run('DELETE FROM departments WHERE id = ?', id);
    res.json({ success: true });
  } catch (err) {
    console.error('[departments/delete] 错误:', err);
    res.status(500).json({ error: '删除部门失败' });
  }
});

module.exports = router;
