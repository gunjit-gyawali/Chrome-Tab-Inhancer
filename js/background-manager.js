// Background Studio runtime: sources, rotation, filters, overlay, parallax, crossfade.
import { getItem, setItem } from './storage.js';
import { rgba } from './theme-manager.js';

export class BackgroundManager {
  constructor(host) {
    this.host = host;
    host.innerHTML = '<div class="bg-layer"></div><div class="bg-layer"></div><div class="bg-overlay"></div>';
    this.layers = [...host.querySelectorAll('.bg-layer')];
    this.overlay = host.querySelector('.bg-overlay');
    this.front = 0; this.currentSrc = null; this.state = null; this.timer = null;
    this.onMove = (e) => {
      if (!this.cfg?.parallax) return;
      const s = this.cfg.parallaxStrength, x = (e.clientX / innerWidth - 0.5) * -s, y = (e.clientY / innerHeight - 0.5) * -s;
      this.layers.forEach((l) => (l.style.translate = `${x}px ${y}px`));
    };
    addEventListener('pointermove', this.onMove, { passive: true });
  }

  sourceFor(bg, mode) {
    if (bg.perTheme && mode === 'light') return { ...bg, source: bg.lightSource, color: bg.lightColor };
    return bg;
  }

  candidates(bg, library) {
    if (bg.source === 'urls') return bg.urls.split('\n').map((s) => s.trim()).filter((u) => /^(https?:|data:image)/.test(u)).map((src) => ({ src, type: 'image', id: src }));
    if (bg.source === 'video') {
      const vids = library.filter((i) => i.type === 'video' && !i.excluded);
      return bg.videoUrl ? [{ src: bg.videoUrl, type: 'video', id: bg.videoUrl }, ...vids] : vids;
    }
    let list = library.filter((i) => !i.excluded && i.type === 'image');
    if (bg.collection) list = list.filter((i) => (i.collection || '') === bg.collection);
    if (bg.favoritesOnly && list.some((i) => i.favorite)) list = list.filter((i) => i.favorite);
    return list;
  }

  async pick(bg, list, { advance = false, initial = false } = {}) {
    if (!this.state) this.state = (await getItem('bgState')) || { index: 0, ts: 0, day: '', recent: [] };
    const st = this.state, n = list.length;
    if (!n) return null;
    const today = new Date().toDateString();
    let rotate = advance;
    if (!advance && initial && !bg.paused) {
      if (bg.rotation === 'tab') rotate = true;
      if (bg.rotation === 'daily' && st.day !== today) rotate = true;
      if (bg.rotation === 'interval' && Date.now() - st.ts > bg.interval * 60000) rotate = true;
    }
    if (rotate) {
      if (bg.shuffle && n > 1) { let i; do { i = Math.floor(Math.random() * n); } while (i === st.index); st.index = i; }
      else st.index = (st.index + 1) % n;
      st.ts = Date.now(); st.day = today;
    }
    st.index = Math.min(st.index, n - 1);
    const item = list[st.index];
    st.recent = [item.id, ...(st.recent || []).filter((r) => r !== item.id)].slice(0, 12);
    await setItem('bgState', st);
    return item;
  }

  async apply(config, library, mode, opts = {}) {
    const bg = this.sourceFor(config.background, mode);
    this.cfg = config.background;
    const filter = `brightness(${bg.brightness}) contrast(${bg.contrast}) saturate(${bg.saturation}) blur(${bg.blur}px) grayscale(${bg.grayscale}) sepia(${bg.sepia}) hue-rotate(${bg.hue}deg)`;
    const pageBg = getComputedStyle(document.documentElement).getPropertyValue('--page-background');
    this.host.style.background = pageBg;
    this.host.style.setProperty('--bg-fade', bg.fadeMs + 'ms');
    this.overlay.style.background = bg.overlayGradient
      ? `linear-gradient(${bg.overlayAngle}deg, ${bg.overlayGradA}, ${bg.overlayGradB})`
      : rgba(bg.overlayColor, 1);
    this.overlay.style.opacity = bg.overlayOpacity;

    let css = null, item = null;
    if (bg.source === 'color') css = { background: bg.color };
    else if (bg.source === 'linear') css = { background: `linear-gradient(${bg.angle}deg, ${bg.gradA}, ${bg.gradC ? bg.gradC + ', ' : ''}${bg.gradB})` };
    else if (bg.source === 'radial') css = { background: `radial-gradient(circle at ${bg.radialPos}, ${bg.gradA}, ${bg.gradC ? bg.gradC + ', ' : ''}${bg.gradB})` };
    else {
      const list = this.candidates(bg, library);
      item = await this.pick(bg, list, opts);
      if (!item) css = { background: `linear-gradient(${bg.angle}deg, ${bg.gradA}, ${bg.gradB})` };
    }
    const key = css ? JSON.stringify(css) : item.src;
    const layer = this.layers[this.front];
    const style = (l) => {
      l.style.filter = filter; l.style.setProperty('--bg-opacity', bg.opacity);
      l.style.backgroundSize = bg.size; l.style.backgroundPosition = `${bg.posX}% ${bg.posY}%`;
      l.style.scale = bg.parallax ? '1.06' : '1';
      if (!bg.parallax) l.style.translate = '0 0';
      const v = l.querySelector('video'); if (v) { v.style.objectFit = bg.size === 'contain' ? 'contain' : 'cover'; v.style.objectPosition = `${bg.posX}% ${bg.posY}%`; }
    };
    if (key === this.currentSrc) { style(layer); return item; }
    this.currentSrc = key;
    const next = this.layers[1 - this.front];
    next.innerHTML = ''; next.style.backgroundImage = ''; next.style.background = '';
    if (css) next.style.background = css.background;
    else if (item.type === 'video') {
      const v = document.createElement('video');
      Object.assign(v, { src: item.src, autoplay: true, muted: true, loop: true, playsInline: true });
      next.appendChild(v);
    } else {
      await new Promise((res) => { const img = new Image(); img.onload = img.onerror = res; img.src = item.src; });
      next.style.backgroundImage = `url("${item.src.replace(/"/g, '%22')}")`;
    }
    style(next);
    next.classList.add('visible'); layer.classList.remove('visible');
    this.front = 1 - this.front;
    this.scheduleRotation(config, library, mode);
    return item;
  }

  scheduleRotation(config, library, mode) {
    clearInterval(this.timer);
    const bg = config.background;
    if (bg.rotation === 'interval' && !bg.paused && ['library', 'urls'].includes(bg.source)) {
      this.timer = setInterval(() => this.apply(config, library, mode, { advance: true }), bg.interval * 60000);
    }
  }

  next(config, library, mode) { return this.apply(config, library, mode, { advance: true }); }
}
