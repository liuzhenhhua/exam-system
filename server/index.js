/**
 * 企业在线考试系统 - 后端服务入口
 * Node.js + Express + sql.js (纯 JS SQLite，零依赖编译)
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const initSqlJs = require('sql.js');

const { init: initDb, closeDb } = require('./db/database');

async function main() {
  // 1. 初始化数据库（sql.js WASM 加载完成后立即可用，API 同步）
  const SQL = await initSqlJs();
  const { init: initDb, closeDb } = require('./db/database');
  initDb(SQL);

  // 2. 初始化 Express
  const app = express();
  const PORT = process.env.PORT || 3000;

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 静态文件（前端页面）
  app.use(express.static(path.join(__dirname, '..')));

  // API 路由（按需加载，确保数据库已初始化）
  app.use('/api/auth',      require('./routes/auth'));
  app.use('/api/users',     require('./routes/users'));
  app.use('/api/exams',     require('./routes/exams'));
  app.use('/api/questions', require('./routes/questions'));
  app.use('/api/results',  require('./routes/results'));
  app.use('/api/departments', require('./routes/departments'));
  app.use('/api',           require('./routes/misc'));

  // 健康检查
  app.get('/api/health', (req, res) => {
    try {
      const { getDb } = require('./db/database');
      getDb().run('SELECT 1');
      res.json({ status: 'ok', db: 'connected' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // 404 处理（API 未匹配 → 返回 404）
  app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
  });

  // 启动服务
  app.listen(PORT, () => {
    console.log(`✅ 考试系统后端已启动: http://localhost:${PORT}`);
    console.log(`   前端页面:          http://localhost:${PORT}/`);
    console.log(`   API 文档:          http://localhost:${PORT}/api/health`);
  });

  // 优雅关闭
  process.on('SIGINT',  () => { closeDb(); process.exit(0); });
  process.on('SIGTERM', () => { closeDb(); process.exit(0); });
}

main().catch(err => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
