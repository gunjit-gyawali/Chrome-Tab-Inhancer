// Visual layout editor on the new-tab page: drag, resize, layer, order, undo/redo, narrow preview.
import { h } from './widget-registry.js';
import { WIDGETS } from './settings-schema.js';
import { resetLayout, captureLayout } from './import-export.js';

export class LayoutEditor {
  constructor(stage, getConfig, update) {
    this.stage = stage; this.getConfig = getConfig; this.update = update;
    this.active = false; this.sel = null; this.undoStack = []; this.redoStack = [];
    this.onDown = this.onDown.bind(this); this.onKey = this.onKey.bind(this);
  }
  get free() { return this.getConfig().theme.layoutMode === 'free' && !this.stage.classList.contains('force-stack'); }
  toggle() { this.active ? this.disable() : this.enable(); }
  enable() {
    this.active = true; document.body.classList.add('editing');
    this.panel = h('div', { class: 'editor-panel glass', role: 'dialog', 'aria-label': 'Layout editor' }); document.body.append(this.panel);
    this.stage.addEventListener('pointerdown', this.onDown); addEventListener('keydown', this.onKey);
    this.drawPanel();
  }
  disable() {
    this.active = false; document.body.classList.remove('editing'); this.stage.classList.remove('sim-narrow');
    this.panel?.remove(); this.select(null);
    this.stage.removeEventListener('pointerdown', this.onDown); removeEventListener('keydown', this.onKey);
  }
  snapshot() { this.undoStack.push(structuredClone(this.getConfig().widgets)); if (this.undoStack.length > 80) this.undoStack.shift(); this.redoStack = []; }
  commit(fn) { this.snapshot(); this.update(fn); this.refresh(); }
  undo() { const s = this.undoStack.pop(); if (!s) return; this.redoStack.push(structuredClone(this.getConfig().widgets)); this.update((c) => (c.widgets = s)); this.refresh(); }
  redo() { const s = this.redoStack.pop(); if (!s) return; this.undoStack.push(structuredClone(this.getConfig().widgets)); this.update((c) => (c.widgets = s)); this.refresh(); }
  refresh() { requestAnimationFrame(() => { if (this.sel) this.select(this.sel); this.drawPanel(); }); }
  el(id) { return this.stage.querySelector(`[data-widget="${id}"]`); }
  select(id) {
    this.stage.querySelectorAll('.widget.selected').forEach((e) => e.classList.remove('selected'));
    this.handle?.remove(); this.sel = id;
    const el = id && this.el(id);
    if (el) { el.classList.add('selected'); this.handle = h('span', { class: 'resize-handle', title: 'Resize' }); el.append(this.handle); }
    this.drawPanel();
  }
  onDown(e) {
    const el = e.target.closest('.widget');
    if (!el) return this.select(null);
    e.preventDefault();
    const id = el.dataset.widget; if (id !== this.sel) this.select(id);
    if (!this.free && !e.target.classList.contains('resize-handle')) return;
    const r = this.stage.getBoundingClientRect(), w = this.getConfig().widgets[id];
    const start = { x: e.clientX, y: e.clientY, wx: w.x, wy: w.y, width: el.offsetWidth };
    const resizing = e.target.classList.contains('resize-handle');
    let nx = w.x, ny = w.y, nw = start.width, moved = false;
    const move = (ev) => {
      moved = true;
      if (resizing) { nw = Math.max(40, Math.round(start.width + (ev.clientX - start.x) * 2)); el.style.width = nw + 'px'; }
      else {
        const snap = ev.shiftKey ? 0.1 : 0.5;
        nx = Math.round(Math.min(100, Math.max(0, start.wx + ((ev.clientX - start.x) / r.width) * 100)) / snap) * snap;
        ny = Math.round(Math.min(100, Math.max(0, start.wy + ((ev.clientY - start.y) / r.height) * 100)) / snap) * snap;
        el.style.setProperty('--wx', nx + '%'); el.style.setProperty('--wy', ny + '%');
        this.stage.classList.toggle('guide-x', Math.abs(nx - 50) < 0.6); this.stage.classList.toggle('guide-y', Math.abs(ny - 50) < 0.6);
      }
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      this.stage.classList.remove('guide-x', 'guide-y');
      if (moved) this.commit((c) => { if (resizing) c.widgets[id].width = nw; else { c.widgets[id].x = nx; c.widgets[id].y = ny; } });
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  onKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
    if (e.key === 'Escape') return this.sel ? this.select(null) : this.disable();
    if (!this.sel || ['INPUT', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const step = e.shiftKey ? 5 : 0.5, id = this.sel;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d && this.free) { e.preventDefault(); this.commit((c) => { c.widgets[id].x = +(c.widgets[id].x + d[0]).toFixed(1); c.widgets[id].y = +(c.widgets[id].y + d[1]).toFixed(1); }); }
    if (e.key === 'Delete') this.commit((c) => (c.widgets[id].enabled = false));
  }
  drawPanel() {
    if (!this.panel) return;
    const cfg = this.getConfig(), id = this.sel, w = id && cfg.widgets[id];
    const num = (k, label, min, max, step = 1) => h('label', { class: 'ep-field' }, label, h('input', { type: 'number', min, max, step, value: w[k], onchange: (e) => this.commit((c) => (c.widgets[id][k] = +e.target.value)) }));
    const btn = (label, fn, title) => h('button', { type: 'button', onclick: fn, title: title || label }, label);
    const hidden = WIDGETS.filter((x) => !cfg.widgets[x.id].enabled);
    const addSel = h('select', { 'aria-label': 'Show hidden widget', onchange: (e) => { const v = e.target.value; if (v) this.commit((c) => (c.widgets[v].enabled = true)); } },
      h('option', { value: '' }, '+ Show widget…'), hidden.map((x) => h('option', { value: x.id }, x.name)));
    this.panel.replaceChildren(
      h('div', { class: 'ep-head' }, h('strong', {}, 'Layout editor'), h('span', { class: 'muted small' }, this.free ? 'Drag widgets · arrows nudge · Shift = fine' : 'Stacked mode: use order buttons')),
      h('div', { class: 'ep-row' }, btn('↶', () => this.undo(), 'Undo (Ctrl+Z)'), btn('↷', () => this.redo(), 'Redo (Ctrl+Y)'),
        btn(this.stage.classList.contains('sim-narrow') ? 'Desktop' : 'Narrow', () => { this.stage.classList.toggle('sim-narrow'); this.drawPanel(); }, 'Preview narrow window'),
        btn('Mode: ' + cfg.theme.layoutMode, () => this.commit((c) => (c.theme.layoutMode = { free: 'stack', stack: 'grid', grid: 'free' }[c.theme.layoutMode])), 'Switch layout mode'),
        btn('Save as…', () => { const n = prompt('Layout name'); if (n) this.update((c) => (c.layouts[n] = captureLayout(c))); }),
        btn('Reset', () => { if (confirm('Reset layout to defaults?')) this.commit((c) => resetLayout(c)); }),
        btn('Done', () => this.disable())),
      Object.keys(cfg.layouts || {}).length ? h('div', { class: 'ep-row' }, h('select', { 'aria-label': 'Saved layouts', onchange: (e) => { const l = cfg.layouts[e.target.value]; if (l) this.commit((c) => { c.theme.layoutMode = l.layoutMode; for (const [k, v] of Object.entries(l.widgets)) Object.assign(c.widgets[k], v); }); } },
        h('option', { value: '' }, 'Switch saved layout…'), Object.keys(cfg.layouts).map((n) => h('option', { value: n }, n)))) : null,
      w ? h('div', { class: 'ep-sel' },
        h('div', { class: 'ep-title' }, WIDGETS.find((x) => x.id === id).name),
        h('div', { class: 'ep-grid' }, num('x', 'X %', 0, 100, 0.5), num('y', 'Y %', 0, 100, 0.5), num('width', 'Width', 0, 2000), num('height', 'Height', 0, 2000), num('z', 'Layer', 0, 999), num('order', 'Order', -50, 50)),
        h('div', { class: 'ep-row' }, btn('Left', () => this.commit((c) => (c.widgets[id].align = 'left'))), btn('Center', () => this.commit((c) => (c.widgets[id].align = 'center'))), btn('Right', () => this.commit((c) => (c.widgets[id].align = 'right'))),
          btn('Center H', () => this.commit((c) => (c.widgets[id].x = 50))), btn('Center V', () => this.commit((c) => (c.widgets[id].y = 50)))),
        h('div', { class: 'ep-row' }, btn('Forward', () => this.commit((c) => c.widgets[id].z++)), btn('Back', () => this.commit((c) => (c.widgets[id].z = Math.max(0, c.widgets[id].z - 1)))),
          btn('Order ↑', () => this.commit((c) => c.widgets[id].order--)), btn('Order ↓', () => this.commit((c) => c.widgets[id].order++)),
          btn('Hide', () => { this.commit((c) => (c.widgets[id].enabled = false)); this.select(null); }),
          btn('Style…', () => window.open('settings.html#w-' + id, '_blank'))))
        : h('div', { class: 'muted small' }, 'Click a widget to select it.'),
      hidden.length ? addSel : null
    );
  }
}
