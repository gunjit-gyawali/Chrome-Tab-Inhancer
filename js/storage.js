// Storage layer: chrome.storage.local in the extension, localStorage fallback for plain-page previews.
import { buildDefaults, SCHEMA_VERSION } from './settings-schema.js';

const ext = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
export const isExtension = !!ext;

export async function getItem(key) {
  if (ext) return (await chrome.storage.local.get(key))[key];
  const v = localStorage.getItem('nt:' + key);
  try { return v ? JSON.parse(v) : undefined; } catch { return undefined; }
}
export async function setItem(key, value) {
  if (ext) return chrome.storage.local.set({ [key]: value });
  localStorage.setItem('nt:' + key, JSON.stringify(value));
}
export async function removeItem(key) {
  if (ext) return chrome.storage.local.remove(key);
  localStorage.removeItem('nt:' + key);
}
export function onChange(cb) {
  if (ext) chrome.storage.onChanged.addListener((ch, area) => area === 'local' && cb(ch));
  else window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('nt:')) cb({ [e.key.slice(3)]: { newValue: e.newValue ? JSON.parse(e.newValue) : undefined } });
  });
}

// ---------- object helpers ----------
export const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, value) {
  const ks = path.split('.'); let o = obj;
  ks.slice(0, -1).forEach((k) => { if (!isObj(o[k])) o[k] = {}; o = o[k]; });
  o[ks[ks.length - 1]] = value;
}
// Merge stored over defaults, keeping unknown keys (never silently drop data).
export function deepMerge(base, over) {
  if (!isObj(over)) return structuredClone(base);
  const out = structuredClone(base);
  for (const k of Object.keys(over)) {
    if (isObj(out[k]) && isObj(over[k])) out[k] = deepMerge(out[k], over[k]);
    else if (over[k] !== undefined) out[k] = structuredClone(over[k]);
  }
  return out;
}

// Type-safe value coercion against the default value.
export function sanitize(value, def) {
  if (typeof def === 'number') { const n = Number(value); return Number.isFinite(n) ? n : def; }
  if (typeof def === 'boolean') return typeof value === 'boolean' ? value : value === 'true';
  if (typeof def === 'string') return value == null ? def : String(value);
  return value;
}

export function migrate(stored) {
  const defaults = buildDefaults();
  if (!isObj(stored)) return defaults;
  const cfg = structuredClone(stored);
  // v1 -> v2: shortcuts used to be an array
  if (Array.isArray(cfg.shortcuts)) cfg.shortcuts = { items: cfg.shortcuts };
  const merged = deepMerge(defaults, cfg);
  if (!Array.isArray(merged.shortcuts.items)) merged.shortcuts.items = defaults.shortcuts.items;
  merged.version = SCHEMA_VERSION;
  return merged;
}

export async function loadConfig() {
  const stored = await getItem('config');
  const cfg = migrate(stored);
  if (!stored) await setItem('config', cfg);
  return cfg;
}
let saveTimer;
export function saveConfig(cfg, delay = 120) {
  clearTimeout(saveTimer);
  return new Promise((res) => { saveTimer = setTimeout(async () => { await setItem('config', cfg); res(); }, delay); });
}

// Background library & fonts live in separate keys so config writes stay small.
export const BUILTIN_BACKGROUNDS = ['lake', 'dunes', 'forest'].map((n) => ({ id: 'builtin-' + n, name: n, src: 'assets/backgrounds/' + n + '.jpg', type: 'image', builtin: true, favorite: false, excluded: false }));
export const getLibrary = async () => (await getItem('bgLibrary')) || structuredClone(BUILTIN_BACKGROUNDS);
export const setLibrary = (list) => setItem('bgLibrary', list);
export const getFonts = async () => (await getItem('fonts')) || [];
export const setFonts = (list) => setItem('fonts', list);
export const getData = async () => (await getItem('widgetData')) || {};
export const setData = (d) => setItem('widgetData', d);
export const uid = () => Math.random().toString(36).slice(2, 10);
export function readFileAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
