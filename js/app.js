// New-tab runtime: loads config before first paint, renders widgets, reacts to setting changes live.
import { loadConfig, getLibrary, getFonts, getData, setData, saveConfig, onChange, migrate } from './storage.js';
import { applyTheme, applyCustomCss, loadFonts } from './theme-manager.js';
import { BackgroundManager } from './background-manager.js';
import { listWidgets, getRenderer, styleWidget, h } from './widget-registry.js';
import { commonDefaults } from './settings-schema.js';
import { LayoutEditor } from './layout-editor.js';
import './widgets.js';

const isPreview = new URLSearchParams(location.search).has('preview');
const stage = document.getElementById('stage');
const bgm = new BackgroundManager(document.getElementById('bg'));
const COMMON_KEYS = new Set(Object.keys(commonDefaults()));
const mounted = new Map();
let config, library, fonts, data, mode, firstRender = true;

let dataTimer;
const ctx = {
  get config() { return config; }, get data() { return data; }, get mode() { return mode; }, isPreview,
  saveData() { clearTimeout(dataTimer); dataTimer = setTimeout(() => setData(data), 150); },
  updateConfig(fn) { fn(config); saveConfig(config, 0); applyAll(); },
  openSettings(hash = '') { window.open('settings.html' + (hash ? '#' + hash : ''), '_blank'); }
};

function contentKey(id, w) {
  const spec = Object.fromEntries(Object.entries(w).filter(([k]) => !COMMON_KEYS.has(k)));
  if (id === 'shortcuts') spec.__items = config.shortcuts;
  if (id === 'greeting' || id === 'clock') spec.__m = mode;
  return JSON.stringify(spec);
}

function unmount(id) {
  const m = mounted.get(id); if (!m) return;
  Promise.resolve(m.cleanup).then((fn) => typeof fn === 'function' && fn());
  m.el.remove(); mounted.delete(id);
}

function renderWidgets() {
  let i = 0;
  for (const meta of listWidgets()) {
    const w = config.widgets[meta.id];
    if (!w || !w.enabled) { unmount(meta.id); continue; }
    const key = contentKey(meta.id, w), cur = mounted.get(meta.id);
    if (cur && cur.key === key) { styleWidget(cur.el, w); continue; }
    unmount(meta.id);
    const el = h('section', { class: 'widget widget-' + meta.id, 'data-widget': meta.id, 'aria-label': meta.name });
    styleWidget(el, w);
    if (firstRender) {
      const anim = w.animation === 'inherit' ? config.theme.entrance : w.animation;
      if (anim !== 'none') { el.classList.add('enter', 'enter-' + anim); el.style.animationDelay = i++ * config.theme.entranceStagger + 'ms'; }
    }
    let cleanup;
    try { cleanup = getRenderer(meta.id)(el, w, ctx); } catch (e) { console.error('Widget failed', meta.id, e); el.append(h('span', { class: 'muted' }, meta.name + ' failed to load')); }
    stage.append(el);
    mounted.set(meta.id, { el, key, cleanup });
  }
  firstRender = false;
}

function updateNarrow() {
  const narrow = stage.clientWidth < config.theme.breakpoint;
  stage.classList.toggle('narrow', narrow);
  stage.classList.toggle('force-stack', narrow && config.theme.stackOnNarrow);
}

function toolbar() {
  let tb = document.getElementById('toolbar');
  if (isPreview || !config.theme.showToolbar) { tb?.remove(); return; }
  if (tb) return;
  const btn = (label, title, fn) => h('button', { class: 'tb-btn', title, 'aria-label': title, onclick: fn }, label);
  tb = h('nav', { id: 'toolbar', class: 'toolbar' },
    btn('⟳', 'Next background', () => bgm.next(config, library, mode)),
    btn('✥', 'Edit layout', () => editor.toggle()),
    btn('⚙', 'Settings', () => ctx.openSettings()));
  document.body.append(tb);
}

function applyAll() {
  mode = applyTheme(config);
  applyCustomCss(config, mode);
  loadFonts(config, fonts);
  bgm.apply(config, library, mode, { initial: firstRender });
  updateNarrow();
  renderWidgets();
  toolbar();
  if (editor.active) editor.drawPanel();
}

const editor = new LayoutEditor(stage, () => config, (fn) => { fn(config); saveConfig(config, 0); applyAll(); });

async function init() {
  [config, library, fonts, data] = await Promise.all([loadConfig(), getLibrary(), getFonts(), getData()]);
  applyAll();
  requestAnimationFrame(() => document.documentElement.classList.remove('loading'));
  new ResizeObserver(() => updateNarrow()).observe(stage);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAll);
  onChange(async (ch) => {
    if (ch.config?.newValue) { const next = migrate(ch.config.newValue); if (JSON.stringify(next) !== JSON.stringify(config)) { config = next; applyAll(); } }
    if (ch.bgLibrary) { library = await getLibrary(); bgm.currentSrc = null; applyAll(); }
    if (ch.fonts) { fonts = await getFonts(); applyAll(); }
    if (ch.widgetData && isPreview) { data = ch.widgetData.newValue || {}; }
  });
  if (location.hash === '#edit' && !isPreview) editor.enable();
}
init().catch((e) => { console.error(e); document.documentElement.classList.remove('loading'); });
