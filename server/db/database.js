/**
 * 数据库统一入口
 * 自动检测：有 DATABASE_URL → PostgreSQL，否则 → sql.js (SQLite)
 * 所有 API 统一为 async：db.get(sql, params), db.all(sql, params), db.run(sql, params)
 */
const path = require('path');
const fs = require('fs');

let _db = null;   // 适配器实例
let _type = null;  // 'pg' | 'sqlite'

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'exam.db');

// ---- SQLite 同步适配器（包装为 async API） ----

class SqliteAdapter {
  constructor(sqljsDb) {
    this._inner = sqljsDb;  // SqlJsDb 实例（原 database.js 中的）
    this._saveTimer = null;
    this._startAutoSave();
  }

  _startAutoSave() {
    this._saveTimer = setInterval(() => {
      try { this._inner._save(); } catch (e) { /* ignore */ }
    }, 30000);
  }

  async get(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    return this._inner.prepare(sql).get(...p);
  }

  async all(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    return this._inner.prepare(sql).all(...p);
  }

  async run(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const result = this._inner.prepare(sql).run(...p);
    // SQLite 模式下获取最后插入的 ID（Stmt.run() 不返回此值）
    if (sql.trim().match(/^INSERT/i)) {
      const row = this._inner.prepare('SELECT last_insert_rowid() as id').get();
      result.lastInsertRowid = row ? row.id : null;
    }
    // 写操作后立即持久化，防止并发场景下数据丢失
    if (sql.trim().match(/^(INSERT|UPDATE|DELETE|REPLACE)/i)) {
      this._inner._save();
    }
    return result;
  }

  async exec(sql) {
    this._inner.exec(sql);
  }

  async transaction(callback) {
    // SQLite 的事务通过 SqlJsDb.transaction() 实现
    // 但 callback 现在是 async，需要特殊处理
    this._inner._inner.run('BEGIN');
    try {
      // 创建事务适配器
      const txAdapter = new SqliteTxAdapter(this._inner);
      await callback(txAdapter);
      this._inner._inner.run('COMMIT');
      this._inner._save();
    } catch (err) {
      this._inner._inner.run('ROLLBACK');
      throw err;
    }
  }

  async close() {
    if (this._saveTimer) clearInterval(this._saveTimer);
    this._inner.close();
  }

  async healthCheck() {
    this._inner._inner.run('SELECT 1');
    return true;
  }

  _normalizeParams(params) {
    if (params === undefined || params === null) return [];
    if (Array.isArray(params)) return params;
    return [params];
  }
}

/** SQLite 事务适配器 */
class SqliteTxAdapter {
  constructor(inner) {
    this._inner = inner;
  }

  async get(sql, ...params) {
    const p = params.length === 1 && !Array.isArray(params[0]) ? params : (params.length === 1 ? params[0] : params);
    return this._inner.prepare(sql).get(...(Array.isArray(p) ? p : [p]));
  }

  async all(sql, ...params) {
    const p = params.length === 1 && !Array.isArray(params[0]) ? params : (params.length === 1 ? params[0] : params);
    return this._inner.prepare(sql).all(...(Array.isArray(p) ? p : [p]));
  }

  async run(sql, ...params) {
    const p = params.length === 1 && !Array.isArray(params[0]) ? params : (params.length === 1 ? params[0] : params);
    return this._inner.prepare(sql).run(...(Array.isArray(p) ? p : [p]));
  }

  async exec(sql) {
    this._inner.exec(sql);
  }
}

// ---- 初始化 ----

async function init(SQL_or_none) {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // PostgreSQL 模式
    console.log('[数据库] 使用 PostgreSQL (云端模式)');
    const { PgAdapter } = require('./pg-adapter');
    _db = new PgAdapter(databaseUrl);
    _type = 'pg';
    await _db.healthCheck();
    const { initSchema } = require('./schema');
    await initSchema(_db, _type);
  } else {
    // SQLite 模式
    console.log('[数据库] 使用 SQLite (本地模式)');
    const initSqlJs = require('sql.js');
    const SQL = SQL_or_none || (await initSqlJs());

    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let rawDb;
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      rawDb = new SQL.Database(buf);
    } else {
      rawDb = new SQL.Database();
    }

    // 包装为 SqlJsDb（保留原 compat 层）
    const { SqlJsDb } = require('./sqlite-compat');
    const dbCompat = new SqlJsDb(rawDb);
    dbCompat.pragma('foreign_keys = ON');

    const { initSchema } = require('./schema');
    initSchema(dbCompat, 'sqlite');

    _db = new SqliteAdapter(dbCompat);
    _type = 'sqlite';
  }

  return _db;
}

function getDb() {
  if (!_db) throw new Error('请先调用 init() 初始化数据库');
  return _db;
}

function getDbType() {
  return _type;
}

async function closeDb() {
  if (_db) {
    await _db.close();
    _db = null;
    _type = null;
  }
}

module.exports = { init, getDb, getDbType, closeDb };
