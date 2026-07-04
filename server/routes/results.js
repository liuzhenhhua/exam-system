/**
 * 考试结果路由 — 交卷 / 阅卷 / 统计
 * 全部改为 async 以兼容 PostgreSQL
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/results — 考生交卷
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { examId, username, real_name, department, results: answerResults, passScore, totalScore, timeSpent, manualReviewCount } = req.body;

    if (!examId || !username) return res.status(400).json({ error: '缺少必要参数' });
    if (!Array.isArray(answerResults)) return res.status(400).json({ error: '缺少答题结果数据' });

    // 检查是否已交卷
    const existing = await db.get('SELECT id FROM results WHERE exam_id = ? AND username = ?', examId, username);
    if (existing) return res.status(400).json({ error: '您已提交过该考试' });

    // 获取考试题目快照用于批改
    const questions = await db.all('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order', examId);
    let autoScore = 0;
    let correctCount = 0;
    let wrongCount = 0;

    // 批改客观题
    const scoredResults = answerResults.map((r, idx) => {
      const q = questions[idx];
      if (!q) return r;

      const userAnswer = r.userAnswer;
      let isCorrect = false;

      if (!r.manualReview && q.type !== 'short') {
        const correctAnswer = JSON.parse(q.answer || 'null');
        if (q.type === 'multiple') {
          if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
            isCorrect = userAnswer.length === correctAnswer.length &&
              userAnswer.every(a => correctAnswer.includes(a));
          }
        } else if (q.type === 'judge') {
          isCorrect = userAnswer === correctAnswer;
        } else {
          isCorrect = userAnswer === correctAnswer;
        }

        const score = isCorrect ? (q.score || 0) : 0;
        autoScore += score;
        if (isCorrect) correctCount++; else wrongCount++;
      }

      return { ...r, isCorrect, score: r.manualReview ? 0 : (isCorrect ? (q.score || 0) : 0), manualReview: r.manualReview || false };
    });

    const mrc = manualReviewCount || scoredResults.filter(r => r.manualReview).length;
    const reviewCompleted = mrc === 0;

    let resultId;
    // 主结果 + 明细 + 参与人数更新放在同一事务，避免孤立记录
    await db.transaction(async (tx) => {
      const result = await tx.run(`
        INSERT INTO results (exam_id, user_id, username, real_name, department, score, pass_score, passed, correct_count, wrong_count, total_score, auto_score, objective_score, manual_review_count, review_completed, time_spent, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, examId, req.user.id || null, username, real_name || '', department || '',
        autoScore, passScore || 60, reviewCompleted ? (autoScore >= (passScore || 60) ? 1 : 0) : null,
        correctCount, wrongCount, totalScore || 100, autoScore, autoScore, mrc,
        reviewCompleted ? 1 : 0, timeSpent || '', new Date().toISOString().replace('T', ' ').slice(0, 19));

      resultId = result.lastInsertRowid || result.lastID;

      // 批量插入每题作答明细（优化：单条多行 INSERT）
      if (scoredResults.length > 0) {
        const placeholders = scoredResults.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const flatParams = [];
        for (let idx = 0; idx < scoredResults.length; idx++) {
          const r = scoredResults[idx];
          const q = questions[idx];
          flatParams.push(
            resultId, idx, q ? q.original_id : null, r.type || (q ? q.type : 'single'), r.content || '',
            JSON.stringify(r.userAnswer || null), r.isCorrect ? 1 : 0, r.score || 0,
            r.manualReview ? 1 : 0, null, '', q ? (q.score || 10) : 10
          );
        }
        await tx.run(`
          INSERT INTO result_details (result_id, question_index, question_id, type, content, user_answer, is_correct, score, manual_review, review_score, review_comment, max_score)
          VALUES ${placeholders}
        `, ...flatParams);
      }

      // 更新考试参与人数
      await tx.run('UPDATE exams SET participants = participants + 1 WHERE id = ?', examId);
    });

    const fullResult = await db.get('SELECT * FROM results WHERE id = ?', resultId);
    return res.json({
      result: {
        ...fullResult,
        score: reviewCompleted ? fullResult.score : autoScore,
        passed: reviewCompleted ? fullResult.passed : null,
        objectiveScore: autoScore,
        reviewCompleted: !!reviewCompleted,
        details: scoredResults
      }
    });
  } catch (err) {
    console.error('[results/submit] 错误:', err);
    res.status(500).json({ error: '提交考试结果失败' });
  }
});

// GET /api/results — 获取所有结果
router.get('/', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const { examId, review } = req.query;
    let sql = `SELECT r.*, e.title as exam_title,
      (SELECT COUNT(*) FROM result_details WHERE result_id = r.id) as question_count
      FROM results r LEFT JOIN exams e ON r.exam_id = e.id WHERE 1=1`;
    const params = [];

    if (examId) { sql += ' AND r.exam_id = ?'; params.push(examId); }
    if (review === 'pending') { sql += ' AND r.manual_review_count > 0 AND r.review_completed = 0'; }

    sql += ' ORDER BY r.submitted_at DESC';
    const results = await db.all(sql, ...params);
    res.json({ results });
  } catch (err) {
    console.error('[results/list] 错误:', err);
    res.status(500).json({ error: '获取成绩列表失败' });
  }
});

// GET /api/results/my — 考生查询自己的成绩
router.get('/my', async (req, res) => {
  try {
    const db = getDb();
    const results = await db.all('SELECT * FROM results WHERE username = ? ORDER BY submitted_at DESC', req.user.username);
    res.json({ results });
  } catch (err) {
    console.error('[results/my] 错误:', err);
    res.status(500).json({ error: '获取我的成绩失败' });
  }
});

// GET /api/results/exam/:examId — 获取某考试的所有成绩
router.get('/exam/:examId', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const results = await db.all('SELECT * FROM results WHERE exam_id = ? ORDER BY score DESC', req.params.examId);
    res.json({ results });
  } catch (err) {
    console.error('[results/exam] 错误:', err);
    res.status(500).json({ error: '获取考试成绩失败' });
  }
});

// GET /api/results/:id/details — 获取某次结果的答题详情
router.get('/:id/details', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.get('SELECT * FROM results WHERE id = ?', req.params.id);
    if (!result) return res.status(404).json({ error: '结果不存在' });

    // 权限检查
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    if (!isAdmin && result.username !== req.user.username) {
      return res.status(403).json({ error: '无权查看' });
    }

    const details = (await db.all('SELECT * FROM result_details WHERE result_id = ? ORDER BY question_index', result.id)).map(d => {
      d.user_answer = JSON.parse(d.user_answer || 'null');
      return d;
    });

    res.json({ result, details });
  } catch (err) {
    console.error('[results/details] 错误:', err);
    res.status(500).json({ error: '获取成绩详情失败' });
  }
});

// PUT /api/results/:id/review — 阅卷打分
router.put('/:id/review', adminOnly, async (req, res) => {
  try {
    const db = getDb();
    const resultId = parseInt(req.params.id);
    const { questionIndex, score: rawScore, comment } = req.body;
    const score = Number(rawScore) || 0;

    const detail = await db.get('SELECT * FROM result_details WHERE result_id = ? AND question_index = ?', resultId, questionIndex);
    if (!detail) return res.status(404).json({ error: '题目不存在' });

    const maxScore = detail.max_score || 10;
    if (typeof score !== 'number' || score < 0 || score > maxScore) {
      return res.status(400).json({ error: `分数应在 0~${maxScore} 之间` });
    }

    await db.run('UPDATE result_details SET review_score = ?, review_comment = ?, is_correct = ? WHERE result_id = ? AND question_index = ?',
      score || 0, comment || '', score > 0 ? 1 : 0, resultId, questionIndex);

    // 重新计算总分
    await recalculateScore(db, resultId);

    const result = await db.get('SELECT * FROM results WHERE id = ?', resultId);
    res.json({ result });
  } catch (err) {
    console.error('[results/review] 错误:', err);
    res.status(500).json({ error: '阅卷失败' });
  }
});

async function recalculateScore(db, resultId) {
  const details = await db.all('SELECT * FROM result_details WHERE result_id = ?', resultId);
  let autoScore = 0, manualScore = 0, correctCount = 0, wrongCount = 0;
  const pendingReview = details.filter(d => d.manual_review && d.review_score === null);

  details.forEach(d => {
    if (d.manual_review) {
      if (d.review_score !== null) {
        manualScore += d.review_score;
        if (d.review_score > 0) correctCount++; else wrongCount++;
      }
    } else {
      if (d.is_correct) { correctCount++; autoScore += d.score; }
      else { wrongCount++; }
    }
  });

  const completed = pendingReview.length === 0;
  const totalScore = Math.round(autoScore + manualScore);

  const result = await db.get('SELECT * FROM results WHERE id = ?', resultId);
  await db.run(`
    UPDATE results SET score = ?, auto_score = ?, passed = ?, correct_count = ?, wrong_count = ?, review_completed = ?
    WHERE id = ?
  `, totalScore, autoScore, completed ? (totalScore >= (result.pass_score || 60) ? 1 : 0) : null, correctCount, wrongCount, completed ? 1 : 0, resultId);
}

module.exports = router;
