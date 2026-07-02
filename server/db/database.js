/**
 * sql.js 数据库包装层
 * 提供 better-sqlite3 兼容 API：
 *   db.prepare(sql).run(params)   → INSERT/UPDATE/DELETE
 *   db.prepare(sql).get(params)    → SELECT 单行
 *   db.prepare(sql).all(params)    → SELECT 多行
 * 参数支持数组 [p1, p2] 或对象 {col: val}（按 ? 顺序提取对象值）
 */
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'exam.db');

let _db = null;

// ---- sql.js Statement 兼容包装 ----

class Stmt {
  constructor(raw, sql) {
    this._raw = raw;    // sql.js Statement
    this._sql = sql;
  }

  /** 绑定参数（数组或对象）并执行一步 */
  _exec(params) {
    if (params !== undefined && params !== null) {
      if (Array.isArray(params)) {
        this._raw.bind(params);
      } else if (typeof params === 'object') {
        const vals = extractObjectValues(this._sql, params);
        this._raw.bind(vals);
      } else {
        // 标量值：包装为单元素数组
        this._raw.bind([params]);
      }
    }
    const hasRow = this._raw.step();
    const row = hasRow ? this._raw.getAsObject() : undefined;
    this._raw.reset(); // 复用 statement
    return row;
  }

  run(...params) {
    const row = this._exec(params.length === 1 ? params[0] : params);
    return { changes: row ? 1 : 0 };
  }

  get(...params) {
    return this._exec(params.length === 1 ? params[0] : params);
  }

  all(...params) {
    const rows = [];
    if (params.length === 1) {
      const p = params[0];
      if (Array.isArray(p)) {
        this._raw.bind(p);
      } else if (typeof p === 'object' && p !== null) {
        this._raw.bind(extractObjectValues(this._sql, p));
      } else {
        this._raw.bind([p]);
      }
      while (this._raw.step()) rows.push(this._raw.getAsObject());
    } else if (params.length > 0) {
      this._raw.bind(params);
      while (this._raw.step()) rows.push(this._raw.getAsObject());
    } else {
      // 无参数
      while (this._raw.step()) rows.push(this._raw.getAsObject());
    }
    return rows;
  }
}

/**
 * 从 SQL 中按 ? 顺序提取对象属性值
 */
function extractObjectValues(sql, obj) {
  const vals = [];
  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "'") depth ^= 1;
    if (depth === 0 && sql[i] === '?') vals.push(obj[Object.keys(obj)[vals.length]]);
  }
  return vals;
}

// ---- sql.js Database 兼容包装 ----

class SqlJsDb {
  constructor(sqljsDb) {
    this._inner = sqljsDb;
  }

  exec(sql) {
    this._inner.run(sql);
  }

  run(sql, ...params) {
    const stmt = this._inner.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params.length === 1 ? [params[0]] : params);
    }
    stmt.step();
    stmt.free();
  }

  pragma(p) {
    try { this._inner.run('PRAGMA ' + p); } catch (e) {}
  }

  prepare(sql) {
    return new Stmt(this._inner.prepare(sql), sql);
  }

  _save() {
    const data = this._inner.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  close() {
    this._save();
    this._inner.close();
  }
}

// ---- 对外 API ----

function init(sqljs) {
  if (_db) return _db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let rawDb;
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    rawDb = new sqljs.Database(buf);
  } else {
    rawDb = new sqljs.Database();
  }

  const db = new SqlJsDb(rawDb);
  db.pragma('foreign_keys = ON');

  const { initSchema } = require('./schema');
  initSchema(db);

  _db = db;
  return _db;
}

function getDb() {
  if (!_db) throw new Error('请先调用 init(sqljs) 初始化数据库');
  return _db;
}

function closeDb() {
  if (_db) { _db.close(); _db = null; }
}

module.exports = { init, getDb, closeDb };
