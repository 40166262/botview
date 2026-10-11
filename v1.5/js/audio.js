/* 音频：优先使用 assets/audio/ 里的文件（ogg/mp3 按 canPlayType 选择），缺失的事件用 WebAudio 合成音效顶替。
 * 首次点击（开始页）解锁音频。音乐 / 音效开关持久化在存档 settings 里。 */
(function () {
  const CS = window.CS;

  // 事件 -> 文件（assets/audio/<name>.ogg|mp3），音量/冷却/并发按 assets/audio/AUDIO.md
  const SFX = {
    drop:         { file: 'drop',         vol: 0.6 },
    land:         { file: 'land_soft',    vol: 0.7, cooldown: 0.03, maxVoices: 3 },
    perfect:      { file: 'perfect',      vol: 0.8 },
    combo:        { file: 'combo',        vol: 0.7 },
    meow1:        { file: 'meow_1',       vol: 0.6 },
    meow2:        { file: 'meow_2',       vol: 0.6 },
    meow3:        { file: 'meow_3',       vol: 0.6 },
    wobble:       { file: 'wobble',       vol: 0.5, cooldown: 1.5 },
    collapse:     { file: 'collapse',     vol: 0.9 },
    game_over:    { file: 'game_over',    vol: 0.8, duck: 0.3, duckMs: 2600 },
    revive:       { file: 'revive',       vol: 0.8 },
    coin:         { file: 'coin',         vol: 0.6, cooldown: 0.09, maxVoices: 2 },
    button:       { file: 'button_click', vol: 0.5 },
    unlock:       { file: 'unlock',       vol: 0.85, duck: 0.4, duckMs: 2200 },
    new_record:   { file: 'new_record',   vol: 0.85, duck: 0.4, duckMs: 2400 },
    milestone:    { file: 'milestone',    vol: 0.75 },
    wind_gust:    { file: 'wind_gust',    vol: 0.7 }
  };
  const WIND_LOOP = 'wind_loop', WIND_LOOP_SEC = 8;   // 8 秒无缝循环，音量 = 0.15 + 0.35 × 风力（AUDIO.md）
  const BGM = { file: 'bgm_loop', vol: 0.45, samples: 1411200 };
  const COMBO_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];
  const MEOW_RATE = { orange: 0.9, loaf: 0.9, white: 1.0, black: 1.0, ball: 1.12, long: 0.95 };

  let ctx = null, master = null, sfxBus = null, musicBus = null, bgmDuck = null;
  let unlocked = false, adMuted = false, hidden = false;
  const buffers = {};       // file -> AudioBuffer
  const loading = {};
  const voices = {};        // event -> active count
  const lastPlay = {};
  let bgmSrc = null, bgmSynth = null, bgmWanted = false;
  let exts = null;

  function settings() { return CS.Save.data.settings; }

  function pickExts() {
    if (exts) return exts;
    let ogg = '', mp3 = '';
    try { const a = document.createElement('audio'); ogg = a.canPlayType('audio/ogg; codecs="vorbis"'); mp3 = a.canPlayType('audio/mpeg'); } catch (e) { /* */ }
    exts = ogg ? ['ogg', 'mp3'] : (mp3 ? ['mp3', 'ogg'] : ['mp3']);
    return exts;
  }
  function fileUrl(name) {
    for (const e of pickExts()) { const p = 'assets/audio/' + name + '.' + e; if (CS.assetFiles.has(p)) return p; }
    return null;
  }

  function decode(ab) {
    return new Promise((res, rej) => {
      try { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); }
    });
  }
  function load(name) {
    if (buffers[name] || loading[name] || !ctx) return loading[name];
    const url = fileUrl(name);
    if (!url || location.protocol === 'file:') return null;
    loading[name] = fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('http')))
      .then(decode).then(buf => { buffers[name] = buf; return buf; }, () => null);
    return loading[name];
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    bgmDuck = ctx.createGain(); bgmDuck.connect(musicBus);
    applyGains();
    // 先加载 BGM 与常用音效，其余随后
    load(BGM.file);
    load(WIND_LOOP);
    Object.keys(SFX).forEach(k => load(SFX[k].file));
    return ctx;
  }

  function applyGains() {
    if (!ctx) return;
    const s = settings(), t = ctx.currentTime, mute = adMuted || hidden;
    sfxBus.gain.setTargetAtTime(s.sfx && !mute ? 1 : 0, t, 0.015);
    musicBus.gain.setTargetAtTime(s.music && !mute ? 1 : 0, t, 0.05);
    updateBgm();
  }

  // ---------------- BGM：AudioBufferSourceNode loop=true ----------------
  function updateBgm() {
    bgmWanted = unlocked && settings().music;
    if (!ctx) return;
    if (!bgmWanted) { stopBgm(); return; }
    if (bgmSrc || bgmSynth) return;
    const buf = buffers[BGM.file];
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      if (buf.length > BGM.samples + 100 && buf.sampleRate === 44100) { // 浏览器未去掉 mp3 填充（AUDIO.md）
        src.loopStart = 1105 / 44100; src.loopEnd = src.loopStart + 32.0;
      }
      const g = ctx.createGain(); g.gain.value = BGM.vol;
      src.connect(g); g.connect(bgmDuck);
      src.start(ctx.currentTime + 0.02, src.loopStart || 0);
      bgmSrc = { src, g };
    } else {
      const p = load(BGM.file);
      if (p) p.then((b) => { if (bgmWanted && !bgmSrc) { if (b) { stopBgm(); updateBgm(); } else if (!bgmSynth) bgmSynth = startSynthBgm(); } });
      else bgmSynth = startSynthBgm();
    }
  }
  function stopBgm() {
    if (bgmSrc) { try { bgmSrc.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); const s = bgmSrc.src; setTimeout(() => { try { s.stop(); } catch (e) { /* */ } }, 300); } catch (e) { /* */ } bgmSrc = null; }
    if (bgmSynth) { bgmSynth.stop(); bgmSynth = null; }
  }
  function duckBgm(level, ms) {
    if (!ctx) return;
    const t = ctx.currentTime;
    bgmDuck.gain.cancelScheduledValues(t);
    bgmDuck.gain.setTargetAtTime(level, t, 0.05);
    bgmDuck.gain.setTargetAtTime(1, t + ms / 1000, 0.3);
  }

  function startSynthBgm() {
    const bpm = 104, beat = 60 / bpm;
    const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const mel = [72, 0, 76, 79, 81, 79, 76, 0, 74, 76, 79, 0, 76, 74, 72, 0, 72, 0, 74, 76, 79, 81, 84, 0, 81, 79, 76, 74, 76, 0, 0, 0];
    const bass = [48, 55, 52, 55, 45, 52, 50, 55];
    const out = ctx.createGain(); out.gain.value = 0.1; out.connect(bgmDuck);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(out);
    let step = 0, next = ctx.currentTime + 0.1, stopped = false;
    function note(freq, t, dur, type, vol) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    const iv = setInterval(() => {
      if (stopped) return;
      while (next < ctx.currentTime + 0.4) {
        const half = beat / 2, m = mel[step % mel.length];
        if (m) note(N(m), next, half * 1.8, 'triangle', 0.5);
        if (step % 4 === 0) note(N(bass[(step / 4) % bass.length]), next, beat * 1.9, 'sine', 0.6);
        next += half; step++;
      }
    }, 90);
    return { stop() { stopped = true; clearInterval(iv); try { out.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch (e) { /* */ } } };
  }

  // ---------------- 风声循环 ----------------
  let wind = null, windLevel = 0;
  // k = 风力 0~1（0 = 停风）；dir = 风向（±1），用 StereoPanner 轻微偏左/右。做法完全按 AUDIO.md「风声用法」。
  function setWind(k, dir) {
    k = Math.max(0, Math.min(1, k || 0));
    windLevel = k;
    if (!ctx || !unlocked) return;
    const t = ctx.currentTime, target = 0.15 + 0.35 * k;
    if (k > 0 && !wind) {          // 起风：1.5 秒线性淡入，随机起点
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
      let out = g;
      if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = 0; g.connect(pn); out = pn; }
      out.connect(sfxBus);
      let src, offset = 0;
      const buf = buffers[WIND_LOOP];
      if (buf) {
        src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(g);
        const want = Math.round(WIND_LOOP_SEC * buf.sampleRate);
        if (buf.length > want) { src.loopStart = 1105 / 44100; src.loopEnd = src.loopStart + WIND_LOOP_SEC; }   // Safari 没去掉 mp3 填充
        offset = (src.loopStart || 0) + Math.random() * WIND_LOOP_SEC * 0.99;   // 只影响声音，不碰玩法种子
      } else {   // 文件缺失时的合成兜底：带通滤波噪声
        if (!noiseBuf) noise(t, 0.01, 0.0001, 100);
        src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
        src.connect(f); f.connect(g);
      }
      src.start(t, offset);
      g.gain.linearRampToValueAtTime(target, t + 1.5);
      wind = { src, g, pan: out !== g ? out : null, fadeUntil: t + 1.5 };
    } else if (k > 0 && wind) {    // 风力变化：平滑过渡（淡入期间不打断）
      if (t >= wind.fadeUntil) { wind.g.gain.cancelScheduledValues(t); wind.g.gain.setTargetAtTime(target, t, 0.5); }
    } else if (k === 0 && wind) {  // 停风 / 暂停 / 塔倒 / 结算：1 秒淡出
      const w = wind; wind = null;
      w.g.gain.cancelScheduledValues(t);
      w.g.gain.setValueAtTime(w.g.gain.value, t);
      w.g.gain.linearRampToValueAtTime(0, t + 1.0);
      try { w.src.stop(t + 1.05); } catch (e) { /* */ }
      setTimeout(() => { try { w.g.disconnect(); if (w.pan) w.pan.disconnect(); } catch (e) { /* */ } }, 1300);
    }
    if (wind && wind.pan && dir) wind.pan.pan.setTargetAtTime(dir > 0 ? 0.3 : -0.3, t, 0.3);
  }

  // ---------------- 合成兜底音效（文件缺失或解码失败时） ----------------
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.008, vol, dur); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(t, dur, vol, freq) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); let s = 12345;
      for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + dur + 0.05);
  }
  function meow(t, pitch, len, vol) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const p = 560 * pitch;
    o.frequency.setValueAtTime(p * 0.8, t); o.frequency.exponentialRampToValueAtTime(p * 1.45, t + len * 0.35); o.frequency.exponentialRampToValueAtTime(p * 0.9, t + len);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4;
    f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1800, t + len * 0.4); f1.frequency.linearRampToValueAtTime(1000, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.setValueAtTime(vol, t + len * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f1); f1.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + len + 0.05);
  }
  const SYNTH = {
    drop: (t) => tone('sine', 700, 300, t, 0.2, 0.12),
    land: (t, o) => { const k = o.volume || 0.7; tone('sine', 190, 60, t, 0.16, 0.35 * k); noise(t, 0.08, 0.12 * k, 600); },
    perfect: (t) => { tone('triangle', 1047, 1047, t, 0.18, 0.2); tone('triangle', 1319, 1319, t + 0.07, 0.2, 0.18); tone('sine', 1568, 1568, t + 0.14, 0.35, 0.16); },
    combo: (t, o) => { const r = o.rate || 1; [523, 659, 784].forEach((f, i) => tone('triangle', f * r, f * r, t + i * 0.06, 0.25, 0.16)); },
    meow1: (t, o) => meow(t, o.rate || 1, 0.3, 0.25),
    meow2: (t, o) => meow(t, o.rate || 1, 0.6, 0.25),
    meow3: (t, o) => meow(t, (o.rate || 1) * 1.15, 0.45, 0.22),
    wobble: (t) => { tone('sine', 300, 380, t, 0.25, 0.08); tone('sine', 380, 300, t + 0.25, 0.25, 0.08); },
    collapse: (t) => { meow(t, 0.8, 0.6, 0.3); tone('sawtooth', 220, 55, t + 0.1, 0.7, 0.07); noise(t + 0.05, 0.5, 0.22, 400); },
    game_over: (t) => [659, 587, 523, 392].forEach((f, i) => tone('triangle', f, f * 0.97, t + i * 0.22, 0.3, 0.16)),
    revive: (t) => [392, 523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, t + i * 0.07, 0.3, 0.18)),
    coin: (t) => { tone('square', 1320, 1320, t, 0.06, 0.05); tone('square', 1760, 1760, t + 0.06, 0.16, 0.05); },
    button: (t) => tone('sine', 700, 1150, t, 0.06, 0.16),
    unlock: (t) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, t + i * 0.09, 0.4, 0.18)),
    new_record: (t) => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, t + i * 0.1, 0.25, 0.18)),
    wind_gust: (t) => { noise(t, 0.9, 0.25, 900); tone('sine', 300, 600, t, 0.6, 0.03); },
    milestone: (t) => { [523, 659, 784].forEach(f => tone('triangle', f, f, t, 0.2, 0.12)); [659, 784, 1047].forEach(f => tone('triangle', f, f, t + 0.22, 0.5, 0.13)); }
  };

  /* play(event, { volume: 0..1 系数, rate, delay(秒) }) */
  function play(ev, opts) {
    opts = opts || {};
    const def = SFX[ev];
    if (!def || !unlocked || !ctx || !settings().sfx || adMuted || hidden) return;
    const now = ctx.currentTime;
    const cd = def.cooldown || 0.03;
    if (lastPlay[ev] != null && now - lastPlay[ev] < cd && !opts.delay) return;
    if (def.maxVoices && (voices[ev] || 0) >= def.maxVoices) return;
    lastPlay[ev] = now;
    const t = now + (opts.delay || 0);
    if (def.duck) duckBgm(def.duck, def.duckMs);
    try {
      const buf = buffers[def.file];
      if (buf) {
        const src = ctx.createBufferSource(); src.buffer = buf;
        src.playbackRate.value = opts.rate || 1;
        const g = ctx.createGain(); g.gain.value = def.vol * (opts.volume == null ? 1 : opts.volume);
        src.connect(g); g.connect(sfxBus);
        voices[ev] = (voices[ev] || 0) + 1;
        src.onended = () => { voices[ev] = Math.max(0, (voices[ev] || 1) - 1); };
        src.start(t);
      } else if (SYNTH[ev]) SYNTH[ev](t, opts);
    } catch (e) { /* 音频错误不影响游戏 */ }
  }

  function unlock() {
    if (!ensureCtx()) return;
    if (ctx.state !== 'running' && ctx.resume && !hidden) { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    if (!unlocked) {
      unlocked = true;
      try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { /* */ }
      applyGains();
    }
  }

  CS.audio = {
    unlock, play, duckBgm, setWind,
    get windLevel() { return windLevel; },
    COMBO_STEPS,
    comboRate(n) { return Math.pow(2, COMBO_STEPS[Math.min(Math.max(n - 2, 0), 7)] / 12); },
    meowRate(type) { return MEOW_RATE[type] || 1; },
    get unlocked() { return unlocked; },
    get state() { return ctx ? ctx.state : 'none'; },
    get loadedFiles() { return Object.keys(buffers); },
    setMusic(on) { settings().music = !!on; CS.Save.commit(); applyGains(); },
    setSfx(on) { settings().sfx = !!on; CS.Save.commit(); applyGains(); },
    get muted() { const s = settings(); return !s.music && !s.sfx; },
    setMuted(m) { const s = settings(); s.music = !m; s.sfx = !m; CS.Save.commit(); applyGains(); },
    duck(on) { adMuted = !!on; applyGains(); },
    setHidden(h) {
      hidden = !!h;
      if (ctx) { try { if (h) ctx.suspend(); else if (unlocked) ctx.resume(); } catch (e) { /* */ } }
      applyGains();
    }
  };
})();
