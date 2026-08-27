/* =====================================================================
 * 40-db.js — 本地数据库（localStorage 持久化）
 * DB 状态、loadDB / saveDB / seedDB（演示数据）/ resetDB。
 * ===================================================================== */

let DB = null;
function loadDB() {
  try { DB = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { DB = null; }
  if (!DB || !DB.records) seedDB();
}
function saveDB() { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function seedDB() {
  const records = [];
  const now = new Date();
  // 生成近 7 天演示数据
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const count = i === 6 ? 1 : (i % 2 === 0 ? 2 : 1);
    for (let k = 0; k < count; k++) {
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7 + (i * 3 + k * 2) % 12, 15 + (i * 17 + k * 33) % 45);
      records.push({
        id: 'demo' + i + '_' + k,
        date: fmtDate(t), time: fmtHM(t), timestamp: t.getTime(),
        bristolType: [3, 4, 4, 4, 5, 2, 6][(i + k) % 7],
        durationSec: 180 + ((i * 90 + k * 120) % 720),
        color: COLORS[i % 4], amount: AMOUNTS[(i + k) % 3],
        symptomTags: i === 0 && k === 1 ? ['腹胀'] : (i % 4 === 0 ? ['费力'] : []),
        mood: MOODS[(i + k) % 3], note: i === 6 ? '早起的第一次，状态不错' : ''
      });
    }
  }
  DB = {
    records,
    users: { nickname: '我', avatarUrl: '', streakDays: 1, totalRecords: records.length },
    reminders: { enabled: true, time: '08:00', repeatDays: [1, 2, 3, 4, 5, 6, 0] }
  };
  saveDB();
}
function resetDB() { localStorage.removeItem(LS_KEY); seedDB(); }

