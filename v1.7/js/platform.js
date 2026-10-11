/* v1.7 TapTap 平台能力：登录 / 排行榜 / 成就。
   - 只用 TAPTAP_LEADERBOARD_ACHIEVEMENTS.md 里写到的接口；每个都先判断存不存在。
   - 平台接口是回调式（callback:{onSuccess,onFailure}），这里自己包成 Promise，并加超时；
     Promise 永远 resolve（{ok, code, msg}），从不 reject —— 任何失败都不影响游戏。
   - 配置在 config.js 的 platform 段；ID 以 TODO_ 开头视为未配置，直接跳过对应调用。 */
(function () {
  const CS = window.CS;
  const C = () => CS.CONFIG.platform || {};
  const tap = () => (typeof window.tap !== 'undefined' && window.tap) ? window.tap : null;
  const has = (o, k) => !!(o && typeof o[k] === 'function');
  const configured = (id) => typeof id === 'string' && id.length > 0 && id.indexOf('TODO') !== 0;
  const log = [];                    // 调用记录（测试和排查用）
  const note = (what, r) => { log.push(Object.assign({ what, t: Date.now() }, r)); if (log.length > 100) log.shift(); return r; };

  // 回调式 → Promise（带超时，永不 reject）
  function wrapCallback(what, invoke) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (r) => { if (done) return; done = true; clearTimeout(timer); resolve(note(what, r)); };
      const timer = setTimeout(() => finish({ ok: false, code: 'timeout', msg: 'no callback in ' + (C().timeoutMs || 8000) + 'ms' }), C().timeoutMs || 8000);
      try {
        invoke({
          onSuccess: (res) => finish({ ok: true, res }),
          onFailure: (code, msg) => finish({ ok: false, code, msg })
        });
      } catch (e) { finish({ ok: false, code: 'exception', msg: String(e && e.message || e) }); }
    });
  }

  let lbm = null, achm = null, achTried = false, loginP = null;
  function leaderboard() {
    if (lbm) return lbm;
    const t = tap();
    if (!has(t, 'getLeaderboardManager')) return null;
    try { lbm = t.getLeaderboardManager() || null; } catch (e) { lbm = null; }
    return lbm;
  }
  function achievements() {
    if (achm || achTried) return achm;
    const t = tap();
    if (!has(t, 'createAchievementManager')) return null;
    achTried = true;
    try { achm = t.createAchievementManager({ toastEnable: !!C().achievementToast }) || null; } catch (e) { achm = null; note('createAchievementManager', { ok: false, code: 'exception', msg: String(e && e.message || e) }); }
    return achm;
  }

  const Platform = {
    log,
    get inTap() { return !!tap(); },
    // 按钮显示条件
    get hasLeaderboard() { const m = leaderboard(); return !!(m && has(m, 'openLeaderboard')); },
    get hasAchievements() { const m = achievements(); return !!(m && has(m, 'showAchievements')); },

    // 启动时调一次登录；结果只记录，不拦任何东西（文档没给 login 的参数格式，按小游戏常规 success/fail 传，同时有超时兜底）
    login() {
      if (loginP) return loginP;
      const t = tap();
      if (!C().login || !has(t, 'login')) return (loginP = Promise.resolve(note('login', { ok: false, code: 'absent' })));
      loginP = new Promise((resolve) => {
        let done = false;
        const finish = (r) => { if (done) return; done = true; clearTimeout(timer); resolve(note('login', r)); };
        const timer = setTimeout(() => finish({ ok: false, code: 'timeout' }), C().timeoutMs || 8000);
        try { t.login({ success: (res) => finish({ ok: true, res }), fail: (err) => finish({ ok: false, code: 'fail', msg: err && (err.errMsg || err.message) }) }); }
        catch (e) { finish({ ok: false, code: 'exception', msg: String(e && e.message || e) }); }
      });
      return loginP;
    },

    // 排行榜：提交单局最终得分（整数）
    submitScore(score) {
      const m = leaderboard(), id = C().leaderboardId;
      const v = Math.max(0, Math.floor(Number(score) || 0));
      if (!m || !has(m, 'submitScores')) return Promise.resolve(note('submitScores', { ok: false, code: 'absent' }));
      if (!configured(id)) return Promise.resolve(note('submitScores', { ok: false, code: 'unconfigured' }));
      return wrapCallback('submitScores', (callback) => m.submitScores({ scores: [{ leaderboardId: id, score: v }], callback }));
    },
    openLeaderboard() {
      const m = leaderboard(), id = C().leaderboardId;
      if (!m || !has(m, 'openLeaderboard')) return Promise.resolve(note('openLeaderboard', { ok: false, code: 'absent' }));
      if (!configured(id)) return Promise.resolve(note('openLeaderboard', { ok: false, code: 'unconfigured' }));
      return wrapCallback('openLeaderboard', (callback) => m.openLeaderboard({ leaderboardId: id, collection: C().leaderboardCollection || 'public', callback }));
    },

    // 成就：文档里 unlockAchievement / incrementAchievement / showAchievements 没有回调参数 → 调用不抛错就算已发出
    unlockAchievement(localId) {
      const m = achievements(), id = (C().achievementIds || {})[localId];
      if (!m || !has(m, 'unlockAchievement')) return Promise.resolve(note('unlockAchievement', { ok: false, code: 'absent', localId }));
      if (!configured(id)) return Promise.resolve(note('unlockAchievement', { ok: false, code: 'unconfigured', localId }));
      try { m.unlockAchievement({ achievementId: id }); return Promise.resolve(note('unlockAchievement', { ok: true, localId, id })); }
      catch (e) { return Promise.resolve(note('unlockAchievement', { ok: false, code: 'exception', msg: String(e && e.message || e), localId })); }
    },
    incrementAchievement(localId, steps) {
      const m = achievements(), id = (C().achievementIds || {})[localId], n = Math.floor(Number(steps) || 0);
      if (n <= 0) return Promise.resolve({ ok: false, code: 'zero' });
      if (!m || !has(m, 'incrementAchievement')) return Promise.resolve(note('incrementAchievement', { ok: false, code: 'absent', localId }));
      if (!configured(id)) return Promise.resolve(note('incrementAchievement', { ok: false, code: 'unconfigured', localId }));
      try { m.incrementAchievement({ achievementId: id, steps: n }); return Promise.resolve(note('incrementAchievement', { ok: true, localId, id, steps: n })); }
      catch (e) { return Promise.resolve(note('incrementAchievement', { ok: false, code: 'exception', msg: String(e && e.message || e), localId })); }
    },
    showAchievements() {
      const m = achievements();
      if (!m || !has(m, 'showAchievements')) return Promise.resolve(note('showAchievements', { ok: false, code: 'absent' }));
      try { m.showAchievements(); return Promise.resolve(note('showAchievements', { ok: true })); }
      catch (e) { return Promise.resolve(note('showAchievements', { ok: false, code: 'exception', msg: String(e && e.message || e) })); }
    },
    isConfigured: configured,
    _reset() { lbm = null; achm = null; achTried = false; loginP = null; log.length = 0; }   // 测试用
  };
  CS.Platform = Platform;
})();
