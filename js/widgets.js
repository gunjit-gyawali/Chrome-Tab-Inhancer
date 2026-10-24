// Widget renderers. Each registers with the registry; metadata/defaults live in settings-schema.js.
import { registerWidget, h } from './widget-registry.js';
import { ENGINES } from './settings-schema.js';
import { rgba, fontStack } from './theme-manager.js';
import { uid, isExtension } from './storage.js';

// ---------- time helpers ----------
function zonedParts(date, tz, opts) {
  try { return Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, ...opts }).formatToParts(date).map((p) => [p.type, p.value])); }
  catch { return Object.fromEntries(new Intl.DateTimeFormat('en-US', opts).formatToParts(date).map((p) => [p.type, p.value])); }
}
const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
export function formatDate(date, w) {
  const p = zonedParts(date, w.timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const ps = zonedParts(date, w.timezone, { weekday: 'short', month: 'short', day: '2-digit', year: '2-digit' });
  const pn = zonedParts(date, w.timezone, { month: '2-digit', day: '2-digit', year: 'numeric' });
  const D = +p.day, M = +pn.month;
  if (w.format === 'custom') {
    const map = { dddd: p.weekday, ddd: ps.weekday, Do: ordinal(D), DD: pn.day, D: String(D), MMMM: p.month, MMM: ps.month, MM: pn.month, M: String(M), YYYY: p.year, YY: ps.year };
    return w.custom.replace(/\[([^\]]*)\]|dddd|ddd|Do|DD|D|MMMM|MMM|MM|M|YYYY|YY/g, (m, lit) => (lit !== undefined ? lit : map[m]));
  }
  if (w.format === 'iso') return `${pn.year}-${pn.month}-${pn.day}`;
  if (w.format === 'numeric-eu') return `${pn.day}/${pn.month}${w.year ? '/' + pn.year : ''}`;
  if (w.format === 'numeric-us') return `${pn.month}/${pn.day}${w.year ? '/' + pn.year : ''}`;
  const short = w.format === 'short';
  const parts = [];
  if (w.weekday) parts.push((short ? ps.weekday : p.weekday) + ',');
  if (w.month) parts.push(short ? ps.month : p.month);
  parts.push(String(D));
  if (w.year) parts.push(p.year);
  return parts.join(' ');
}
function every(ms, fn) { fn(); const t = setInterval(fn, ms); return () => clearInterval(t); }

