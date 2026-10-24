// Import/export, Bonjourr conversion, profiles, backups, saved layouts.
import { buildDefaults, SCHEMA_VERSION } from './settings-schema.js';
import { migrate, getItem, setItem, isObj, getPath, uid } from './storage.js';

export function download(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function pickJsonFile() {
  return new Promise((res, rej) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = async () => { try { res(JSON.parse(await i.files[0].text())); } catch (e) { rej(new Error('Invalid JSON: ' + e.message)); } };
    i.click();
  });
}

export const isBonjourr = (o) => isObj(o) && ('about' in o || 'dark' in o || 'searchbar' in o || 'linknewtab' in o || 'background_type' in o || Object.keys(o).some((k) => /^links[a-z0-9]{4,}/.test(k)));

// Converts a Bonjourr config to ours. Unknown fields are preserved under config.imported.bonjourr.
export function fromBonjourr(b, base = buildDefaults()) {
  const c = structuredClone(base), warn = [], used = new Set();
  const take = (k) => { used.add(k); return b[k]; };
  const W = c.widgets;
  if ('dark' in b) c.theme.mode = { enable: 'dark', disable: 'light', system: 'system', auto: 'system' }[take('dark')] || 'dark';
  const font = take('font');
  if (isObj(font)) {
    if (font.family) c.theme.fontFamily = font.family;
    if (font.size) { const s = parseFloat(font.size); if (s) c.theme.fontSize = s; }
    if (font.weight) c.theme.fontWeight = +font.weight || 400;
    if (font.system === false || font.family) c.theme.remoteFonts = !['Satisfy', ''].includes(font.family) && !!font.family;
  }
  if (typeof b.greeting === 'string') W.greeting.name = take('greeting');
  const clock = take('clock');
  if (isObj(clock)) {
    if ('ampm' in clock) W.clock.hour12 = !!clock.ampm;
    if ('seconds' in clock) W.clock.seconds = !!clock.seconds;
    if ('analog' in clock) W.clock.analog = !!clock.analog;
    if (clock.size) W.clock.fontSize = Math.round(110 * clock.size);
    if (clock.timezone && clock.timezone !== 'auto') W.clock.timezone = clock.timezone;
    if (Array.isArray(clock.worldclocks) || clock.worldclocks === true) W.worldclocks.enabled = !!clock.worldclocks;
    if (Array.isArray(clock.timezones) && clock.timezones.length) W.worldclocks.zones = clock.timezones.map((z) => `${z.region || z.timezone}|${z.timezone}`).join('\n');
  }
  if (b.dateformat) { const f = take('dateformat'); W.date.format = f === 'us' ? 'long' : f === 'cn' ? 'iso' : 'long'; }
  const sb = take('searchbar');
  if (isObj(sb)) {
    if ('on' in sb) W.search.enabled = !!sb.on;
    if (sb.engine) { const e = sb.engine.replace(/^s_/, ''); W.search.engine = { ddg: 'duckduckgo', google: 'google', bing: 'bing', brave: 'brave', startpage: 'startpage', ecosia: 'ecosia', custom: 'custom' }[e] || 'google'; }
    if (sb.request) W.search.customUrl = sb.request;
    if ('newtab' in sb) W.search.newTab = !!sb.newtab;
    if (sb.placeholder) W.search.placeholder = sb.placeholder;
    if (sb.opacity != null) W.search.inputBgOpacity = +sb.opacity;
    if (sb.width) W.search.width = Math.round(+sb.width * 8) || W.search.width;
    if (sb.suggestions) warn.push('Search suggestions are not imported: they would send keystrokes to a third party.');
  }
  // Links: v19+ store them as top-level "links<id>" objects; older versions used an array.
  let links = [];
  for (const k of Object.keys(b)) if (/^links.{4,}$/.test(k) && isObj(b[k]) && b[k].url !== undefined) { used.add(k); links.push(b[k]); }
  if (Array.isArray(b.links)) { used.add('links'); links.push(...b.links); }
  const folders = links.filter((l) => l.folder);
  links = links.filter((l) => l.url).sort((a, z) => (a.order ?? 0) - (z.order ?? 0));
  if (folders.length) warn.push(`${folders.length} link folder(s) flattened into the shortcut list.`);
  if (links.length) {
    const groups = [...new Set(links.map((l) => (typeof l.parent === 'string' && l.parent !== '' && l.parent !== 'default' ? l.parent : 'Main')))];
    const groupNames = b.linkgroups?.groups;
    c.shortcuts.groups = groups.map((g) => g);
    if (Array.isArray(groupNames)) { used.add('linkgroups'); c.shortcuts.groups = groupNames.length ? groupNames : groups; }
    c.shortcuts.items = links.map((l) => ({ id: l._id || uid(), title: l.title || l.url, url: l.url, icon: l.icon && /^(https?:|data:image)/.test(l.icon) ? l.icon : '', iconColor: '', bgColor: '', group: typeof l.parent === 'string' && l.parent !== 'default' && l.parent ? l.parent : (c.shortcuts.groups[0] || 'Main'), pinned: false }));
    if (!c.shortcuts.groups.length) c.shortcuts.groups = ['Main'];
    c.shortcuts.items.forEach((i) => { if (!c.shortcuts.groups.includes(i.group)) i.group = c.shortcuts.groups[0]; });
    c.shortcuts.activeGroup = c.shortcuts.groups[0];
  }
  if ('linknewtab' in b) W.shortcuts.newTab = !!take('linknewtab');
  if ('linktitles' in b) W.shortcuts.showTitles = !!take('linktitles');
  if (b.linkstyle) { const s = take('linkstyle'); const sz = { large: [96, 44], medium: [76, 34], small: [56, 26], inline: [120, 20], text: [90, 0] }[s]; if (sz) { W.shortcuts.tileWidth = sz[0]; W.shortcuts.tileHeight = s === 'inline' ? 44 : sz[0]; W.shortcuts.iconSize = sz[1] || 1; } }
  if (b.linksrow) W.shortcuts.columns = +take('linksrow') || 6;
  if ('quicklinks' in b) W.shortcuts.enabled = !!take('quicklinks');
  if (typeof b.textShadow === 'number') { const t = take('textShadow'); c.theme.textShadow = t <= 0 ? 'none' : t < 0.3 ? 'soft' : t < 0.6 ? 'medium' : 'strong'; }
  if (typeof b.css === 'string') c.customCss.global = take('css');
  if ('background_blur' in b) c.background.blur = +take('background_blur') || 0;
  if ('background_bright' in b) c.background.brightness = +take('background_bright');
  if (b.background_type) {
    const t = take('background_type');
    c.background.source = { color: 'color', urls: 'urls', files: 'library', local: 'library', unsplash: 'library', images: 'library', videos: 'video' }[t] || 'library';
    if (t === 'unsplash' || t === 'images') warn.push('Online image providers are replaced by the local background library (no paid APIs).');
  }
  if (typeof b.urls === 'string') { c.background.urls = take('urls'); }
  if (b.solidColor || b.background_solid) c.background.color = take(b.solidColor ? 'solidColor' : 'background_solid');
  if (b.custom_every) { const e = take('custom_every'); c.background.rotation = { tabs: 'tab', hour: 'interval', day: 'daily', period: 'interval', pause: 'manual' }[e] || 'tab'; if (e === 'hour') c.background.interval = 60; }
  const q = take('quotes');
  if (isObj(q)) { W.quotes.enabled = !!q.on; if ('author' in q) W.quotes.showAuthor = !!q.author; if (typeof q.userlist === 'string') W.quotes.custom = q.userlist.replace(/,\s*/g, ' — '); if (q.frequency) W.quotes.rotation = { tabs: 'tab', hour: 'hourly', day: 'daily' }[q.frequency] || 'tab'; }
  const n = take('notes'); let notesText = null;
  if (isObj(n)) { W.notes.enabled = !!n.on; if (n.width) W.notes.width = Math.round(+n.width * 10) || 300; if (n.align) W.notes.align = n.align; if (n.opacity != null) W.notes.bgOpacity = +n.opacity; notesText = n.text || null; }
  const wt = take('weather');
  if (isObj(wt)) { if (wt.city) W.weather.city = wt.city; if (wt.unit) W.weather.units = wt.unit === 'imperial' ? 'imperial' : 'metric'; W.weather.enabled = !!(wt.city || wt.location?.length); if (Array.isArray(wt.location) && wt.location.length === 2) { W.weather.lat = String(wt.location[0]); W.weather.lon = String(wt.location[1]); } }
  if (isObj(b.hide)) { used.add('hide'); const hd = b.hide; if (hd.clock) W.clock.enabled = false; if (hd.date) W.date.enabled = false; if (hd.greetings) W.greeting.enabled = false; if (hd.settingsicon) c.theme.showToolbar = false; if (hd.quotes) W.quotes.enabled = false; }
  else if (Array.isArray(b.hide)) { used.add('hide'); const hd = b.hide.flat(); if (hd[0] && hd[1]) W.clock.enabled = false; }
  for (const k of ['about', 'lang', 'tabtitle', 'favicon', 'time', 'review', 'showall', 'settingssync', 'syncType', 'reviewPopup', 'announcements', 'supporters']) used.add(k);
  const unknown = Object.fromEntries(Object.entries(b).filter(([k]) => !used.has(k)));
  if (Object.keys(unknown).length) warn.push(`Unsupported fields kept for reference: ${Object.keys(unknown).join(', ')}`);
  c.imported.bonjourr = { date: new Date().toISOString(), unknown, original: b };
  return { config: c, warnings: warn, notesText };
}

