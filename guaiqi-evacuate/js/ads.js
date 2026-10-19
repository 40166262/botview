/**
 * IAA stub — cardboard “模拟广告”, not a real network.
 * Replace showRewarded with TapTap rewarded video later.
 * Never charges money. Skipping grants nothing.
 */
const DURATION = 3000;
const DONE_HOLD = 680;

function $(id) { return document.getElementById(id); }

export const Ads = {
  _busy: false,
  _timer: 0,
  _raf: 0,
  _cb: null,
  _bound: false,

  _bind() {
    if (this._bound) return;
    this._bound = true;
    const skip = $('btn-ad-skip');
    if (skip) skip.addEventListener('click', () => this.cancel());
  },

  /**
   * @param {(ok: boolean) => void} cb
   * ok=true only after the demo finishes. A second call while busy is ignored.
   */
  showRewarded(cb) {
    this._bind();
    if (this._busy) return;
    const root = $('ad-stub');
    if (!root) {
      this._busy = true;
      this._timer = setTimeout(() => {
        this._busy = false;
        try { cb(true); } catch (e) { console.error(e); }
      }, DURATION);
      return;
    }
    this._busy = true;
    this._cb = cb;
    root.classList.remove('hidden', 'done');
    const bar = $('ad-bar');
    const status = $('ad-status');
    const skip = $('btn-ad-skip');
    if (bar) bar.style.width = '0%';
    if (status) status.textContent = '看一会儿就好';
    if (skip) skip.classList.remove('hidden');
    const t0 = performance.now();
    const tick = (now) => {
      if (!this._busy || this._cb !== cb) return;
      const p = Math.min(1, (now - t0) / DURATION);
      if (bar) bar.style.width = `${Math.round(p * 100)}%`;
      if (p < 1) {
        this._raf = requestAnimationFrame(tick);
        return;
      }
      this._showDone();
    };
    this._raf = requestAnimationFrame(tick);
  },

  cancel() {
    if (!this._busy || !this._cb) return;
    this._close(false);
  },

  _showDone() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    const root = $('ad-stub');
    const bar = $('ad-bar');
    const status = $('ad-status');
    const skip = $('btn-ad-skip');
    if (bar) bar.style.width = '100%';
    if (status) status.textContent = '看完啦，奖励马上到';
    if (skip) skip.classList.add('hidden');
    if (root) root.classList.add('done');
    this._timer = setTimeout(() => this._close(true), DONE_HOLD);
  },

  _close(ok) {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    clearTimeout(this._timer);
    this._timer = 0;
    const root = $('ad-stub');
    if (root) root.classList.add('hidden');
    this._busy = false;
    const cb = this._cb;
    this._cb = null;
    try { if (cb) cb(!!ok); } catch (e) { console.error(e); }
  },
};
