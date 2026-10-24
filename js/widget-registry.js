// Widget registry. A widget = metadata (settings-schema.js WIDGETS: id, name, defaults, fields)
// + a renderer registered here. To add a widget: add its metadata to WIDGETS and call registerWidget().
//
// render(el, widgetConfig, ctx) -> optional cleanup function
// ctx: { config, data, saveData(), mode, openSettings(hash), isPreview }
import { WIDGETS } from './settings-schema.js';
import { rgba, fontStack } from './theme-manager.js';
import { TEXT_SHADOWS, SHADOWS } from './settings-schema.js';

const renderers = new Map();
export function registerWidget(id, render) { renderers.set(id, render); }
export function getRenderer(id) { return renderers.get(id); }
export function listWidgets() { return WIDGETS.filter((w) => renderers.has(w.id)); }

// Applies the common, per-widget styling options.
export function styleWidget(el, w) {
  const s = el.style;
  s.setProperty('--wx', w.x + '%'); s.setProperty('--wy', w.y + '%');
  s.width = w.width ? w.width + 'px' : ''; s.height = w.height ? w.height + 'px' : '';
  s.minWidth = w.minWidth ? w.minWidth + 'px' : ''; s.maxWidth = w.maxWidth ? w.maxWidth + 'px' : '';
  s.zIndex = w.z; s.order = w.order; s.textAlign = w.align;
  s.setProperty('--w-align', { left: 'flex-start', center: 'center', right: 'flex-end' }[w.align]);
  s.fontFamily = w.fontFamily ? fontStack(w.fontFamily) : '';
  s.fontSize = w.fontSize + 'px'; s.fontWeight = w.fontWeight; s.fontStyle = w.fontStyle;
  s.lineHeight = w.lineHeight; s.letterSpacing = w.letterSpacing + 'px'; s.wordSpacing = w.wordSpacing + 'px';
  s.textTransform = w.textTransform; s.textDecoration = w.textDecoration;
  s.color = w.color || ''; s.opacity = w.opacity;
  s.textShadow = w.textShadow === 'inherit' ? '' : TEXT_SHADOWS[w.textShadow];
  s.setProperty('--w-max-text', w.maxTextWidth ? w.maxTextWidth + 'px' : 'none');
  s.whiteSpace = w.wrap === 'balance' ? 'normal' : w.wrap; s.textWrap = w.wrap === 'balance' ? 'balance' : '';
  s.overflow = w.overflow === 'ellipsis' ? 'hidden' : w.overflow; s.textOverflow = w.overflow === 'ellipsis' ? 'ellipsis' : '';
  s.background = w.bgOpacity > 0 ? rgba(w.bg, w.bgOpacity) : '';
  s.backdropFilter = w.blur ? `blur(${w.blur}px)` : '';
  s.padding = w.padding + 'px'; s.margin = w.margin + 'px';
  s.borderRadius = w.radius < 0 ? 'var(--radius)' : w.radius + 'px';
  s.border = w.borderWidth ? `${w.borderWidth}px solid ${rgba(w.borderColor, w.borderOpacity)}` : '';
  s.boxShadow = SHADOWS[w.shadow] || 'none';
  el.classList.toggle('hide-narrow', !!w.hideNarrow);
}

// Safe DOM helper: never uses innerHTML with user strings.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
