/**
 * 题库路由 — 题目 CRUD
 * 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/questions
router.get('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { scope, project_id, type, category, difficulty, search, status, page, pageSize } = req.query;
    let sql = "SELECT * FROM questions WHERE status != 'deleted'";
    const params = [];

    if (scope) { sql += ' AND scope = ?'; params.push(scope); }
    if (project_id) { sql += ' AND project_id = ?'; params.push(project_id); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (difficulty) { sql += ' AND difficulty = ?'; params.push(parseInt(difficulty)); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (search) { sql += ' AND content LIKE ?'; params.push(`%${search}%`); }

    const countRow = await db.get(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), ...params);
    const total = Number(countRow.total);

    const pg = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 500, 2000);
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(ps, (pg - 1) * ps);

    const questions = (await db.all(sql, ...params)).map(q => {
      q.options = JSON.parse(q.options || 'null');
      q.answer = JSON.parse(q.answer || 'null');
      return q;
    });

    res.json({ questions, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) });
  } catch (err) {
    console.error('[questions/list] 错误:', err);
    res.status(500).json({ error: '获取题库列表失败' });
  }
});

// POST /api/questions
router.post('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const q = req.body;
    if (!q.type || !q.content) return res.status(400).json({ error: '题型和题干为必填项' });

    const result = await db.run(`
      INSERT INTO questions (type, scope, project_id, category, difficulty, content, options, answer, analysis, status, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, q.type, q.scope || 'public', q.scope === 'project' ? q.project_id : null,
      q.category || '', q.difficulty || 1, q.content,
      JSON.stringify(q.options || null), JSON.stringify(q.answer || null),
      q.analysis || '', q.status || 'active', q.created || new Date().toISOString().slice(0, 10));
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('[questions/create] 错误:', err);
    res.status(500).json({ error: '创建题目失败' });
  }
});

// POST /api/questions/batch
router.post('/batch', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { questions, scope, project_id } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: '请提交有效的题目列表' });

    const date = new Date().toISOString().slice(0, 10);
    let count = 0;

    await db.transaction(async (tx) => {
      for (const q of questions) {
        await tx.run(`
          INSERT INTO questions (type, scope, project_id, category, difficulty, content, options, answer, analysis, status, created)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, q.type, scope || 'public', scope === 'project' ? (project_id || null) : null,
          q.category || '', q.difficulty || 1, q.content,
          JSON.stringify(q.options || null), JSON.stringify(q.answer || null),
          q.analysis || '', 'active', q.created || date);
        count++;
      }
    });

    res.json({ success: true, count });
  } catch (err) {
    console.error('[questions/batch] 错误:', err);
    res.status(500).json({ error: '批量创建题目失败' });
  }
});

// PUT /api/questions/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const q = await db.get('SELECT * FROM questions WHERE id = ?', id);
    if (!q) return res.status(404).json({ error: '题目不存在' });

    const u = req.body;
    const fields = [];
    const params = [];
    if (u.type !== undefined) { fields.push('type = ?'); params.push(u.type); }
    if (u.scope !== undefined) { fields.push('scope = ?'); params.push(u.scope); }
    if (u.project_id !== undefined) { fields.push('project_id = ?'); params.push(u.project_id); }
    if (u.category !== undefined) { fields.push('category = ?'); params.push(u.category); }
    if (u.difficulty !== undefined) { fields.push('difficulty = ?'); params.push(u.difficulty); }
    if (u.content !== undefined) { fields.push('content = ?'); params.push(u.content); }
    if (u.options !== undefined) { fields.push('options = ?'); params.push(JSON.stringify(u.options)); }
    if (u.answer !== undefined) { fields.push('answer = ?'); params.push(JSON.stringify(u.answer)); }
    if (u.analysis !== undefined) { fields.push('analysis = ?'); params.push(u.analysis); }
    if (u.status !== undefined) { fields.push('status = ?'); params.push(u.status); }

    if (fields.length > 0) {
      params.push(id);
      await db.run(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, ...params);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[questions/update] 错误:', err);
    res.status(500).json({ error: '更新题目失败' });
  }
});

// DELETE /api/questions/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    await db.run("UPDATE questions SET status = 'deleted' WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[questions/delete] 错误:', err);
    res.status(500).json({ error: '删除题目失败' });
  }
});

// GET /api/questions/stats
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const questions = await db.all("SELECT * FROM questions WHERE status != 'deleted'");
    const stats = {
      total: questions.length,
      public: questions.filter(q => !q.scope || q.scope === 'public').length,
      project: questions.filter(q => q.scope === 'project').length,
      single: questions.filter(q => q.type === 'single').length,
      multiple: questions.filter(q => q.type === 'multiple').length,
      judge: questions.filter(q => q.type === 'judge').length,
      short: questions.filter(q => q.type === 'short').length
    };
    res.json({ stats });
  } catch (err) {
    console.error('[questions/stats] 错误:', err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

module.exports = router;
