// Settings Studio: schema-driven controls, universal search, favorites, recent, undo/redo, managers.
import { CATEGORIES, ALL_FIELDS, THEME_PRESETS, FONT_SUGGESTIONS, buildDefaults, WIDGETS } from './settings-schema.js';
import { loadConfig, saveConfig, getPath, setPath, sanitize, deepMerge, getLibrary, setLibrary, getFonts, setFonts, getData, setData, setItem, getItem, onChange, migrate, uid, readFileAsDataURL, BUILTIN_BACKGROUNDS } from './storage.js';
import { h } from './widget-registry.js';
import { validateCss } from './theme-manager.js';
import { faviconFor } from './widgets.js';
import * as IO from './import-export.js';

const DEFAULTS = buildDefaults();
const $ = (s) => document.querySelector(s);
let cfg, library, fonts, current = 'appearance', query = '';
const undoStack = [], redoStack = [];
let lastSnap = 0;

function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms); }
function snapshot() { const now = Date.now(); if (now - lastSnap > 700) { undoStack.push(JSON.stringify(cfg)); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0; } lastSnap = now; }
function commit(rerender = false) { saveConfig(cfg); if (rerender) render(); }
function mutate(fn, rerender = true) { snapshot(); lastSnap = 0; fn(cfg); commit(rerender); }
function undo() { const s = undoStack.pop(); if (!s) return toast('Nothing to undo'); redoStack.push(JSON.stringify(cfg)); cfg = JSON.parse(s); commit(true); toast('Undone'); }
function redo() { const s = redoStack.pop(); if (!s) return toast('Nothing to redo'); undoStack.push(JSON.stringify(cfg)); cfg = JSON.parse(s); commit(true); toast('Redone'); }

function setValue(f, raw) {
  snapshot();
  const def = getPath(DEFAULTS, f.key);
  const v = def === undefined ? raw : sanitize(raw, def);
  setPath(cfg, f.key, v);
  const r = cfg.meta.recent.filter((k) => k !== f.key); r.unshift(f.key); cfg.meta.recent = r.slice(0, 30);
  commit();
  const row = document.querySelector(`.field[data-key="${CSS.escape(f.key)}"]`);
  row?.classList.toggle('changed', JSON.stringify(v) !== JSON.stringify(def));
}

