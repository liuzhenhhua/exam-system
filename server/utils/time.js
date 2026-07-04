// 北京时间工具函数 — 所有时间记录统一使用北京时间（UTC+8）
// 使用 sv-SE locale + Asia/Shanghai timezone，原生输出 ISO 格式

function beijingNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });
  // 返回格式："2026-07-05 14:30:00"
}

function beijingDate() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).split(' ')[0];
  // 返回格式："2026-07-05"
}

function beijingISO() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }) + '+08:00';
  // 返回格式："2026-07-05 14:30:00+08:00"
}

module.exports = { beijingNow, beijingDate, beijingISO };
