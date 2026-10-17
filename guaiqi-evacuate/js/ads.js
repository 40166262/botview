/**
 * IAA stub — replace with TapTap / MiniGame rewarded-video SDK later.
 * Ads.showRewarded(cb) resolves after ~800ms fake delay.
 */
export const Ads = {
  _busy: false,

  /**
   * @param {(ok: boolean) => void} cb
   */
  showRewarded(cb) {
    if (this._busy) {
      console.log('[Ads] busy, skip');
      cb(false);
      return;
    }
    this._busy = true;
    console.log('[Ads] showRewarded stub — fake 800ms delay');
    setTimeout(() => {
      this._busy = false;
      console.log('[Ads] rewarded complete (stub success)');
      try { cb(true); } catch (e) { console.error(e); }
    }, 800);
  },
};
