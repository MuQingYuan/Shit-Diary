App({
  globalData: {
    userInfo: null,
    openid: null,
    env: 'prod-xxxx', // 替换为你自己的云开发环境 ID
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({ env: this.globalData.env, traceUser: true });
    this.initUser();
  },
  async initUser() {
    let openid = wx.getStorageSync('openid');
    if (!openid) {
      try {
        const { result } = await wx.cloud.callFunction({ name: 'login' });
        openid = result.openid;
        wx.setStorageSync('openid', openid);
      } catch (e) {
        console.error('login failed', e);
      }
    }
    this.globalData.openid = openid;
  },
});