// ---------- controls ----------
let tzList; const timezones = () => (tzList ||= (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []));
function control(f) {
  const v = getPath(cfg, f.key), id = 'f-' + f.key.replace(/\./g, '-');
  const on = (el, ev, get) => { el.addEventListener(ev, () => setValue(f, get())); return el; };
  switch (f.type) {
    case 'toggle': { const cb = h('input', { type: 'checkbox', id, checked: !!v }); on(cb, 'change', () => cb.checked); return h('label', { class: 'switch' }, cb, h('span')); }
    case 'range': {
      const num = h('input', { type: 'number', class: 'num', min: f.min, max: f.max, step: f.step || 1, value: v, 'aria-label': f.label + ' value' });
      const rng = h('input', { type: 'range', id, min: f.min, max: f.max, step: f.step || 1, value: v });
      rng.addEventListener('input', () => { num.value = rng.value; setValue(f, +rng.value); });
      num.addEventListener('change', () => { rng.value = num.value; setValue(f, +num.value); });
      return h('div', { class: 'range' }, rng, num, f.unit ? h('span', { class: 'unit' }, f.unit) : null);
    }
    case 'number': { const n = h('input', { type: 'number', id, min: f.min, max: f.max, step: f.step || 1, value: v }); n.addEventListener('change', () => setValue(f, +n.value)); return n; }
    case 'select': {
      const s = h('select', { id }, f.options.map((o) => { const val = typeof o === 'object' ? o.v : o; return h('option', { value: val, selected: String(val) === String(v) }, typeof o === 'object' ? o.l : o); }));
      s.addEventListener('change', () => setValue(f, typeof getPath(DEFAULTS, f.key) === 'number' ? +s.value : s.value)); return s;
    }
    case 'color': {
      const c = h('input', { type: 'color', id, value: /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000' });
      const t = h('input', { type: 'text', class: 'hex', value: v, 'aria-label': f.label + ' hex', placeholder: f.allowEmpty ? 'auto' : '' });
      c.addEventListener('input', () => { t.value = c.value; setValue(f, c.value); });
      t.addEventListener('change', () => { const x = t.value.trim(); if (x === '' && f.allowEmpty) setValue(f, ''); else if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(x)) { if (x.length === 7) c.value = x; setValue(f, x); } else { t.value = getPath(cfg, f.key); toast('Use a hex color like #ffcc00'); } });
      return h('div', { class: 'color' }, c, t, f.allowEmpty ? h('button', { class: 'mini', type: 'button', onclick: () => { t.value = ''; setValue(f, ''); } }, 'auto') : null);
    }
    case 'font': {
      const i = h('input', { type: 'text', id, value: v, list: 'font-list', placeholder: 'inherit' }); i.addEventListener('change', () => setValue(f, i.value.trim())); return i;
    }
    case 'timezone': { const i = h('input', { type: 'text', id, value: v, list: 'tz-list', placeholder: 'Local time' }); i.addEventListener('change', () => setValue(f, i.value.trim())); return i; }
    case 'textarea': case 'code': {
      const ta = h('textarea', { id, rows: f.type === 'code' ? 8 : 4, class: f.type === 'code' ? 'code' : '', spellcheck: f.type !== 'code' });
      ta.value = v ?? '';
      const msg = h('div', { class: 'validate small' });
      let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => setValue(f, ta.value), 350); });
      if (f.type === 'code' && /css|tokens/i.test(f.key)) ta.addEventListener('blur', () => { if (f.key.endsWith('tokens')) return; const r = validateCss(f.key.startsWith('widgets.') ? `x{${ta.value}}` : ta.value); msg.textContent = r.ok ? `✓ Valid · ${r.rules} rule(s)` : '⚠ ' + r.errors.join('; '); msg.className = 'validate small ' + (r.ok ? 'ok' : 'err'); });
      ta.addEventListener('keydown', (e) => { if (e.key === 'Tab' && f.type === 'code') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); } });
      return h('div', { class: 'ta' }, ta, msg);
    }
    default: { const i = h('input', { type: 'text', id, value: v ?? '' }); let t; i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => setValue(f, i.value), 300); }); return i; }
  }
}
function fieldRow(f, showCat = false) {
  const def = getPath(DEFAULTS, f.key), fav = cfg.meta.favorites.includes(f.key);
  const changed = JSON.stringify(getPath(cfg, f.key)) !== JSON.stringify(def);
  return h('div', { class: 'field' + (changed ? ' changed' : '') + (['textarea', 'code'].includes(f.type) ? ' wide' : ''), 'data-key': f.key },
    h('div', { class: 'f-label' },
      h('label', { for: 'f-' + f.key.replace(/\./g, '-') }, f.label),
      showCat ? h('span', { class: 'tag' }, f.catName + (f.group && f.group !== f.catName ? ' › ' + f.group : '')) : null,
      f.desc ? h('div', { class: 'desc' }, f.desc) : null),
    h('div', { class: 'f-control' }, control(f)),
    h('div', { class: 'f-actions' },
      h('button', { class: 'icon' + (fav ? ' on' : ''), title: fav ? 'Remove from favorites' : 'Add to favorites', 'aria-label': 'Favorite', onclick: () => mutate((c) => { c.meta.favorites = fav ? c.meta.favorites.filter((k) => k !== f.key) : [...c.meta.favorites, f.key]; }) }, fav ? '★' : '☆'),
      h('button', { class: 'icon reset', title: 'Reset to default', 'aria-label': 'Reset', onclick: () => mutate((c) => setPath(c, f.key, structuredClone(def))) }, '↺'),
      h('button', { class: 'icon', title: 'Copy value as JSON', 'aria-label': 'Export value', onclick: async () => { await navigator.clipboard.writeText(JSON.stringify({ [f.key]: getPath(cfg, f.key) })); toast('Value copied'); } }, '⧉'),
      h('button', { class: 'icon', title: 'Paste value from JSON', 'aria-label': 'Import value', onclick: async () => {
        try { const o = JSON.parse(await navigator.clipboard.readText()); if (!(f.key in o)) throw 0; mutate((c) => setPath(c, f.key, sanitize(o[f.key], def))); toast('Value imported'); } catch { toast('Clipboard has no value for this setting'); }
      } }, '⎘')));
}
function groupFields(fields, showCat) {
  const groups = new Map();
  fields.forEach((f) => { const g = f.group || ''; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); });
  return [...groups].map(([g, list]) => h('section', { class: 'group' }, g ? h('h3', {}, g.replace(/^(\w)/, (m) => m.toUpperCase())) : null, list.map((f) => fieldRow(f, showCat))));
}

// ---------- navigation ----------
function renderNav() {
  const item = (id, icon, name, count) => h('button', { class: 'nav-item' + (current === id && !query ? ' active' : ''), onclick: () => { current = id; query = ''; $('#q').value = ''; location.hash = id; render(); } }, h('span', { class: 'nav-icon' }, icon), name, count != null ? h('span', { class: 'count' }, count) : null);
  $('#nav').replaceChildren(
    item('favorites', '★', 'Favorites', cfg.meta.favorites.length), item('recent', '↻', 'Recently changed', cfg.meta.recent.length),
    h('div', { class: 'nav-sep' }, 'Global'), ...CATEGORIES.filter((c) => !c.widget && c.id !== 'css' && c.id !== 'data').map((c) => item(c.id, c.icon, c.name)),
    h('div', { class: 'nav-sep' }, 'Widgets'), ...CATEGORIES.filter((c) => c.widget).map((c) => item(c.id, cfg.widgets[c.widget].enabled ? '●' : '○', c.name)),
    h('div', { class: 'nav-sep' }, 'Advanced'), ...CATEGORIES.filter((c) => c.id === 'css' || c.id === 'data').map((c) => item(c.id, c.icon, c.name)));
}

