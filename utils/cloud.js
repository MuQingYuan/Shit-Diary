// utils/cloud.js - 云函数统一调用封装（Promise 化）
const call = (name, data = {}) => new Promise((resolve, reject) => {
  wx.cloud.callFunction({
    name,
    data,
    success: (res) => {
      const r = res.result || {};
      if (r.code === 0 || r.success) {
        resolve(r.data);
      } else {
        reject(r);
      }
    },
    fail: (err) => reject({ code: -1, message: '网络异常', detail: err }),
  });
});

module.exports = { call };
