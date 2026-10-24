// Applies theme tokens, fonts and custom CSS to the page.
import { SHADOWS, TEXT_SHADOWS, FONT_SUGGESTIONS } from './settings-schema.js';

export function rgba(hex, a = 1) {
  if (!hex || hex[0] !== '#') return hex || 'transparent';
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  const baseA = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${+(a * baseA).toFixed(3)})`;
}
export const fontStack = (f) => (f ? `"${f.replace(/"/g, '')}", system-ui, sans-serif` : 'inherit');

export function resolveMode(t) {
  if (t.mode === 'system') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return t.mode;
}
export function motionOff(t) {
  return t.disableAnimations || t.reduceMotion === 'on' || (t.reduceMotion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function applyTheme(cfg, root = document.documentElement) {
  const t = cfg.theme, mode = resolveMode(t);
  const p = t.palettes[mode] || t.palettes.dark;
  const w = cfg.widgets;
  const density = { compact: 0.7, comfortable: 1, spacious: 1.35 }[t.density] || 1;
  const vars = {
    '--page-background': p.bg, '--surface': p.surface, '--text-primary': p.text, '--text-secondary': p.text2,
    '--text-muted': p.muted, '--accent-color': p.accent, '--border-color': rgba(p.border, t.borderOpacity),
    '--border-width': t.borderWidth + 'px', '--radius': t.radius + 'px', '--glass': rgba(p.surface, t.glass),
    '--glass-blur': t.blur + 'px', '--shadow': SHADOWS[t.shadow] || 'none', '--widget-gap': t.gap * density + 'px',
    '--content-width': t.contentWidth + 'px', '--content-max-height': t.maxHeight ? t.maxHeight + 'px' : '100vh',
    '--content-padding': t.contentPadding * density + 'px', '--density': density,
    '--font': fontStack(t.fontFamily), '--font-size': t.fontSize + 'px', '--font-weight': t.fontWeight,
    '--letter-spacing': t.letterSpacing + 'px', '--line-height': t.lineHeight, '--text-shadow': TEXT_SHADOWS[t.textShadow] || 'none',
    '--t-dur': (motionOff(t) ? 0 : t.transitionMs) + 'ms', '--t-ease': t.easing,
    '--entrance-ms': (motionOff(t) ? 0 : t.entranceMs) + 'ms', '--scale': t.scale,
    '--stack-align': t.stackAlign, '--stack-justify': t.stackJustify,
    '--clock-size': w.clock.fontSize + 'px', '--shortcut-radius': w.shortcuts.tileRadius + 'px',
    '--search-background': rgba(w.search.inputBg, w.search.inputBgOpacity),
    '--background-blur': cfg.background.blur + 'px'
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  // user design tokens
  (t.tokens || '').split(/[;\n]/).forEach((line) => {
    const m = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/);
    if (m) root.style.setProperty(m[1], m[2]);
  });
  root.dataset.mode = mode;
  root.dataset.layout = t.layoutMode;
  root.classList.toggle('high-contrast', !!t.highContrast);
  root.classList.toggle('no-anim', motionOff(t));
  return mode;
}

// Builds the custom CSS text. Widget CSS is wrapped in native CSS nesting so it stays scoped.
export function buildCustomCss(cfg, mode) {
  const c = cfg.customCss; if (!c.enabled) return '';
  let css = (c.global || '') + '\n' + (c[mode] || '');
  for (const [id, w] of Object.entries(cfg.widgets)) if (w.css && w.css.trim()) css += `\n[data-widget="${id}"] {\n${w.css}\n}`;
  return css;
}
export function applyCustomCss(cfg, mode) {
  let el = document.getElementById('user-css');
  if (!el) { el = document.createElement('style'); el.id = 'user-css'; document.head.appendChild(el); }
  el.textContent = buildCustomCss(cfg, mode);
}

// Basic validation: brace balance and rules parsed by the browser.
export function validateCss(text) {
  const errors = [];
  let depth = 0, line = 1;
  for (const ch of text.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '\n') line++;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth < 0) { errors.push(`Unexpected "}" near line ${line}`); depth = 0; } }
  }
  if (depth > 0) errors.push(`${depth} unclosed "{"`);
  if (/<\s*script/i.test(text)) errors.push('Script tags are not allowed');
  let rules = 0;
  try { const sh = new CSSStyleSheet(); sh.replaceSync(text); rules = sh.cssRules.length; } catch (e) { errors.push(e.message); }
  return { ok: !errors.length, errors, rules };
}

const loadedFonts = new Set();
export async function loadFonts(cfg, fonts) {
  for (const f of fonts) {
    if (loadedFonts.has(f.name)) continue;
    try { const ff = new FontFace(f.name, `url(${f.data})`); await ff.load(); document.fonts.add(ff); loadedFonts.add(f.name); } catch (e) { console.warn('Font failed', f.name, e); }
  }
  if (cfg.theme.remoteFonts) {
    const used = new Set([cfg.theme.fontFamily, ...Object.values(cfg.widgets).map((w) => w.fontFamily)].filter(Boolean));
    const local = new Set([...FONT_SUGGESTIONS, ...fonts.map((f) => f.name)]);
    const remote = [...used].filter((f) => !local.has(f));
    let link = document.getElementById('remote-fonts');
    if (remote.length) {
      if (!link) { link = document.createElement('link'); link.id = 'remote-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
      link.href = 'https://fonts.googleapis.com/css2?' + remote.map((f) => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@100..900').join('&') + '&display=swap';
    }
  }
}
