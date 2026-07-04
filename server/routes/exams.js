/**
 * 考试路由 — 考试 CRUD + 快照
 * 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { beijingNow, beijingDate } = require('../utils/time');

const router = express.Router();
router.use(authMiddleware);

// GET /api/exams
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { scope, status, search, page, pageSize } = req.query;
    let sql = 'SELECT * FROM exams WHERE 1=1';
    const params = [];
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isAdmin) {
      sql += ' AND status IN (?, ?)';
      params.push('published', 'ended');
    }

    if (scope && scope !== 'all') { sql += ' AND scope = ?'; params.push(scope); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (search) { sql += ' AND title LIKE ?'; params.push(`%${search}%`); }

    const countRow = await db.get(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), ...params);
    const total = Number(countRow.total);

    const pg = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 50, 200);
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(ps, (pg - 1) * ps);

    const exams = (await db.all(sql, ...params)).map(e => {
      e.rules = JSON.parse(e.rules || '[]');
      return e;
    });

    res.json({ exams, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) });
  } catch (err) {
    console.error('[exams/list] 错误:', err);
    res.status(500).json({ error: '获取考试列表失败' });
  }
});

// GET /api/exams/:id
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', req.params.id);
    if (!exam) return res.status(404).json({ error: '考试不存在' });
    exam.rules = JSON.parse(exam.rules || '[]');

    // 附上题目快照
    const questions = (await db.all('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order', exam.id)).map(q => {
      q.options = JSON.parse(q.options || 'null');
      q.answer = JSON.parse(q.answer || 'null');
      return q;
    });
    exam.questions = questions;

    res.json({ exam });
  } catch (err) {
    console.error('[exams/get] 错误:', err);
    res.status(500).json({ error: '获取考试详情失败' });
  }
});

// POST /api/exams
router.post('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const exam = req.body;
    const result = await db.run(`
      INSERT INTO exams (title, description, scope, project_id, status, start_time, end_time, duration, participants, question_count, total_score, pass_score, rules, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, exam.title, exam.description || '', exam.scope || 'public', exam.scope === 'project' ? exam.project_id : null,
      exam.status || 'draft', exam.start_time || null, exam.end_time || null, exam.duration || 60,
      exam.participants || 0, exam.question_count || 0, exam.total_score || 100, exam.pass_score || 60,
      JSON.stringify(exam.rules || []), beijingNow());

    const examId = result.lastInsertRowid;

    // 发布时立即生成题目快照
    if (exam.status === 'published' && exam.rules && exam.rules.length > 0) {
      await generateSnapshot(db, examId, exam.rules, exam.scope, exam.project_id);
    }

    res.json({ id: examId, title: exam.title });
  } catch (err) {
    console.error('[exams/create] 错误:', err);
    res.status(500).json({ error: '创建考试失败' });
  }
});

// PUT /api/exams/:id
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', id);
    if (!exam) return res.status(404).json({ error: '考试不存在' });

    const updates = req.body;
    const fields = [];
    const params = [];

    if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.start_time !== undefined) { fields.push('start_time = ?'); params.push(updates.start_time); }
    if (updates.end_time !== undefined) { fields.push('end_time = ?'); params.push(updates.end_time); }
    if (updates.duration !== undefined) { fields.push('duration = ?'); params.push(updates.duration); }
    if (updates.participants !== undefined) { fields.push('participants = ?'); params.push(updates.participants); }
    if (updates.question_count !== undefined) { fields.push('question_count = ?'); params.push(updates.question_count); }
    if (updates.total_score !== undefined) { fields.push('total_score = ?'); params.push(updates.total_score); }
    if (updates.pass_score !== undefined) { fields.push('pass_score = ?'); params.push(updates.pass_score); }
    if (updates.rules !== undefined) { fields.push('rules = ?'); params.push(JSON.stringify(updates.rules)); }
    if (updates.scope !== undefined) { fields.push('scope = ?'); params.push(updates.scope); }
    if (updates.project_id !== undefined) { fields.push('project_id = ?'); params.push(updates.project_id); }

    if (fields.length > 0) {
      params.push(id);
      await db.run(`UPDATE exams SET ${fields.join(', ')} WHERE id = ?`, ...params);
    }

    // 发布时生成/重建快照
    const newStatus = updates.status || exam.status;
    const newRules = updates.rules || JSON.parse(exam.rules || '[]');
    if (newStatus === 'published' && newRules.length > 0) {
      await generateSnapshot(db, id, newRules, exam.scope, exam.project_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[exams/update] 错误:', err);
    res.status(500).json({ error: '更新考试失败' });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM exams WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[exams/delete] 错误:', err);
    res.status(500).json({ error: '删除考试失败' });
  }
});

// 内部：生成题目快照
async function generateSnapshot(db, examId, rules, scope, projectId) {
  let pool;
  if (scope === 'project' && projectId) {
    pool = await db.all("SELECT * FROM questions WHERE status != 'deleted' AND scope = 'project' AND project_id = ?", projectId);
  } else {
    pool = await db.all("SELECT * FROM questions WHERE status != 'deleted' AND (scope = 'public' OR scope IS NULL)");
  }

  // 清空旧快照
  await db.run('DELETE FROM exam_questions WHERE exam_id = ?', examId);

  let sortOrder = 0;
  const insertedIds = [];

  for (const rule of rules) {
    let candidates = pool.filter(q => {
      if (q.type !== rule.type) return false;
      if (rule.difficulty && q.difficulty !== parseInt(rule.difficulty)) return false;
      if (insertedIds.includes(q.id)) return false;
      return true;
    });

    // 随机抽取
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const selected = candidates.slice(0, rule.count);
    for (const q of selected) {
      await db.run(`
        INSERT INTO exam_questions (exam_id, original_id, type, content, options, answer, analysis, difficulty, category, score, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, examId, q.id, q.type, q.content, q.options, q.answer, q.analysis, q.difficulty, q.category, rule.score || 10, sortOrder++);
      insertedIds.push(q.id);
    }
  }

  // 更新考试题目数
  if (insertedIds.length > 0) {
    await db.run('UPDATE exams SET question_count = ? WHERE id = ?', insertedIds.length, examId);
  }
}

module.exports = router;