// ---------- Clock ----------
registerWidget('clock', (el, w) => {
  const wrap = h('div', { class: 'clock' });
  const digital = h('div', { class: 'clock-time' + (w.pulse ? ' pulse' : '') });
  digital.style.letterSpacing = w.digitSpacing + 'px';
  let svg, hands = {};
  if (w.analog) {
    const NS = 'http://www.w3.org/2000/svg', S = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    svg = S('svg', { viewBox: '0 0 100 100', class: 'clock-analog', width: w.analogSize, height: w.analogSize });
    svg.append(S('circle', { cx: 50, cy: 50, r: 48 - w.analogBorderWidth / 2, fill: rgba(w.analogFace, w.analogFaceOpacity), stroke: w.analogBorder, 'stroke-width': w.analogBorderWidth }));
    if (w.analogTicks) for (let i = 0; i < 12; i++) svg.append(S('line', { x1: 50, y1: 8, x2: 50, y2: i % 3 ? 12 : 15, stroke: w.analogHands, 'stroke-width': i % 3 ? 1 : 2, transform: `rotate(${i * 30} 50 50)`, 'stroke-linecap': 'round' }));
    hands.h = S('line', { x1: 50, y1: 50, x2: 50, y2: 26, stroke: w.analogHands, 'stroke-width': 4, 'stroke-linecap': 'round' });
    hands.m = S('line', { x1: 50, y1: 50, x2: 50, y2: 14, stroke: w.analogHands, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    hands.s = S('line', { x1: 50, y1: 56, x2: 50, y2: 12, stroke: w.analogSecondHand, 'stroke-width': 1, 'stroke-linecap': 'round' });
    svg.append(hands.h, hands.m, hands.s, S('circle', { cx: 50, cy: 50, r: 2.5, fill: w.analogSecondHand }));
    wrap.append(svg);
  } else wrap.append(digital);
  el.append(wrap);
  return every(1000, () => {
    const now = new Date();
    const p = zonedParts(now, w.timezone, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: w.hour12 });
    if (svg) {
      const H = +p.hour % 12, M = +p.minute, Sx = +p.second;
      hands.h.setAttribute('transform', `rotate(${H * 30 + M * 0.5} 50 50)`);
      hands.m.setAttribute('transform', `rotate(${M * 6} 50 50)`);
      if (w.seconds) hands.s.setAttribute('transform', `rotate(${Sx * 6} 50 50)`); else hands.s.style.display = 'none';
      return;
    }
    const hour = w.hour12 ? p.hour : p.hour.padStart(2, '0').replace(/^24/, '00');
    digital.replaceChildren();
    const ap = w.hour12 && w.ampm ? h('span', { class: 'clock-ampm ampm-' + w.ampmPosition, style: { fontSize: w.ampmScale + 'em' } }, p.dayPeriod) : null;
    if (ap && w.ampmPosition === 'before') digital.append(ap);
    digital.append(h('span', { class: 'clock-digits' }, hour, h('span', { class: 'colon' }, ':'), p.minute, w.seconds ? [h('span', { class: 'colon' }, ':'), p.second] : null));
    if (ap && w.ampmPosition !== 'before') digital.append(ap);
  });
});

registerWidget('date', (el, w) => {
  const d = h('div', { class: 'date-text' }); el.append(d);
  return every(30000, () => (d.textContent = formatDate(new Date(), w)));
});

// ---------- Greeting ----------
registerWidget('greeting', (el, w, ctx) => {
  const title = h('div', { class: 'greeting-text' }), sub = h('div', { class: 'greeting-sub' });
  el.append(title, sub);
  return every(60000, () => {
    const now = new Date(), hr = now.getHours();
    let msg = w.custom;
    if (w.auto) {
      const slots = [['morning', w.morningStart], ['afternoon', w.afternoonStart], ['evening', w.eveningStart], ['night', w.nightStart]].sort((a, b) => a[1] - b[1]);
      let cur = slots[slots.length - 1][0];
      for (const [k, start] of slots) if (hr >= start) cur = k;
      msg = w[cur];
    }
    const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (w.birthday && w.birthday === md) msg = w.birthdayText;
    title.textContent = msg.replace(/\{name\}/g, w.name).replace(/,\s*$/, '').trim();
    let s = w.subtitle;
    if (w.dailyMessage) { const q = QUOTES[Math.floor(now / 864e5) % QUOTES.length]; s = (s ? s + ' · ' : '') + q[0]; }
    sub.textContent = s; sub.hidden = !s;
  });
});

// ---------- Search ----------
const ICON_SEARCH = () => { const NS = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'search-icon'); const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M10.5 3a7.5 7.5 0 0 1 5.96 12.06l4.24 4.24-1.4 1.4-4.24-4.24A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z'); p.setAttribute('fill', 'currentColor'); s.append(p); return s; };
registerWidget('search', (el, w, ctx) => {
  const listId = 'search-history-list';
  const input = h('input', { type: 'search', class: 'search-input', placeholder: w.placeholder, 'aria-label': 'Search', autocomplete: 'off', list: w.history ? listId : null });
  const clear = h('button', { type: 'button', class: 'search-clear', 'aria-label': 'Clear', hidden: true }, '×');
  const btn = h('button', { type: 'submit', class: 'search-button' }, 'Search');
  const form = h('form', { class: 'search-form' + (w.focusGlow ? ' glow' : '') + (w.hoverLift ? ' lift' : ''), role: 'search' }, w.showIcon ? ICON_SEARCH() : null, input, w.showClear ? clear : null, w.showButton ? btn : null);
  const fs = form.style;
  fs.height = w.inputHeight + 'px'; fs.padding = `0 ${w.inputPadding}px`; fs.background = rgba(w.inputBg, w.inputBgOpacity);
  fs.backdropFilter = w.inputBlur ? `blur(${w.inputBlur}px)` : ''; fs.borderRadius = w.inputRadius + 'px';
  fs.border = `${w.inputBorderWidth}px solid ${rgba(w.inputBorderColor, w.inputBorderOpacity)}`;
  fs.setProperty('--placeholder', rgba(w.placeholderColor, w.placeholderOpacity));
  if (w.history) {
    const dl = h('datalist', { id: listId }, (ctx.data.searchHistory || []).map((q) => h('option', { value: q })));
    el.append(dl);
  }
  input.addEventListener('input', () => (clear.hidden = !input.value));
  clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; input.focus(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim(); if (!q) return;
    if (w.history) { ctx.data.searchHistory = [q, ...(ctx.data.searchHistory || []).filter((x) => x !== q)].slice(0, 30); ctx.saveData(); }
    const tpl = w.engine === 'custom' ? w.customUrl : ENGINES[w.engine] || ENGINES.google;
    const url = /^https?:\/\//.test(q) ? q : tpl.replace('%s', encodeURIComponent(q));
    if (w.newTab) window.open(url, '_blank', 'noopener'); else (window.top || window).location.href = url;
  });
  el.append(form);
  if (w.autofocus && !ctx.isPreview) setTimeout(() => input.focus(), 50);
  const onKey = (e) => {
    if (!w.focusKey || e.key !== w.focusKey) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
    e.preventDefault(); input.focus();
  };
  addEventListener('keydown', onKey);
  return () => removeEventListener('keydown', onKey);
});

