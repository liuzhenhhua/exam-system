/**
 * 企业在线考试系统 - 后端服务入口
 * Node.js + Express + 双数据库适配（SQLite / PostgreSQL）
 * Railway 部署：有 DATABASE_URL 时自动切换 PostgreSQL
 */
const express = require('express');
const cors = require('cors');
const path = require('path');

const { init: initDb, getDb, closeDb, getDbType } = require('./db/database');

async function main() {
  // 1. 初始化数据库（自动检测 PostgreSQL / SQLite）
  await initDb();
  const dbType = getDbType();
  console.log(`[数据库] 类型: ${dbType}`);

  // 2. 初始化 Express
  const app = express();
  const PORT = process.env.PORT || 3000;

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 静态文件（前端页面）
  app.use(express.static(path.join(__dirname, '..')));

  // 健康检查（放在路由之前，不受 auth 中间件拦截）
  app.get('/api/health', async (req, res) => {
    try {
      const db = getDb();
      await db.healthCheck();
      res.json({ status: 'ok', db: dbType });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // API 路由（按需加载，确保数据库已初始化）
  app.use('/api/auth',      require('./routes/auth'));
  app.use('/api/users',     require('./routes/users'));
  app.use('/api/exams',     require('./routes/exams'));
  app.use('/api/questions', require('./routes/questions'));
  app.use('/api/results',  require('./routes/results'));
  app.use('/api/departments', require('./routes/departments'));
  app.use('/api',           require('./routes/misc'));

  // 404 处理（API 未匹配 → 返回 404）
  app.use('/api', (req, res) => {
    res.status(404).json({ error: '接口不存在' });
  });

  // 启动服务
  app.listen(PORT, () => {
    console.log(`✅ 考试系统后端已启动: http://localhost:${PORT}`);
    console.log(`   前端页面:          http://localhost:${PORT}/`);
    console.log(`   API 健康检查:      http://localhost:${PORT}/api/health`);
    console.log(`   数据库:            ${dbType}`);
  });

  // 优雅关闭
  process.on('SIGINT',  () => { closeDb().then(() => process.exit(0)); });
  process.on('SIGTERM', () => { closeDb().then(() => process.exit(0)); });
}

main().catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
