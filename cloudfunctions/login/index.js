const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 登录：取 openid 并初始化用户档案
exports.main = async () => {
  const { OPENID, APPID } = cloud.getWXContext();
  const users = db.collection('users');
  const exist = await users.where({ _openid: OPENID }).count();
  if (exist.total === 0) {
    await users.add({
      data: {
        _openid: OPENID,
        nickname: '匿名用户',
        avatarUrl: '',
        totalRecords: 0,
        streakDays: 0,
        lastRecordAt: null,
        settings: {},
        createdAt: db.serverDate(),
      },
    });
  }
  return { code: 0, data: { openid: OPENID, appid: APPID } };
};
