const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const BRISTOL = [1, 2, 3, 4, 5, 6, 7];

// 新增排便记录（含参数校验与用户统计更新）
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { date, time, durationSec, bristolType, color, amount, symptomTags = [], mood, note } = event;

  if (!BRISTOL.includes(Number(bristolType))) return { code: 400, message: 'Bristol 类型不合法' };
  if (durationSec !== undefined && (durationSec < 0 || durationSec > 3600)) return { code: 400, message: '时长超出范围' };
  if (note && note.length > 200) return { code: 400, message: '备注过长' };

  const record = {
    _openid: OPENID,
    date,
    time,
    timestamp: new Date(`${date} ${time}`).getTime(),
    durationSec: Number(durationSec) || 0,
    bristolType: Number(bristolType),
    color: color || '',
    amount: amount || '',
    symptomTags,
    mood: mood || '',
    note: note || '',
    isShared: false,
    createdAt: db.serverDate(),
  };

  const res = await db.collection('records').add({ data: record });
  await db.collection('users').where({ _openid: OPENID }).update({
    data: { totalRecords: db.command.inc(1), lastRecordAt: db.serverDate() },
  });

  return { code: 0, data: { id: res._id } };
};