function render() {
  renderNav();
  const panel = $('#panel'), scroll = panel.scrollTop;
  if (query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const res = ALL_FIELDS.filter((f) => { const hay = `${f.label} ${f.desc || ''} ${f.catName} ${f.group || ''} ${f.key}`.toLowerCase(); return words.every((w) => hay.includes(w)); });
    panel.replaceChildren(h('div', { class: 'cat-head' }, h('h2', {}, `Search: “${query}”`), h('span', { class: 'muted' }, `${res.length} setting(s)`)), ...(res.length ? groupFields(res.slice(0, 150), true) : [h('p', { class: 'muted' }, 'No settings match. Try “font size”, “blur”, “radius”…')]));
    return;
  }
  if (current === 'favorites' || current === 'recent') {
    const keys = current === 'favorites' ? cfg.meta.favorites : cfg.meta.recent;
    const res = keys.map((k) => ALL_FIELDS.find((f) => f.key === k)).filter(Boolean);
    panel.replaceChildren(h('div', { class: 'cat-head' }, h('h2', {}, current === 'favorites' ? 'Favorites' : 'Recently changed'),
      current === 'recent' && res.length ? h('button', { onclick: () => mutate((c) => (c.meta.recent = [])) }, 'Clear list') : null),
    ...(res.length ? groupFields(res, true) : [h('p', { class: 'muted' }, current === 'favorites' ? 'Click ☆ next to any setting to pin it here.' : 'Settings you change appear here.')]));
    return;
  }
  const cat = CATEGORIES.find((c) => c.id === current) || CATEGORIES[0];
  const head = h('div', { class: 'cat-head' }, h('h2', {}, cat.name),
    cat.fields.length ? h('div', { class: 'row' },
      h('button', { onclick: () => { if (confirm(`Reset all ${cat.name} settings to defaults?`)) mutate((c) => cat.fields.forEach((f) => setPath(c, f.key, structuredClone(getPath(DEFAULTS, f.key))))); } }, 'Reset category'),
      h('button', { onclick: () => IO.download(`newtab-${cat.id}.json`, { app: 'ultra-newtab', category: cat.id, values: Object.fromEntries(cat.fields.map((f) => [f.key, getPath(cfg, f.key)])) }) }, 'Export'),
      h('button', { onclick: async () => {
        try { const o = await IO.pickJsonFile(); const vals = o.values || o; let n = 0; mutate((c) => { for (const f of cat.fields) if (f.key in vals) { setPath(c, f.key, sanitize(vals[f.key], getPath(DEFAULTS, f.key))); n++; } }); toast(`Imported ${n} setting(s)`); } catch (e) { toast(e.message); }
      } }, 'Import')) : null);
  const custom = cat.custom ? CUSTOM[cat.custom]?.() : null;
  panel.replaceChildren(head, custom, ...groupFields(cat.fields));
  panel.scrollTop = scroll;
}