// ---------- Shortcuts ----------
export function faviconFor(url) {
  try {
    if (isExtension && chrome.runtime?.getURL) return chrome.runtime.getURL('/_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=64');
    return 'https://www.google.com/s2/favicons?sz=64&domain=' + new URL(url).hostname;
  } catch { return ''; }
}
function letterTile(title, color) { return h('span', { class: 'shortcut-letter', style: { color: color || '' } }, (title || '?').trim().charAt(0).toUpperCase()); }

registerWidget('shortcuts', (el, w, ctx) => {
  const sc = ctx.config.shortcuts;
  const groups = sc.groups?.length ? sc.groups : ['Main'];
  let active = groups.includes(sc.activeGroup) ? sc.activeGroup : groups[0];
  const root = h('div', { class: 'shortcuts' }); el.append(root);
  let menu;
  const closeMenu = () => { menu?.remove(); menu = null; };
  const draw = () => {
    root.replaceChildren();
    if (w.showGroups && groups.length > 1) {
      root.append(h('div', { class: 'shortcut-groups', role: 'tablist' }, groups.map((g) => h('button', { class: 'shortcut-group' + (g === active ? ' active' : ''), role: 'tab', 'aria-selected': String(g === active), onclick: () => { active = g; draw(); } }, g))));
    }
    let items = sc.items.filter((i) => (i.group || 'Main') === active || (groups.length <= 1));
    items = [...items.filter((i) => i.pinned), ...items.filter((i) => !i.pinned)];
    if (w.rows) items = items.slice(0, w.rows * w.columns);
    const grid = h('div', { class: 'shortcut-grid hover-' + w.hoverEffect, role: 'list' });
    const gs = grid.style;
    gs.gridTemplateColumns = `repeat(${w.columns}, ${w.tileWidth}px)`; gs.columnGap = w.gapX + 'px'; gs.rowGap = w.gapY + 'px';
    gs.justifyContent = 'var(--w-align, center)';
    gs.setProperty('--tile-w', w.tileWidth + 'px'); gs.setProperty('--tile-h', w.tileHeight + 'px'); gs.setProperty('--icon', w.iconSize + 'px');
    gs.setProperty('--tile-bg', rgba(w.tileBg, w.tileBgOpacity)); gs.setProperty('--tile-blur', w.tileBlur + 'px');
    gs.setProperty('--tile-border', w.tileBorderWidth ? `${w.tileBorderWidth}px solid ${rgba(w.tileBorderColor, w.tileBorderOpacity)}` : 'none');
    gs.setProperty('--tile-shadow', `var(--shadow-${w.tileShadow})`); gs.setProperty('--hover-scale', w.hoverScale);
    gs.setProperty('--icon-radius', { square: '4px', rounded: '24%', circle: '50%' }[w.iconShape]);
    gs.setProperty('--icon-bg', rgba(w.iconBg, w.iconBgOpacity)); gs.setProperty('--title-size', w.titleSize + 'px');
    items.forEach((it, idx) => {
      const iconBox = h('span', { class: 'shortcut-icon', style: { background: it.bgColor || '' } });
      const src = it.icon || faviconFor(it.url);
      if (src) {
        const img = h('img', { src, alt: '', loading: 'lazy', draggable: false });
        img.addEventListener('error', () => img.replaceWith(letterTile(it.title, it.iconColor)));
        iconBox.append(img);
      } else iconBox.append(letterTile(it.title, it.iconColor));
      const a = h('a', { class: 'shortcut', href: it.url, role: 'listitem', title: it.title + (w.keyboard && idx < 9 ? ` (Alt+${idx + 1})` : ''), target: w.newTab ? '_blank' : '_top', rel: 'noopener', 'data-id': it.id },
        iconBox, w.showTitles ? h('span', { class: 'shortcut-title', style: { textAlign: w.titleAlign } }, it.title) : null);
      a.addEventListener('contextmenu', (e) => {
        e.preventDefault(); closeMenu();
        const act = (label, fn) => h('button', { onclick: () => { closeMenu(); fn(); } }, label);
        menu = h('div', { class: 'ctx-menu glass', style: { left: e.clientX + 'px', top: e.clientY + 'px' } },
          act('Open in new tab', () => window.open(it.url, '_blank', 'noopener')),
          act(it.pinned ? 'Unpin' : 'Pin to front', () => ctx.updateConfig((c) => { const x = c.shortcuts.items.find((s) => s.id === it.id); if (x) x.pinned = !x.pinned; })),
          act('Edit…', () => ctx.openSettings('w-shortcuts')),
          act('Duplicate', () => ctx.updateConfig((c) => { const i = c.shortcuts.items.findIndex((s) => s.id === it.id); c.shortcuts.items.splice(i + 1, 0, { ...it, id: uid() }); })),
          act('Delete', () => ctx.updateConfig((c) => { c.shortcuts.items = c.shortcuts.items.filter((s) => s.id !== it.id); })));
        document.body.append(menu);
      });
      grid.append(a);
    });
    if (w.showAdd && !ctx.isPreview) {
      const add = h('button', { class: 'shortcut shortcut-add', title: 'Add shortcut', onclick: () => openAdd() }, h('span', { class: 'shortcut-icon' }, h('span', { class: 'shortcut-letter' }, '+')), w.showTitles ? h('span', { class: 'shortcut-title' }, 'Add') : null);
      grid.append(add);
    }
    root.append(grid);
  };
  const openAdd = () => {
    const t = h('input', { placeholder: 'Title', required: true }), u = h('input', { placeholder: 'https://…', type: 'url', required: true });
    const warn = h('div', { class: 'muted small' });
    u.addEventListener('input', () => (warn.textContent = sc.items.some((i) => i.url.replace(/\/$/, '') === u.value.trim().replace(/\/$/, '')) ? 'This URL already exists.' : ''));
    const dlg = h('dialog', { class: 'mini-dialog glass' }, h('form', { method: 'dialog', onsubmit: (e) => {
      e.preventDefault(); let url = u.value.trim(); if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
      ctx.updateConfig((c) => c.shortcuts.items.push({ id: uid(), title: t.value.trim() || url, url, icon: '', iconColor: '', bgColor: '', group: active, pinned: false }));
      dlg.close(); dlg.remove();
    } }, h('h3', {}, 'New shortcut'), t, u, warn, h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => { dlg.close(); dlg.remove(); } }, 'Cancel'), h('button', { type: 'submit', class: 'primary' }, 'Add'))));
    document.body.append(dlg); dlg.showModal(); t.focus();
  };
  draw();
  const onDoc = (e) => { if (menu && !menu.contains(e.target)) closeMenu(); };
  const onKey = (e) => {
    if (e.key === 'Escape') closeMenu();
    if (w.keyboard && e.altKey && /^[1-9]$/.test(e.key)) { const a = root.querySelectorAll('a.shortcut')[+e.key - 1]; if (a) { e.preventDefault(); a.click(); } }
  };
  addEventListener('pointerdown', onDoc); addEventListener('keydown', onKey);
  return () => { closeMenu(); removeEventListener('pointerdown', onDoc); removeEventListener('keydown', onKey); };
});