export function validateNative(obj) {
  const warnings = [];
  if (!isObj(obj)) throw new Error('Not a configuration object.');
  const src = obj.config && obj.app === 'ultra-newtab' ? obj.config : obj;
  if (typeof src.version !== 'number') warnings.push('No schema version found; treated as current version.');
  else if (src.version > SCHEMA_VERSION) warnings.push(`File is from a newer version (${src.version}). Unknown settings are kept.`);
  const defaults = buildDefaults(), known = new Set(Object.keys(defaults));
  const extra = Object.keys(src).filter((k) => !known.has(k));
  if (extra.length) warnings.push(`Unknown top-level fields kept: ${extra.join(', ')}`);
  // type check leaf values against defaults
  let fixed = 0;
  const walk = (d, o, path) => {
    for (const k of Object.keys(d)) {
      if (!(k in o)) continue;
      if (isObj(d[k]) && isObj(o[k])) walk(d[k], o[k], path + k + '.');
      else if (d[k] !== null && typeof d[k] !== 'object' && typeof o[k] !== typeof d[k]) { o[k] = d[k]; fixed++; }
    }
  };
  const copy = structuredClone(src); walk(defaults, copy, '');
  if (fixed) warnings.push(`${fixed} invalid value(s) replaced with safe defaults.`);
  return { config: migrate(copy), warnings, extras: { bgLibrary: obj.bgLibrary, fonts: obj.fonts, widgetData: obj.widgetData } };
}

