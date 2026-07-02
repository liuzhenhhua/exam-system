/**
 * 考试结果路由 — 交卷 / 阅卷 / 统计
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/results — 考生交卷
router.post('/', (req, res) => {
  const db = getDb();
  const { examId, username, real_name, department, results: answerResults, passScore, totalScore, timeSpent, manualReviewCount } = req.body;

  if (!examId || !username) return res.status(400).json({ error: '缺少必要参数' });

  // 检查是否已交卷
  const existing = db.prepare('SELECT id FROM results WHERE exam_id = ? AND username = ?').get(examId, username);
  if (existing) return res.status(400).json({ error: '您已提交过该考试' });

  // 获取考试题目快照用于批改
  const questions = db.prepare('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order').all(examId);
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
        // single
        isCorrect = userAnswer === correctAnswer;
      }

      const score = isCorrect ? (q.score || 0) : 0;
      autoScore += score;
      if (isCorrect) correctCount++; else wrongCount++;
    }

    return { ...r, isCorrect, score: r.manualReview ? 0 : (isCorrect ? (q.score || 0) : 0), manualReview: r.manualReview || false };
  });

  // 插入主结果记录
  const mrc = manualReviewCount || scoredResults.filter(r => r.manualReview).length;
  const reviewCompleted = mrc === 0;
  const result = db.prepare(`
    INSERT INTO results (exam_id, user_id, username, real_name, department, score, pass_score, passed, correct_count, wrong_count, total_score, auto_score, objective_score, manual_review_count, review_completed, time_spent, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    examId, req.user.id || null, username, real_name || '', department || '',
    autoScore, passScore || 60, reviewCompleted ? (autoScore >= (passScore || 60) ? 1 : 0) : null,
    correctCount, wrongCount, totalScore || 100, autoScore, autoScore, mrc,
    reviewCompleted ? 1 : 0, timeSpent || '', new Date().toISOString().replace('T', ' ').slice(0, 19)
  );

  const resultId = result.lastInsertRowid;

  // 插入每题作答明细
  const insertDetail = db.prepare(`
    INSERT INTO result_details (result_id, question_index, question_id, type, content, user_answer, is_correct, score, manual_review, review_score, review_comment, max_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    scoredResults.forEach((r, idx) => {
      const q = questions[idx];
      insertDetail.run(
        resultId, idx, q ? q.original_id : null, r.type || (q ? q.type : 'single'), r.content || '',
        JSON.stringify(r.userAnswer || null), r.isCorrect ? 1 : 0, r.score || 0,
        r.manualReview ? 1 : 0, null, '', q ? (q.score || 10) : 10
      );
    });
  });
  transaction();

  // 更新考试参与人数
  db.prepare('UPDATE exams SET participants = participants + 1 WHERE id = ?').run(examId);

  const fullResult = db.prepare('SELECT * FROM results WHERE id = ?').get(resultId);
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
});

// GET /api/results — 获取所有结果
router.get('/', adminOnly, (req, res) => {
  const db = getDb();
  const { examId, review } = req.query;
  let sql = 'SELECT * FROM results WHERE 1=1';
  const params = [];

  if (examId) { sql += ' AND exam_id = ?'; params.push(examId); }
  if (review === 'pending') { sql += ' AND manual_review_count > 0 AND review_completed = 0'; }

  sql += ' ORDER BY submitted_at DESC';
  const results = db.prepare(sql).all(...params);
  res.json({ results });
});

// GET /api/results/my — 考生查询自己的成绩
router.get('/my', (req, res) => {
  const db = getDb();
  const results = db.prepare('SELECT * FROM results WHERE username = ? ORDER BY submitted_at DESC').all(req.user.username);
  res.json({ results });
});

// GET /api/results/exam/:examId — 获取某考试的所有成绩
router.get('/exam/:examId', adminOnly, (req, res) => {
  const db = getDb();
  const results = db.prepare('SELECT * FROM results WHERE exam_id = ? ORDER BY score DESC').all(req.params.examId);
  res.json({ results });
});

// GET /api/results/:id/details — 获取某次结果的答题详情
router.get('/:id/details', (req, res) => {
  const db = getDb();
  const result = db.prepare('SELECT * FROM results WHERE id = ?').get(req.params.id);
  if (!result) return res.status(404).json({ error: '结果不存在' });

  // 权限检查
  const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
  if (!isAdmin && result.username !== req.user.username) {
    return res.status(403).json({ error: '无权查看' });
  }

  const details = db.prepare('SELECT * FROM result_details WHERE result_id = ? ORDER BY question_index').all(result.id);
  const parsed = details.map(d => {
    d.user_answer = JSON.parse(d.user_answer || 'null');
    return d;
  });

  res.json({ result, details: parsed });
});

// PUT /api/results/:id/review — 阅卷打分
router.put('/:id/review', adminOnly, (req, res) => {
  const db = getDb();
  const resultId = parseInt(req.params.id);
  const { questionIndex, score, comment } = req.body;

  const detail = db.prepare('SELECT * FROM result_details WHERE result_id = ? AND question_index = ?').get(resultId, questionIndex);
  if (!detail) return res.status(404).json({ error: '题目不存在' });

  db.prepare('UPDATE result_details SET review_score = ?, review_comment = ?, is_correct = ? WHERE result_id = ? AND question_index = ?')
    .run(score || 0, comment || '', score > 0 ? 1 : 0, resultId, questionIndex);

  // 重新计算总分
  recalculateScore(db, resultId);

  const result = db.prepare('SELECT * FROM results WHERE id = ?').get(resultId);
  res.json({ result });
});

function recalculateScore(db, resultId) {
  const details = db.prepare('SELECT * FROM result_details WHERE result_id = ?').all(resultId);
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

  const result = db.prepare('SELECT * FROM results WHERE id = ?').get(resultId);
  db.prepare(`
    UPDATE results SET score = ?, auto_score = ?, passed = ?, correct_count = ?, wrong_count = ?, review_completed = ?
    WHERE id = ?
  `).run(totalScore, autoScore, completed ? (totalScore >= (result.pass_score || 60) ? 1 : 0) : null, correctCount, wrongCount, completed ? 1 : 0, resultId);
}

module.exports = router;