// ---------- custom sections ----------
const card = (title, ...children) => h('section', { class: 'group card' }, h('h3', {}, title), ...children);
const CUSTOM = {
  presets: () => card('Theme presets', h('div', { class: 'chips' }, Object.entries(THEME_PRESETS).map(([name, p]) =>
    h('button', { class: 'preset', onclick: () => { mutate((c) => (c.theme = deepMerge(c.theme, p))); toast(name + ' applied'); } },
      h('span', { class: 'swatches' }, Object.values(Object.values(p.palettes)[0]).slice(0, 6).map((col) => h('i', { style: { background: col } }))), name)))),

  fonts: () => {
    const sample = h('div', { class: 'type-preview', style: { fontFamily: `"${cfg.theme.fontFamily}", system-ui`, fontSize: '42px', fontWeight: cfg.theme.fontWeight, letterSpacing: cfg.theme.letterSpacing + 'px' } }, `Good evening, ${cfg.widgets.greeting.name} — 12:34`);
    const up = h('input', { type: 'file', accept: '.woff,.woff2,.ttf,.otf', hidden: true, onchange: async (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 8e6) return toast('Font is too large (max 8 MB)');
      const name = prompt('Font family name', file.name.replace(/\.\w+$/, '').replace(/[-_]/g, ' ')); if (!name) return;
      fonts.push({ name, data: await readFileAsDataURL(file) }); await setFonts(fonts); toast('Font added: ' + name); render();
    } });
    return card('Fonts', sample,
      h('p', { class: 'muted small' }, 'Bundled: Satisfy. System fonts work by name. Upload only fonts you are licensed to use.'),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => up.click() }, 'Upload font…'), up),
      fonts.length ? h('ul', { class: 'list' }, fonts.map((f) => h('li', {}, h('span', { style: { fontFamily: `"${f.name}"` } }, f.name),
        h('button', { onclick: () => mutate((c) => (c.theme.fontFamily = f.name)) }, 'Use globally'),
        h('button', { class: 'danger', onclick: async () => { fonts = fonts.filter((x) => x !== f); await setFonts(fonts); render(); } }, 'Delete')))) : null);
  },

  library: () => {
    const save = async () => { await setLibrary(library); render(); };
    const collections = [...new Set(library.map((i) => i.collection).filter(Boolean))];
    const up = h('input', { type: 'file', accept: 'image/*,video/*', multiple: true, hidden: true, onchange: async (e) => {
      let n = 0;
      for (const file of e.target.files) {
        if (file.size > 60e6) { toast(file.name + ' is over 60 MB, skipped'); continue; }
        library.push({ id: uid(), name: file.name, src: await readFileAsDataURL(file), type: file.type.startsWith('video') ? 'video' : 'image', favorite: false, excluded: false, collection: cfg.background.collection || '' }); n++;
      }
      await save(); toast(`${n} file(s) added`);
    } });
    const recent = new Set();
    getItem('bgState').then((s) => (s?.recent || []).forEach((r) => { recent.add(r); document.querySelector(`.thumb[data-id="${CSS.escape(r)}"]`)?.classList.add('recent'); }));
    return card('Background library',
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => up.click() }, 'Upload images / videos…'), up,
        h('label', { class: 'inline' }, 'Active collection ', h('select', { onchange: (e) => mutate((c) => (c.background.collection = e.target.value)) },
          h('option', { value: '' }, 'All images'), collections.map((x) => h('option', { value: x, selected: cfg.background.collection === x }, x)))),
        h('button', { onclick: () => { const n = prompt('New collection name'); if (n) mutate((c) => (c.background.collection = n)); } }, '+ Collection'),
        h('button', { onclick: async () => { library = [...library.filter((i) => !i.builtin), ...structuredClone(BUILTIN_BACKGROUNDS).filter((b) => !library.some((i) => i.id === b.id))]; await save(); } }, 'Restore built-ins')),
      h('p', { class: 'muted small' }, 'Images are stored locally on this device. ★ favorite · ⊘ exclude from rotation · Recently shown images are outlined.'),
      h('div', { class: 'thumbs' }, library.map((it) => h('div', { class: 'thumb' + (it.excluded ? ' excluded' : '') + (recent.has(it.id) ? ' recent' : ''), 'data-id': it.id },
        it.type === 'video' ? h('video', { src: it.src, muted: true }) : h('img', { src: it.src, alt: it.name, loading: 'lazy' }),
        h('div', { class: 'thumb-bar' },
          h('button', { title: 'Favorite', onclick: () => { it.favorite = !it.favorite; save(); } }, it.favorite ? '★' : '☆'),
          h('button', { title: it.excluded ? 'Include' : 'Exclude', onclick: () => { it.excluded = !it.excluded; save(); } }, '⊘'),
          h('button', { title: 'Set collection', onclick: () => { const n = prompt('Collection (empty = none)', it.collection || ''); if (n !== null) { it.collection = n.trim(); save(); } } }, '▤'),
          !it.builtin ? h('button', { title: 'Delete', onclick: () => { if (confirm('Delete this background?')) { library = library.filter((x) => x !== it); save(); } } }, '✕') : null),
        it.collection ? h('span', { class: 'thumb-tag' }, it.collection) : null))));
  },

  shortcutManager: () => {
    const sc = cfg.shortcuts;
    const dupes = new Set(); const seen = new Set();
    sc.items.forEach((i) => { const u = i.url.replace(/\/$/, '').toLowerCase(); if (seen.has(u)) dupes.add(u); seen.add(u); });
    let dragIdx = null;
    const rows = sc.items.map((it, idx) => {
      const iconUp = h('input', { type: 'file', accept: 'image/*,.svg', hidden: true, onchange: async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 500e3) return toast('Icon too large (max 500 KB)'); const data = await readFileAsDataURL(f); mutate((c) => (c.shortcuts.items[idx].icon = data)); } });
      const inp = (k, ph, type = 'text') => { const i = h('input', { type, value: it[k] || '', placeholder: ph, 'aria-label': ph }); i.addEventListener('change', () => mutate((c) => (c.shortcuts.items[idx][k] = i.value.trim()), k === 'url')); return i; };
      const colorIn = (k, label) => { const i = h('input', { type: 'color', value: it[k] || '#000000', title: label, 'aria-label': label }); i.addEventListener('change', () => mutate((c) => (c.shortcuts.items[idx][k] = i.value), false)); return i; };
      const row = h('div', { class: 'sc-row' + (dupes.has(it.url.replace(/\/$/, '').toLowerCase()) ? ' dupe' : ''), draggable: true },
        h('span', { class: 'drag', title: 'Drag to reorder' }, '⠿'),
        h('span', { class: 'sc-icon', style: { background: it.bgColor || '' } }, h('img', { src: it.icon || faviconFor(it.url), alt: '', onerror: (e) => (e.target.style.visibility = 'hidden') })),
        inp('title', 'Title'), inp('url', 'https://…', 'url'),
        h('select', { 'aria-label': 'Group', onchange: (e) => mutate((c) => (c.shortcuts.items[idx].group = e.target.value)) }, sc.groups.map((g) => h('option', { selected: (it.group || 'Main') === g }, g))),
        h('div', { class: 'sc-more' }, inp('icon', 'Icon URL (optional)'),
          h('button', { onclick: () => iconUp.click(), title: 'Upload icon' }, 'Upload'), iconUp,
          it.icon ? h('button', { onclick: () => mutate((c) => (c.shortcuts.items[idx].icon = '')) }, 'Clear icon') : null,
          colorIn('bgColor', 'Icon background'), colorIn('iconColor', 'Letter color'),
          h('button', { title: 'Pin', class: it.pinned ? 'on' : '', onclick: () => mutate((c) => (c.shortcuts.items[idx].pinned = !it.pinned)) }, it.pinned ? '📌 Pinned' : 'Pin'),
          h('button', { title: 'Move up', onclick: () => idx > 0 && mutate((c) => c.shortcuts.items.splice(idx - 1, 0, c.shortcuts.items.splice(idx, 1)[0])) }, '↑'),
          h('button', { title: 'Move down', onclick: () => mutate((c) => c.shortcuts.items.splice(idx + 1, 0, c.shortcuts.items.splice(idx, 1)[0])) }, '↓'),
          h('button', { title: 'Duplicate', onclick: () => mutate((c) => c.shortcuts.items.splice(idx + 1, 0, { ...structuredClone(it), id: uid() })) }, 'Duplicate'),
          h('button', { class: 'danger', title: 'Delete', onclick: () => mutate((c) => c.shortcuts.items.splice(idx, 1)) }, 'Delete')),
        dupes.has(it.url.replace(/\/$/, '').toLowerCase()) ? h('span', { class: 'warn small' }, 'Duplicate URL') : null);
      row.addEventListener('dragstart', () => (dragIdx = idx));
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('over'); });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', (e) => { e.preventDefault(); if (dragIdx == null || dragIdx === idx) return; mutate((c) => c.shortcuts.items.splice(idx, 0, c.shortcuts.items.splice(dragIdx, 1)[0])); });
      return row;
    });
    return card('Shortcut manager',
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: () => mutate((c) => c.shortcuts.items.push({ id: uid(), title: 'New site', url: 'https://example.com', icon: '', iconColor: '', bgColor: '', group: c.shortcuts.activeGroup || c.shortcuts.groups[0], pinned: false })) }, '+ Add shortcut'),
        h('button', { onclick: () => IO.download('newtab-shortcuts.json', { app: 'ultra-newtab', shortcuts: cfg.shortcuts }) }, 'Export'),
        h('button', { onclick: async () => { try { const o = await IO.pickJsonFile(); const s = o.shortcuts || o; if (!Array.isArray(s.items)) throw new Error('No shortcuts found in file'); mutate((c) => (c.shortcuts = { ...c.shortcuts, ...s })); toast(`${s.items.length} shortcuts imported`); } catch (e) { toast(e.message); } } }, 'Import')),
      h('div', { class: 'groups-edit' }, h('strong', {}, 'Groups: '), sc.groups.map((g, gi) => h('span', { class: 'gchip' + (sc.activeGroup === g ? ' on' : '') },
        h('button', { title: 'Default group', onclick: () => mutate((c) => (c.shortcuts.activeGroup = g)) }, g),
        h('button', { title: 'Rename', onclick: () => { const n = prompt('Rename group', g); if (n && !sc.groups.includes(n)) mutate((c) => { c.shortcuts.groups[gi] = n; c.shortcuts.items.forEach((i) => i.group === g && (i.group = n)); if (c.shortcuts.activeGroup === g) c.shortcuts.activeGroup = n; }); } }, '✎'),
        sc.groups.length > 1 ? h('button', { title: 'Delete group', onclick: () => { if (confirm(`Delete group “${g}”? Its shortcuts move to “${sc.groups.find((x) => x !== g)}”.`)) mutate((c) => { const to = c.shortcuts.groups.find((x) => x !== g); c.shortcuts.groups.splice(gi, 1); c.shortcuts.items.forEach((i) => i.group === g && (i.group = to)); c.shortcuts.activeGroup = to; }); } }, '✕') : null)),
        h('button', { onclick: () => { const n = prompt('New group name'); if (n && !sc.groups.includes(n)) mutate((c) => c.shortcuts.groups.push(n)); } }, '+ Group')),
      h('div', { class: 'sc-list' }, rows));
  },

  layouts: () => card('Layouts',
    h('div', { class: 'row' }, h('a', { class: 'btn primary', href: 'newtab.html#edit', target: '_blank' }, 'Open visual layout editor ↗'),
      h('button', { onclick: () => { const n = prompt('Save current layout as'); if (n) mutate((c) => (c.layouts[n] = IO.captureLayout(c))); } }, 'Save current layout…'),
      h('button', { onclick: () => { if (confirm('Reset widget positions to defaults?')) mutate((c) => IO.resetLayout(c)); } }, 'Reset layout'),
      h('button', { onclick: async () => { try { const o = await IO.pickJsonFile(); if (!o.layout?.widgets) throw new Error('Not a layout file'); mutate((c) => (c.layouts[o.name || 'Imported ' + new Date().toLocaleString()] = o.layout)); } catch (e) { toast(e.message); } } }, 'Import layout')),
    h('div', { class: 'muted small' }, 'Presets'),
    h('div', { class: 'chips' }, Object.entries(IO.LAYOUT_PRESETS).map(([n, fn]) => h('button', { class: 'preset', onclick: () => { mutate((c) => IO.applyLayout(c, fn())); toast(n + ' applied'); } }, n))),
    Object.keys(cfg.layouts).length ? h('ul', { class: 'list' }, Object.entries(cfg.layouts).map(([n, l]) => h('li', {}, h('strong', {}, n), h('span', { class: 'muted small' }, l.layoutMode),
      h('button', { onclick: () => { mutate((c) => IO.applyLayout(c, l)); toast('Layout “' + n + '” applied'); } }, 'Apply'),
      h('button', { onclick: () => { const m = prompt('Rename layout', n); if (m && m !== n) mutate((c) => { c.layouts[m] = c.layouts[n]; delete c.layouts[n]; }); } }, 'Rename'),
      h('button', { onclick: () => mutate((c) => (c.layouts[n] = IO.captureLayout(c))) }, 'Overwrite'),
      h('button', { onclick: () => IO.download(`layout-${n}.json`, { app: 'ultra-newtab', name: n, layout: l }) }, 'Export'),
      h('button', { class: 'danger', onclick: () => mutate((c) => delete c.layouts[n]) }, 'Delete')))) : h('p', { class: 'muted small' }, 'No saved layouts yet.')),

  cssTools: () => {
    const all = [cfg.customCss.global, cfg.customCss.dark, cfg.customCss.light].join('\n');
    const r = validateCss(all);
    const selectors = ['.stage', '.widget', '.widget-<id>  /  [data-widget="<id>"]', '.clock-time .clock-digits .colon .clock-ampm', '.clock-analog', '.date-text', '.greeting-text .greeting-sub', '.search-form .search-input .search-icon .search-button', '.shortcut-grid .shortcut .shortcut-icon .shortcut-title .shortcut-group', '.weather .weather-temp', '.quote .quote-text .quote-author', '.notes-area .notes-view', '.todo-list .todo', '.pomo-time', '.bg .bg-layer .bg-overlay', '.toolbar .tb-btn', '[data-mode="dark"|"light"] on <html>'];
    const vars = ['--page-background', '--surface', '--text-primary', '--text-secondary', '--text-muted', '--accent-color', '--border-color', '--border-width', '--radius', '--glass', '--glass-blur', '--shadow', '--widget-gap', '--content-width', '--content-padding', '--font', '--font-size', '--text-shadow', '--t-dur', '--t-ease', '--clock-size', '--shortcut-radius', '--search-background', '--background-blur'];
    return card('CSS workspace',
      h('div', { class: 'validate ' + (r.ok ? 'ok' : 'err') }, r.ok ? `✓ Custom CSS valid · ${r.rules} rule(s)` : '⚠ ' + r.errors.join('; ')),
      h('div', { class: 'row' },
        h('button', { onclick: () => IO.download('newtab-custom-css.json', { app: 'ultra-newtab', customCss: cfg.customCss, widgetCss: Object.fromEntries(Object.entries(cfg.widgets).map(([k, w]) => [k, w.css])) }) }, 'Export styles'),
        h('button', { onclick: async () => { try { const o = await IO.pickJsonFile(); if (!o.customCss) throw new Error('No customCss in file'); mutate((c) => { Object.assign(c.customCss, o.customCss); for (const [k, v] of Object.entries(o.widgetCss || {})) if (c.widgets[k] && typeof v === 'string') c.widgets[k].css = v; }); toast('Styles imported'); } catch (e) { toast(e.message); } } }, 'Import styles')),
      h('details', {}, h('summary', {}, 'Component selector reference'), h('ul', { class: 'ref' }, selectors.map((s) => h('li', {}, h('code', {}, s))))),
      h('details', {}, h('summary', {}, 'CSS variables'), h('ul', { class: 'ref' }, vars.map((v) => h('li', {}, h('code', {}, v), ' ', h('span', { class: 'muted' }, getComputedStyle($('#preview').contentDocument?.documentElement || document.documentElement).getPropertyValue(v).trim()))))),
      h('p', { class: 'muted small' }, 'CSS only affects the new-tab page. JavaScript is never executed. Per-widget CSS lives in each widget\'s “Advanced” group.'));
  },

  data: () => {
    const status = h('div');
    const preview = (title, next, warnings, onApply) => {
      const diff = IO.diffSummary(cfg, next).filter((d) => !d.path.startsWith('imported') && !d.path.startsWith('meta'));
      status.replaceChildren(card(title,
        warnings.length ? h('ul', { class: 'warnings' }, warnings.map((w) => h('li', {}, w))) : h('p', { class: 'ok' }, 'No warnings.'),
        h('p', {}, `${diff.length >= 60 ? '60+' : diff.length} change(s):`),
        h('ul', { class: 'diff' }, diff.map((d) => h('li', {}, h('code', {}, d.path), ' ', h('span', { class: 'muted' }, short(d.from)), ' → ', short(d.to)))),
        h('div', { class: 'row' }, h('button', { class: 'primary', onclick: async () => { await IO.pushBackup(cfg, 'Before import'); snapshot(); lastSnap = 0; await onApply(); cfg = next; await saveConfig(cfg, 0); status.replaceChildren(); toast('Imported. Previous configuration backed up.'); render(); } }, 'Apply changes'),
          h('button', { onclick: () => status.replaceChildren() }, 'Cancel'))));
    };
    const short = (v) => { const s = JSON.stringify(v); return s === undefined ? '—' : s.length > 40 ? s.slice(0, 40) + '…' : s; };
    const doImport = async () => {
      try {
        const o = await IO.pickJsonFile();
        if (IO.isBonjourr(o)) {
          const r = IO.fromBonjourr(o, structuredClone(cfg));
          preview('Bonjourr import preview', r.config, r.warnings, async () => { if (r.notesText) { const d = await getData(); d.notes = [{ id: uid(), title: 'Bonjourr', text: r.notesText }, ...(d.notes || [])]; await setData(d); } });
        } else {
          const r = IO.validateNative(o);
          preview('Import preview', r.config, r.warnings, async () => { if (r.extras.bgLibrary) await setLibrary((library = r.extras.bgLibrary)); if (r.extras.fonts) await setFonts((fonts = r.extras.fonts)); if (r.extras.widgetData) await setData(r.extras.widgetData); });
        }
      } catch (e) { toast(e.message, 5000); }
    };
    const incImg = h('input', { type: 'checkbox' }), incData = h('input', { type: 'checkbox', checked: true });
    const profBox = h('div'), backupBox = h('div');
    const drawProfiles = async () => {
      const p = await IO.listProfiles(), active = await getItem('activeProfile');
      profBox.replaceChildren(h('ul', { class: 'list' }, Object.keys(p).length ? Object.keys(p).map((n) => h('li', { class: n === active ? 'on' : '' }, h('strong', {}, n), n === active ? h('span', { class: 'tag' }, 'active') : null,
        h('button', { onclick: async () => { await IO.pushBackup(cfg, 'Before switching profile'); const cur = await getItem('activeProfile'); if (cur && p[cur]) await IO.saveProfile(cur, cfg); cfg = migrate(p[n]); await setItem('activeProfile', n); await saveConfig(cfg, 0); toast('Switched to ' + n); render(); } }, 'Switch'),
        h('button', { onclick: async () => { await IO.saveProfile(n, cfg); toast('Profile updated'); } }, 'Overwrite'),
        h('button', { onclick: async () => { const m = prompt('Duplicate as', n + ' copy'); if (m) { await IO.saveProfile(m, p[n]); drawProfiles(); } } }, 'Duplicate'),
        h('button', { onclick: async () => { const m = prompt('Rename profile', n); if (m && m !== n) { if (!(await IO.renameProfile(n, m))) toast('Name already used'); else { if (active === n) await setItem('activeProfile', m); drawProfiles(); } } } }, 'Rename'),
        h('button', { class: 'danger', onclick: async () => { if (confirm('Delete profile ' + n + '?')) { await IO.deleteProfile(n); drawProfiles(); } } }, 'Delete'))) : [h('li', { class: 'muted' }, 'No profiles saved yet.')]),
      h('button', { class: 'primary', onclick: async () => { const n = prompt('Profile name', 'Profile ' + (Object.keys(p).length + 1)); if (n) { await IO.saveProfile(n, cfg); await setItem('activeProfile', n); drawProfiles(); toast('Profile saved'); } } }, 'Save current as profile…'));
    };
    const drawBackups = async () => {
      const b = await IO.listBackups();
      backupBox.replaceChildren(b.length ? h('ul', { class: 'list' }, b.map((x) => h('li', {}, new Date(x.date).toLocaleString(), h('span', { class: 'muted small' }, x.reason),
        h('button', { onclick: async () => { await IO.pushBackup(cfg, 'Before restore'); cfg = migrate(x.config); await saveConfig(cfg, 0); toast('Configuration restored'); render(); } }, 'Restore')))) : h('p', { class: 'muted small' }, 'Backups are created automatically before imports, profile switches and resets.'));
    };
    drawProfiles(); drawBackups();
    return h('div', {},
      card('Import',
        h('p', { class: 'muted small' }, 'Accepts this extension\'s JSON or a Bonjourr settings export. You see warnings and every change before anything is applied. Unknown fields are kept, never discarded.'),
        h('button', { class: 'primary', onclick: doImport }, 'Import JSON file…')),
      status,
      card('Export',
        h('label', { class: 'inline' }, incData, ' Include notes, to-dos & widget data'), h('label', { class: 'inline' }, incImg, ' Include uploaded images & fonts (larger file)'),
        h('div', { class: 'row' }, h('button', { class: 'primary', onclick: async () => {
          const out = { app: 'ultra-newtab', exported: new Date().toISOString(), config: cfg };
          if (incData.checked) out.widgetData = await getData();
          if (incImg.checked) { out.bgLibrary = library; out.fonts = fonts; }
          IO.download(`newtab-config-${new Date().toISOString().slice(0, 10)}.json`, out);
        } }, 'Export full configuration'),
        h('button', { onclick: () => IO.download('newtab-theme.json', { app: 'ultra-newtab', category: 'appearance', values: Object.fromEntries(ALL_FIELDS.filter((f) => f.key.startsWith('theme.')).map((f) => [f.key, getPath(cfg, f.key)])) }) }, 'Export theme only'))),
      card('Profiles', profBox),
      card('Backups', backupBox),
      card('Reset', h('button', { class: 'danger', onclick: async () => { if (!confirm('Reset the entire extension to defaults? A backup is kept.')) return; await IO.pushBackup(cfg, 'Before full reset'); snapshot(); cfg = buildDefaults(); await saveConfig(cfg, 0); toast('Everything reset'); render(); } }, 'Reset everything to defaults')),
      card('Privacy', h('p', { class: 'muted small' }, 'Everything is stored locally with chrome.storage. Internet is only used by: Weather (Open-Meteo), background image URLs you add, and optional Google Fonts. Search queries go only to the engine you choose. Bookmarks permission is requested only if you enable that widget.')));
  }
};

