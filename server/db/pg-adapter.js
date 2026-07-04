/**
 * PostgreSQL 适配器
 * 提供与 SQLite 相同的 get/all/run/exec API，但使用 PostgreSQL
 * SQL 中 ? 占位符自动转换为 $1, $2, ...
 */
const { Pool } = require('pg');
const pgTypes = require('pg').native ? require('pg').native.types : require('pg').types;

// PostgreSQL 默认将 int8(bigint) 和 numeric 返回为字符串，这里统一转为 JS 数字
const numericTypes = [20, 21, 23, 700, 701, 1700]; // int8, int2, int4, float4, float8, numeric
numericTypes.forEach(oid => {
  pgTypes.setTypeParser(oid, val => val === null ? null : Number(val));
});

class PgAdapter {
  constructor(connectionString) {
    this._pool = new Pool({ connectionString, max: 25, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    this._pool.on('error', (err) => {
      console.error('[PostgreSQL] 连接池错误:', err.message);
    });
  }

  /** 将 ? 占位符转换为 PostgreSQL 的 $1, $2, ... */
  _convertPlaceholders(sql) {
    let idx = 0;
    let result = '';
    let inQuote = false;
    for (let i = 0; i < sql.length; i++) {
      if (sql[i] === "'" && (i === 0 || sql[i - 1] !== '\\')) inQuote = !inQuote;
      if (!inQuote && sql[i] === '?') {
        idx++;
        result += '$' + idx;
      } else {
        result += sql[i];
      }
    }
    return result;
  }

  /** 标准化参数：单值包装为数组 */
  _normalizeParams(params) {
    if (params === undefined || params === null) return [];
    if (Array.isArray(params)) return params;
    return [params];
  }

  /** 查询一行 */
  async get(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const pgSql = this._convertPlaceholders(sql);
    const result = await this._pool.query(pgSql, p);
    return result.rows[0] || undefined;
  }

  /** 查询多行 */
  async all(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const pgSql = this._convertPlaceholders(sql);
    const result = await this._pool.query(pgSql, p);
    return result.rows;
  }

  /** 执行写操作，返回 { changes, lastInsertRowid } */
  async run(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const pgSql = this._convertPlaceholders(sql);

    // 如果 INSERT 语句没有 RETURNING，自动追加 RETURNING id
    let returningSql = pgSql;
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.includes('RETURNING')) {
      returningSql = pgSql + ' RETURNING id';
    }

    const result = await this._pool.query(returningSql, p);
    const rowCount = result.rowCount || result.rows.length || 0;
    const lastInsertRowid = result.rows[0]?.id || null;
    return { changes: rowCount, lastInsertRowid };
  }

  /** 执行原始 SQL（无参数绑定，用于建表等） */
  async exec(sql) {
    await this._pool.query(sql);
  }

  /** 事务执行 */
  async transaction(callback) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      // 创建事务上下文 adapter
      const txAdapter = new PgTransactionAdapter(client);
      await callback(txAdapter);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** 关闭连接池 */
  async close() {
    await this._pool.end();
  }

  /** 健康检查 */
  async healthCheck() {
    const result = await this._pool.query('SELECT 1');
    return result.rows.length > 0;
  }
}

/** 事务内的 Adapter（使用独立连接） */
class PgTransactionAdapter {
  constructor(client) {
    this._client = client;
  }

  _convertPlaceholders(sql) {
    let idx = 0;
    let result = '';
    let inQuote = false;
    for (let i = 0; i < sql.length; i++) {
      if (sql[i] === "'" && (i === 0 || sql[i - 1] !== '\\')) inQuote = !inQuote;
      if (!inQuote && sql[i] === '?') {
        idx++;
        result += '$' + idx;
      } else {
        result += sql[i];
      }
    }
    return result;
  }

  _normalizeParams(params) {
    if (params === undefined || params === null) return [];
    if (Array.isArray(params)) return params;
    return [params];
  }

  async get(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const pgSql = this._convertPlaceholders(sql);
    const result = await this._client.query(pgSql, p);
    return result.rows[0] || undefined;
  }

  async all(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const pgSql = this._convertPlaceholders(sql);
    const result = await this._client.query(pgSql, p);
    return result.rows;
  }

  async run(sql, ...params) {
    const p = this._normalizeParams(params.length === 1 ? params[0] : params);
    const pgSql = this._convertPlaceholders(sql);
    let returningSql = pgSql;
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.includes('RETURNING')) {
      returningSql = pgSql + ' RETURNING id';
    }
    const result = await this._client.query(returningSql, p);
    const rowCount = result.rowCount || result.rows.length || 0;
    const lastInsertRowid = result.rows[0]?.id || null;
    return { changes: rowCount, lastInsertRowid };
  }

  async exec(sql) {
    await this._client.query(sql);
  }
}

module.exports = { PgAdapter };
