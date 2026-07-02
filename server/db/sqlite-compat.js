/**
 * sql.js 兼容层（原 database.js 中的 SqlJsDb + Stmt）
 * 仅供本地 SQLite 模式使用
 */
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'exam.db');

class Stmt {
  constructor(raw, sql) {
    this._raw = raw;
    this._sql = sql;
  }

  _exec(params) {
    if (params !== undefined && params !== null) {
      if (Array.isArray(params)) {
        this._raw.bind(params);
      } else if (typeof params === 'object') {
        const vals = extractObjectValues(this._sql, params);
        this._raw.bind(vals);
      } else {
        this._raw.bind([params]);
      }
    }
    const hasRow = this._raw.step();
    const row = hasRow ? this._raw.getAsObject() : undefined;
    this._raw.reset();
    return row;
  }

  run(...params) {
    const row = this._exec(params.length === 1 ? params[0] : params);
    return { changes: row ? 1 : 0, lastInsertRowid: null };
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
      while (this._raw.step()) rows.push(this._raw.getAsObject());
    }
    return rows;
  }
}

function extractObjectValues(sql, obj) {
  const vals = [];
  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "'") depth ^= 1;
    if (depth === 0 && sql[i] === '?') vals.push(obj[Object.keys(obj)[vals.length]]);
  }
  return vals;
}

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

module.exports = { SqlJsDb, Stmt };