export function diffSummary(a, b, limit = 60) {
  const out = [];
  const walk = (x, y, p) => {
    if (out.length >= limit) return;
    if (isObj(x) && isObj(y)) { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p ? p + '.' + k : k); return; }
    if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ path: p, from: x, to: y });
  };
  walk(a, b, ''); return out;
}

// ---------- profiles & backups ----------
export const listProfiles = async () => (await getItem('profiles')) || {};
export async function saveProfile(name, cfg) { const p = await listProfiles(); p[name] = structuredClone(cfg); await setItem('profiles', p); }
export async function deleteProfile(name) { const p = await listProfiles(); delete p[name]; await setItem('profiles', p); }
export async function renameProfile(from, to) { const p = await listProfiles(); if (!p[from] || p[to]) return false; p[to] = p[from]; delete p[from]; await setItem('profiles', p); return true; }
export async function pushBackup(cfg, reason) {
  const list = (await getItem('backups')) || [];
  list.unshift({ date: new Date().toISOString(), reason, config: structuredClone(cfg) });
  await setItem('backups', list.slice(0, 8));
}
export const listBackups = async () => (await getItem('backups')) || [];

// ---------- layouts ----------
const LAYOUT_KEYS = ['enabled', 'x', 'y', 'width', 'height', 'z', 'order', 'align'];
export function captureLayout(cfg) {
  return { layoutMode: cfg.theme.layoutMode, widgets: Object.fromEntries(Object.entries(cfg.widgets).map(([id, w]) => [id, Object.fromEntries(LAYOUT_KEYS.map((k) => [k, w[k]]))])) };
}
export function applyLayout(cfg, layout) {
  if (layout.layoutMode) cfg.theme.layoutMode = layout.layoutMode;
  for (const [id, v] of Object.entries(layout.widgets || {})) if (cfg.widgets[id]) Object.assign(cfg.widgets[id], v);
}
export function resetLayout(cfg) { applyLayout(cfg, captureLayout(buildDefaults())); }
export const LAYOUT_PRESETS = {
  'Centered (default)': () => captureLayout(buildDefaults()),
  'Minimal clock': () => { const l = captureLayout(buildDefaults()); for (const id in l.widgets) l.widgets[id].enabled = id === 'clock' || id === 'date'; l.widgets.clock.y = 45; l.widgets.date.y = 58; return l; },
  'Left column': () => { const l = captureLayout(buildDefaults()); ['clock', 'date', 'greeting', 'search', 'shortcuts'].forEach((id, i) => Object.assign(l.widgets[id], { x: 28, y: [28, 40, 47, 57, 72][i], align: 'left' })); return l; },
  'Productivity': () => { const l = captureLayout(buildDefaults()); Object.assign(l.widgets.notes, { enabled: true }); Object.assign(l.widgets.todo, { enabled: true }); Object.assign(l.widgets.pomodoro, { enabled: true }); Object.assign(l.widgets.focus, { enabled: true }); Object.assign(l.widgets.weather, { enabled: true }); return l; },
  'Stacked': () => ({ ...captureLayout(buildDefaults()), layoutMode: 'stack' })
};
export { getPath };