// ---------- Weather (Open-Meteo, no API key) ----------
const WMO = { 0: ['Clear', '☀️'], 1: ['Mostly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'], 45: ['Fog', '🌫️'], 48: ['Fog', '🌫️'], 51: ['Drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Drizzle', '🌦️'], 61: ['Rain', '🌧️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'], 71: ['Snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 80: ['Showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Storm showers', '⛈️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm', '⛈️'], 99: ['Thunderstorm', '⛈️'] };
registerWidget('weather', (el, w, ctx) => {
  const box = h('div', { class: 'weather' }, h('span', { class: 'muted' }, 'Loading weather…')); el.append(box);
  const load = async () => {
    const key = `${w.city}|${w.lat}|${w.lon}|${w.units}`;
    const cache = ctx.data.weather;
    let d = cache && cache.key === key && Date.now() - cache.ts < w.refresh * 60000 ? cache.payload : null;
    try {
      if (!d) {
        let lat = w.lat, lon = w.lon, name = w.city;
        if (!lat || !lon) {
          const g = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(w.city))).json();
          if (!g.results?.length) throw new Error('City not found');
          ({ latitude: lat, longitude: lon, name } = g.results[0]);
        }
        const imp = w.units === 'imperial';
        const r = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1${imp ? '&temperature_unit=fahrenheit' : ''}`)).json();
        d = { name, t: r.current.temperature_2m, code: r.current.weather_code, hi: r.daily.temperature_2m_max[0], lo: r.daily.temperature_2m_min[0] };
        ctx.data.weather = { key, ts: Date.now(), payload: d }; ctx.saveData();
      }
      const [desc, icon] = WMO[d.code] || ['—', '🌡️'];
      box.replaceChildren(h('div', { class: 'weather-main' }, h('span', { class: 'weather-icon' }, icon), h('span', { class: 'weather-temp' }, Math.round(d.t) + '°')),
        w.showDesc ? h('div', { class: 'weather-desc' }, `${desc} · ${d.name}`) : null,
        w.showRange ? h('div', { class: 'weather-range muted' }, `↑ ${Math.round(d.hi)}°  ↓ ${Math.round(d.lo)}°`) : null);
    } catch (e) { box.replaceChildren(h('span', { class: 'muted' }, 'Weather unavailable (' + e.message + ')')); }
  };
  load(); const t = setInterval(load, w.refresh * 60000); return () => clearInterval(t);
});

// ---------- Quotes ----------
export const QUOTES = [
  ['The secret of getting ahead is getting started.', 'Mark Twain', 'motivation'], ['It always seems impossible until it is done.', 'Nelson Mandela', 'motivation'],
  ['Well done is better than well said.', 'Benjamin Franklin', 'motivation'], ['Act as if what you do makes a difference. It does.', 'William James', 'motivation'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall', 'motivation'], ['What we think, we become.', 'Buddha', 'wisdom'],
  ['The only true wisdom is in knowing you know nothing.', 'Socrates', 'wisdom'], ['Knowing yourself is the beginning of all wisdom.', 'Aristotle', 'wisdom'],
  ['Simplicity is the ultimate sophistication.', 'Leonardo da Vinci', 'wisdom'], ['Waste no more time arguing what a good man should be. Be one.', 'Marcus Aurelius', 'wisdom'],
  ['The present moment is filled with joy and happiness. If you are attentive, you will see it.', 'Thich Nhat Hanh', 'wisdom'],
  ['Concentrate all your thoughts upon the work at hand.', 'Alexander Graham Bell', 'focus'], ['Where focus goes, energy flows.', 'Tony Robbins', 'focus'],
  ['Do one thing at a time, and do it well.', 'Unknown', 'focus'], ['The shorter way to do many things is to do only one thing at a time.', 'Mozart', 'focus'],
  ['Deep work is the superpower of the 21st century.', 'Cal Newport', 'focus'], ['I am so clever that sometimes I don’t understand a single word of what I am saying.', 'Oscar Wilde', 'humor'],
  ['I have not failed. I’ve just found 10,000 ways that won’t work.', 'Thomas Edison', 'humor'], ['The road to success is dotted with many tempting parking spaces.', 'Will Rogers', 'humor'],
  ['If you think you are too small to make a difference, try sleeping with a mosquito.', 'Dalai Lama', 'humor']
];
registerWidget('quotes', (el, w, ctx) => {
  const custom = w.custom.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [t, a] = l.split(/\s+[—–-]\s+/); return [t, a || '', 'custom']; });
  let pool = w.customOnly && custom.length ? custom : [...custom, ...QUOTES.filter((q) => w.category === 'all' || q[2] === w.category)];
  if (!pool.length) pool = QUOTES;
  const box = h('figure', { class: 'quote' }); el.append(box);
  const show = () => {
    let i;
    if (w.rotation === 'tab') i = Math.floor(Math.random() * pool.length);
    else { const period = { hourly: 36e5, daily: 864e5, interval: w.interval * 6e4 }[w.rotation]; i = Math.floor(Date.now() / period) % pool.length; }
    const [t, a] = pool[i];
    box.replaceChildren(h('blockquote', { class: 'quote-text' }, '“' + t + '”'), w.showAuthor && a ? h('figcaption', { class: 'quote-author' }, '— ' + a) : null);
  };
  show();
  if (w.rotation === 'interval') { const t = setInterval(show, w.interval * 6e4); return () => clearInterval(t); }
});

// ---------- Notes (multiple, markdown) ----------
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function markdown(src) {
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  let out = '', list = null;
  for (const line of src.split('\n')) {
    let m;
    const li = line.match(/^\s*([-*]|\d+\.)\s+(.*)/);
    if (!li && list) { out += `</${list}>`; list = null; }
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) out += `<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`;
    else if (li) {
      const tag = /\d/.test(li[1]) ? 'ol' : 'ul'; if (list !== tag) { if (list) out += `</${list}>`; out += `<${tag}>`; list = tag; }
      const cb = li[2].match(/^\[( |x)\]\s*(.*)/i);
      out += cb ? `<li class="task">${cb[1] === ' ' ? '☐' : '☑'} ${inline(cb[2])}</li>` : `<li>${inline(li[2])}</li>`;
    } else if (line.startsWith('> ')) out += `<blockquote>${inline(line.slice(2))}</blockquote>`;
    else if (line.trim()) out += `<p>${inline(line)}</p>`;
  }
  if (list) out += `</${list}>`;
  return out; // safe: every user string passed through esc()
}
registerWidget('notes', (el, w, ctx) => {
  const d = ctx.data;
  if (!d.notes?.length) d.notes = [{ id: uid(), title: 'Note', text: '# Notes\nWrite **markdown** here.' }];
  let active = d.notes.find((n) => n.id === d.activeNote) || d.notes[0];
  const tabs = h('div', { class: 'tabs' }), area = h('textarea', { class: 'notes-area', 'aria-label': 'Note', spellcheck: true }), view = h('div', { class: 'notes-view md' });
  let timer;
  const save = () => { clearTimeout(timer); timer = setTimeout(() => ctx.saveData(), 300); };
  const render = () => {
    tabs.replaceChildren(...d.notes.map((n) => h('button', { class: 'tab' + (n === active ? ' active' : ''), onclick: () => { active = n; d.activeNote = n.id; render(); }, ondblclick: () => { const t = prompt('Rename note', n.title); if (t) { n.title = t; save(); render(); } } }, n.title)),
      h('button', { class: 'tab add', title: 'New note', onclick: () => { active = { id: uid(), title: 'Note ' + (d.notes.length + 1), text: '' }; d.notes.push(active); d.activeNote = active.id; save(); render(); editMode(true); } }, '+'),
      d.notes.length > 1 ? h('button', { class: 'tab', title: 'Delete note', onclick: () => { if (confirm('Delete this note?')) { d.notes = d.notes.filter((n) => n !== active); active = d.notes[0]; save(); render(); } } }, '🗑') : null);
    area.value = active.text; view.innerHTML = markdown(active.text);
  };
  const editMode = (on) => { area.hidden = !on && w.markdown; view.hidden = on || !w.markdown; if (on) area.focus(); };
  area.addEventListener('input', () => { active.text = area.value; save(); });
  area.addEventListener('blur', () => { view.innerHTML = markdown(active.text); editMode(false); });
  view.addEventListener('click', (e) => { if (e.target.tagName !== 'A') editMode(true); });
  el.append(tabs, area, view); render(); editMode(!w.markdown);
  return () => { clearTimeout(timer); ctx.saveData(); };
});

// ---------- To-do ----------
registerWidget('todo', (el, w, ctx) => {
  const d = ctx.data; d.todos ||= [];
  const list = h('ul', { class: 'todo-list' });
  const input = h('input', { placeholder: 'Add a task…', 'aria-label': 'New task' }), due = h('input', { type: 'date', 'aria-label': 'Due date', hidden: !w.showDue });
  const render = () => {
    const items = w.hideDone ? d.todos.filter((t) => !t.done) : d.todos;
    list.replaceChildren(...items.map((t) => {
      const overdue = t.due && !t.done && new Date(t.due + 'T23:59') < new Date();
      return h('li', { class: 'todo' + (t.done ? ' done' : '') },
        h('input', { type: 'checkbox', checked: t.done, 'aria-label': 'Done', onchange: (e) => { t.done = e.target.checked; ctx.saveData(); render(); } }),
        h('span', { class: 'todo-text' }, t.text), w.showDue && t.due ? h('span', { class: 'todo-due' + (overdue ? ' overdue' : '') }, t.due) : null,
        h('button', { class: 'icon-btn', 'aria-label': 'Delete', onclick: () => { d.todos = d.todos.filter((x) => x !== t); ctx.saveData(); render(); } }, '×'));
    }));
  };
  const form = h('form', { class: 'todo-form', onsubmit: (e) => { e.preventDefault(); if (!input.value.trim()) return; d.todos.push({ id: uid(), text: input.value.trim(), done: false, due: due.value }); input.value = ''; due.value = ''; ctx.saveData(); render(); } }, input, due);
  el.append(h('div', { class: 'widget-title' }, 'To-do'), list, form); render();
});

// ---------- Pomodoro ----------
let audioCtx;
function beep(vol) {
  try {
    audioCtx ||= new AudioContext();
    [0, 0.35, 0.7].forEach((t) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.value = vol * 0.3; o.connect(g).connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.18); });
  } catch {}
}
registerWidget('pomodoro', (el, w, ctx) => {
  const d = ctx.data;
  d.pomo ||= { phase: 'work', running: false, endsAt: 0, remaining: w.work * 60, count: 0, history: {} };
  const p = d.pomo, len = (ph) => ({ work: w.work, short: w.short, long: w.long }[ph] * 60);
  const time = h('div', { class: 'pomo-time' }), label = h('div', { class: 'pomo-phase muted' }), hist = h('div', { class: 'muted small' });
  const startBtn = h('button', { class: 'primary', onclick: () => { if (p.running) { p.remaining = Math.max(0, Math.round((p.endsAt - Date.now()) / 1000)); p.running = false; } else { p.endsAt = Date.now() + p.remaining * 1000; p.running = true; } ctx.saveData(); tick(); } });
  const reset = h('button', { onclick: () => { p.running = false; p.remaining = len(p.phase); ctx.saveData(); tick(); } }, 'Reset');
  const phases = h('div', { class: 'row' }, ['work', 'short', 'long'].map((ph) => h('button', { class: 'chip', onclick: () => { p.phase = ph; p.running = false; p.remaining = len(ph); ctx.saveData(); tick(); } }, { work: 'Focus', short: 'Break', long: 'Long' }[ph])));
  el.append(phases, time, label, h('div', { class: 'row' }, startBtn, reset), hist);
  const tick = () => {
    let rem = p.running ? Math.round((p.endsAt - Date.now()) / 1000) : p.remaining;
    if (p.running && rem <= 0) {
      if (w.sound) beep(w.volume);
      if (p.phase === 'work') { p.count++; const k = new Date().toISOString().slice(0, 10); p.history[k] = (p.history[k] || 0) + 1; p.phase = p.count % w.longEvery === 0 ? 'long' : 'short'; }
      else p.phase = 'work';
      p.running = false; p.remaining = len(p.phase); rem = p.remaining; ctx.saveData();
    }
    if (!p.running && p.remaining > len(p.phase)) p.remaining = len(p.phase);
    time.textContent = `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(rem % 60).padStart(2, '0')}`;
    label.textContent = { work: 'Focus session', short: 'Short break', long: 'Long break' }[p.phase];
    startBtn.textContent = p.running ? 'Pause' : 'Start';
    hist.textContent = `Today: ${p.history[new Date().toISOString().slice(0, 10)] || 0} sessions`;
    document.body.classList.toggle('focus-mode', !!(w.focusMode && p.running && p.phase === 'work'));
  };
  return every(500, tick);
});

// ---------- Countdown ----------
registerWidget('countdown', (el, w) => {
  const list = h('div', { class: 'countdown' }); el.append(list);
  return every(w.showHours ? 60000 : 3600000, () => {
    list.replaceChildren(...w.items.split('\n').map((l) => l.split('|')).filter((p) => p[1]).map(([label, date]) => {
      const t = new Date(date.trim()); if (isNaN(t)) return h('div', { class: 'muted' }, label + ': invalid date');
      const ms = t - Date.now(), days = Math.floor(Math.abs(ms) / 864e5), hours = Math.floor((Math.abs(ms) % 864e5) / 36e5);
      return h('div', { class: 'countdown-item' }, h('strong', {}, `${days}d${w.showHours ? ' ' + hours + 'h' : ''}`), ' ', ms >= 0 ? 'until ' : 'since ', label.trim());
    }));
  });
});

registerWidget('customText', (el, w) => { el.append(h('div', { class: 'custom-text' }, w.text)); });

registerWidget('worldclocks', (el, w) => {
  const box = h('div', { class: 'worldclocks ' + w.layout }); el.append(box);
  const zones = w.zones.split('\n').map((l) => l.split('|')).filter((z) => z[1]);
  return every(15000, () => box.replaceChildren(...zones.map(([label, tz]) => {
    let t; try { t = new Intl.DateTimeFormat([], { timeZone: tz.trim(), hour: '2-digit', minute: '2-digit', hour12: w.hour12 }).format(new Date()); } catch { t = '??'; }
    return h('div', { class: 'wc' }, h('span', { class: 'wc-label muted' }, label.trim()), h('span', { class: 'wc-time' }, t));
  })));
});

registerWidget('focus', (el, w, ctx) => {
  const d = ctx.data, today = new Date().toDateString();
  if (d.focus?.date !== today) d.focus = { date: today, text: '', done: false };
  const draw = () => {
    el.replaceChildren();
    if (!d.focus.text) {
      const input = h('input', { class: 'focus-input', placeholder: w.prompt, 'aria-label': w.prompt });
      el.append(h('form', { onsubmit: (e) => { e.preventDefault(); d.focus.text = input.value.trim(); ctx.saveData(); draw(); } }, input));
    } else {
      el.append(h('div', { class: 'muted small' }, 'Today'), h('label', { class: 'focus-done' + (d.focus.done ? ' done' : '') },
        h('input', { type: 'checkbox', checked: d.focus.done, onchange: (e) => { d.focus.done = e.target.checked; ctx.saveData(); draw(); } }), ' ', d.focus.text,
        h('button', { class: 'icon-btn', 'aria-label': 'Clear', onclick: (e) => { e.preventDefault(); d.focus.text = ''; ctx.saveData(); draw(); } }, '×')));
    }
  };
  draw();
});

registerWidget('calendar', (el, w) => {
  let view = new Date(); view.setDate(1);
  const draw = () => {
    const y = view.getFullYear(), m = view.getMonth(), today = new Date();
    const first = (new Date(y, m, 1).getDay() - w.weekStart + 7) % 7, days = new Date(y, m + 1, 0).getDate();
    const names = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat([], { weekday: 'narrow' }).format(new Date(2024, 0, 7 + ((i + +w.weekStart) % 7))));
    const cells = [...names.map((n) => h('span', { class: 'cal-h muted' }, n)), ...Array.from({ length: first }, () => h('span')),
      ...Array.from({ length: days }, (_, i) => h('span', { class: 'cal-d' + (today.getFullYear() === y && today.getMonth() === m && today.getDate() === i + 1 ? ' today' : '') }, i + 1))];
    el.replaceChildren(h('div', { class: 'cal-head' }, h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => { view.setMonth(m - 1); draw(); } }, '‹'),
      h('strong', {}, new Intl.DateTimeFormat([], { month: 'long', year: 'numeric' }).format(view)),
      h('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => { view.setMonth(m + 1); draw(); } }, '›')), h('div', { class: 'cal-grid' }, cells));
  };
  draw();
});

registerWidget('bookmarks', async (el, w) => {
  if (!isExtension || !chrome.permissions) { el.append(h('span', { class: 'muted' }, 'Bookmarks are available inside the extension.')); return; }
  const show = async () => {
    const tree = await chrome.bookmarks.getChildren('1');
    el.replaceChildren(h('div', { class: 'widget-title' }, 'Bookmarks'), h('ul', { class: 'bm-list' }, tree.filter((b) => b.url).slice(0, w.max).map((b) => h('li', {}, h('a', { href: b.url, target: '_top' }, h('img', { src: faviconFor(b.url), alt: '' }), b.title || b.url)))));
  };
  if (await chrome.permissions.contains({ permissions: ['bookmarks'] })) show();
  else el.append(h('button', { onclick: async () => { if (await chrome.permissions.request({ permissions: ['bookmarks'] })) show(); } }, 'Allow bookmark access'));
});

registerWidget('battery', async (el) => {
  if (!navigator.getBattery) { el.append(h('span', { class: 'muted' }, 'Battery status not supported')); return; }
  const b = await navigator.getBattery(), s = h('span'); el.append(s);
  const up = () => (s.textContent = `${b.charging ? '⚡' : '🔋'} ${Math.round(b.level * 100)}%`);
  up(); b.addEventListener('levelchange', up); b.addEventListener('chargingchange', up);
  return () => { b.removeEventListener('levelchange', up); b.removeEventListener('chargingchange', up); };
});