// ---------- boot ----------
function setPreview(mode) {
  const pane = $('#previewPane'); pane.dataset.mode = mode; document.body.dataset.preview = mode; localStorage.setItem('ntPreviewMode', mode);
}
async function init() {
  [cfg, library, fonts] = await Promise.all([loadConfig(), getLibrary(), getFonts()]);
  document.body.append(h('datalist', { id: 'font-list' }, [...fonts.map((f) => f.name), ...FONT_SUGGESTIONS].map((f) => h('option', { value: f }))),
    h('datalist', { id: 'tz-list' }, timezones().map((z) => h('option', { value: z }))));
  const hash = location.hash.slice(1); if (hash && (CATEGORIES.some((c) => c.id === hash) || ['favorites', 'recent'].includes(hash))) current = hash;
  render();
  let t; $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { query = e.target.value.trim(); render(); }, 120); });
  $('#undo').onclick = undo; $('#redo').onclick = redo;
  const pm = $('#previewMode'); pm.value = localStorage.getItem('ntPreviewMode') || 'desktop'; setPreview(pm.value); pm.onchange = () => setPreview(pm.value);
  addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); }
    if (mod && e.key.toLowerCase() === 'z' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  });
  addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== current) { current = id; render(); } });
  onChange(async (ch) => {
    // pick up changes made from the new-tab page (layout editor, shortcut menu)
    if (ch.config?.newValue && JSON.stringify(ch.config.newValue) !== JSON.stringify(cfg)) { cfg = migrate(ch.config.newValue); if (!document.activeElement || !$('#panel').contains(document.activeElement)) render(); }
    if (ch.bgLibrary) library = await getLibrary();
  });
}
init();
