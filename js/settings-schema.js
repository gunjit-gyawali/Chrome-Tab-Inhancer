// Settings schema: defaults + field definitions. Everything visible is driven from here.
export const SCHEMA_VERSION = 2;

export const FONT_SUGGESTIONS = [
  'Satisfy', 'system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'Verdana', 'Trebuchet MS',
  'Georgia', 'Times New Roman', 'Garamond', 'Palatino', 'Courier New', 'Consolas',
  'monospace', 'serif', 'sans-serif', 'cursive'
];

export const SHADOWS = {
  none: 'none',
  soft: '0 4px 18px rgba(0,0,0,.18)',
  medium: '0 10px 30px rgba(0,0,0,.30)',
  strong: '0 18px 50px rgba(0,0,0,.45)',
  glow: '0 0 24px var(--accent-color)'
};
export const TEXT_SHADOWS = {
  none: 'none',
  soft: '0 1px 8px rgba(0,0,0,.35)',
  medium: '0 2px 12px rgba(0,0,0,.55)',
  strong: '0 3px 18px rgba(0,0,0,.8)',
  glow: '0 0 14px var(--accent-color)'
};
const shadowOpts = Object.keys(SHADOWS);
const textShadowOpts = ['inherit', ...Object.keys(TEXT_SHADOWS)];

export const ENGINES = {
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  brave: 'https://search.brave.com/search?q=%s',
  startpage: 'https://www.startpage.com/do/search?q=%s',
  ecosia: 'https://www.ecosia.org/search?q=%s'
};

const PALETTE_DARK = { bg: '#0e1015', surface: '#151922', text: '#f4f1ea', text2: '#c9c3b8', muted: '#8a857c', accent: '#e8b86b', border: '#ffffff' };
const PALETTE_LIGHT = { bg: '#f3efe7', surface: '#ffffff', text: '#1d1b18', text2: '#4a463f', muted: '#8a857c', accent: '#b0712a', border: '#000000' };

export const THEME_PRESETS = {
  'Midnight Amber': { mode: 'dark', palettes: { dark: { ...PALETTE_DARK } }, radius: 14, glass: 0.18 },
  'Paper': { mode: 'light', palettes: { light: { ...PALETTE_LIGHT } }, radius: 10, glass: 0.6 },
  'Ocean': { mode: 'dark', palettes: { dark: { bg: '#07131c', surface: '#0d2230', text: '#e8f4fa', text2: '#a9c7d6', muted: '#6c8a99', accent: '#4fc3e8', border: '#ffffff' } }, radius: 18, glass: 0.22 },
  'Forest': { mode: 'dark', palettes: { dark: { bg: '#0c130e', surface: '#142019', text: '#eef3ea', text2: '#b6c6b0', muted: '#7c8c78', accent: '#9ccc65', border: '#ffffff' } }, radius: 12, glass: 0.2 },
  'High Contrast': { mode: 'dark', palettes: { dark: { bg: '#000000', surface: '#000000', text: '#ffffff', text2: '#ffffff', muted: '#dddddd', accent: '#ffd400', border: '#ffffff' } }, borderOpacity: 1, borderWidth: 2, glass: 0.8 }
};

// ---------- Common widget style ----------
export const commonDefaults = (d = {}) => ({
  enabled: true, x: 50, y: 50, width: 0, height: 0, minWidth: 0, maxWidth: 0, z: 1, order: 0,
  align: 'center', fontFamily: '', fontSize: 16, fontWeight: 400, fontStyle: 'normal', lineHeight: 1.35,
  letterSpacing: 0, wordSpacing: 0, textTransform: 'none', textDecoration: 'none', color: '', opacity: 1,
  textShadow: 'inherit', maxTextWidth: 0, wrap: 'normal', overflow: 'visible', bg: '#000000', bgOpacity: 0, blur: 0,
  padding: 8, margin: 0, radius: -1, borderWidth: 0, borderColor: '#ffffff', borderOpacity: 0.2, shadow: 'none',
  animation: 'inherit', hideNarrow: false, css: '', ...d
});

const C = (k, label, type, extra = {}) => ({ k, label, type, ...extra });
export const COMMON_FIELDS = [
  C('enabled', 'Visible', 'toggle', { group: 'Visibility', desc: 'Show or hide this widget' }),
  C('hideNarrow', 'Hide on narrow windows', 'toggle', { group: 'Visibility', desc: 'Hidden below the responsive breakpoint' }),
  C('x', 'Horizontal position', 'range', { group: 'Position & size', min: 0, max: 100, step: 0.5, unit: '%', desc: 'Center point as % of window width (free layout)' }),
  C('y', 'Vertical position', 'range', { group: 'Position & size', min: 0, max: 100, step: 0.5, unit: '%', desc: 'Center point as % of window height (free layout)' }),
  C('width', 'Width', 'range', { group: 'Position & size', min: 0, max: 1600, unit: 'px', desc: '0 = automatic' }),
  C('height', 'Height', 'range', { group: 'Position & size', min: 0, max: 1200, unit: 'px', desc: '0 = automatic' }),
  C('minWidth', 'Minimum width', 'range', { group: 'Position & size', min: 0, max: 1200, unit: 'px', desc: '0 = none' }),
  C('maxWidth', 'Maximum width', 'range', { group: 'Position & size', min: 0, max: 1600, unit: 'px', desc: '0 = none' }),
  C('z', 'Layer (z-index)', 'number', { group: 'Position & size', min: 0, max: 999 }),
  C('order', 'Order in stacked layout', 'number', { group: 'Position & size', min: -50, max: 50 }),
  C('align', 'Content alignment', 'select', { group: 'Position & size', options: ['left', 'center', 'right'] }),
  C('fontFamily', 'Font family', 'font', { group: 'Typography', desc: 'Empty = use global font' }),
  C('fontSize', 'Font size', 'range', { group: 'Typography', min: 6, max: 400, unit: 'px' }),
  C('fontWeight', 'Font weight', 'range', { group: 'Typography', min: 100, max: 900, step: 100 }),
  C('fontStyle', 'Font style', 'select', { group: 'Typography', options: ['normal', 'italic', 'oblique'] }),
  C('lineHeight', 'Line height', 'range', { group: 'Typography', min: 0.6, max: 3, step: 0.05 }),
  C('letterSpacing', 'Letter spacing', 'range', { group: 'Typography', min: -10, max: 40, step: 0.5, unit: 'px' }),
  C('wordSpacing', 'Word spacing', 'range', { group: 'Typography', min: -10, max: 40, step: 0.5, unit: 'px' }),
  C('textTransform', 'Text transform', 'select', { group: 'Typography', options: ['none', 'uppercase', 'lowercase', 'capitalize'] }),
  C('textDecoration', 'Text decoration', 'select', { group: 'Typography', options: ['none', 'underline', 'overline', 'line-through'] }),
  C('color', 'Text color', 'color', { group: 'Typography', allowEmpty: true, desc: 'Empty = theme text color' }),
  C('textShadow', 'Text shadow', 'select', { group: 'Typography', options: textShadowOpts }),
  C('maxTextWidth', 'Maximum text width', 'range', { group: 'Typography', min: 0, max: 1600, unit: 'px', desc: '0 = none' }),
  C('wrap', 'Wrapping', 'select', { group: 'Typography', options: ['normal', 'nowrap', 'pre-wrap', 'balance'] }),
  C('overflow', 'Overflow', 'select', { group: 'Typography', options: ['visible', 'hidden', 'auto', 'ellipsis'] }),
  C('opacity', 'Opacity', 'range', { group: 'Box', min: 0, max: 1, step: 0.01 }),
  C('bg', 'Background color', 'color', { group: 'Box' }),
  C('bgOpacity', 'Background opacity', 'range', { group: 'Box', min: 0, max: 1, step: 0.01 }),
  C('blur', 'Backdrop blur', 'range', { group: 'Box', min: 0, max: 60, unit: 'px' }),
  C('padding', 'Padding', 'range', { group: 'Box', min: 0, max: 120, unit: 'px' }),
  C('margin', 'Margin', 'range', { group: 'Box', min: 0, max: 120, unit: 'px' }),
  C('radius', 'Border radius', 'range', { group: 'Box', min: -1, max: 200, unit: 'px', desc: '-1 = use global radius' }),
  C('borderWidth', 'Border width', 'range', { group: 'Box', min: 0, max: 12, unit: 'px' }),
  C('borderColor', 'Border color', 'color', { group: 'Box' }),
  C('borderOpacity', 'Border opacity', 'range', { group: 'Box', min: 0, max: 1, step: 0.01 }),
  C('shadow', 'Box shadow', 'select', { group: 'Box', options: shadowOpts }),
  C('animation', 'Entrance animation', 'select', { group: 'Animation', options: ['inherit', 'none', 'fade', 'slide-up', 'slide-down', 'zoom'] }),
  C('css', 'Widget CSS', 'code', { group: 'Advanced', desc: 'CSS scoped to this widget (nesting supported, e.g. "& .clock-time { color: red }")' })
];

// ---------- Widget metadata ----------
export const WIDGETS = [
  { id: 'clock', name: 'Clock', defaults: commonDefaults({ y: 34, fontSize: 110, fontWeight: 400, lineHeight: 1, digitSpacing: 0, hour12: true, seconds: false, ampm: true, ampmPosition: 'after', ampmScale: 0.3, timezone: '', analog: false, analogSize: 180, analogFace: '#000000', analogFaceOpacity: 0.25, analogBorder: '#ffffff', analogBorderWidth: 3, analogHands: '#ffffff', analogSecondHand: '#e8b86b', analogTicks: true, pulse: false }),
    fields: [
      C('hour12', '12-hour format', 'toggle'), C('seconds', 'Show seconds', 'toggle'), C('ampm', 'Show AM/PM', 'toggle'),
      C('ampmPosition', 'AM/PM position', 'select', { options: ['after', 'before', 'superscript', 'below'] }),
      C('ampmScale', 'AM/PM size', 'range', { min: 0.1, max: 1, step: 0.05, unit: '×' }),
      C('digitSpacing', 'Digit spacing', 'range', { min: -20, max: 60, step: 0.5, unit: 'px' }),
      C('timezone', 'Time zone', 'timezone', { desc: 'Empty = local time. IANA name, e.g. Asia/Kathmandu' }),
      C('pulse', 'Blinking colon', 'toggle', { desc: 'Clock animation' }),
      C('analog', 'Analog clock', 'toggle', { group: 'Analog' }),
      C('analogSize', 'Analog size', 'range', { group: 'Analog', min: 60, max: 600, unit: 'px' }),
      C('analogFace', 'Face color', 'color', { group: 'Analog' }),
      C('analogFaceOpacity', 'Face opacity', 'range', { group: 'Analog', min: 0, max: 1, step: 0.01 }),
      C('analogBorder', 'Border color', 'color', { group: 'Analog' }),
      C('analogBorderWidth', 'Border width', 'range', { group: 'Analog', min: 0, max: 20, unit: 'px' }),
      C('analogHands', 'Hands color', 'color', { group: 'Analog' }),
      C('analogSecondHand', 'Second hand color', 'color', { group: 'Analog' }),
      C('analogTicks', 'Hour ticks', 'toggle', { group: 'Analog' })
    ] },
  { id: 'date', name: 'Date', defaults: commonDefaults({ y: 46, fontSize: 22, format: 'long', weekday: true, month: true, year: false, custom: 'dddd, MMMM D', timezone: '' }),
    fields: [
      C('format', 'Date format', 'select', { options: ['long', 'short', 'numeric-eu', 'numeric-us', 'iso', 'custom'] }),
      C('weekday', 'Show weekday', 'toggle'), C('month', 'Show month', 'toggle'), C('year', 'Show year', 'toggle'),
      C('custom', 'Custom format', 'text', { desc: 'Tokens: dddd ddd D DD Do MMMM MMM MM M YYYY YY' }),
      C('timezone', 'Time zone', 'timezone', { desc: 'Empty = local time' })
    ] },
  { id: 'greeting', name: 'Greeting', defaults: commonDefaults({ y: 53, fontSize: 34, name: 'Gunjit', auto: true, custom: 'Hello, {name}', morning: 'Good morning, {name}', afternoon: 'Good afternoon, {name}', evening: 'Good evening, {name}', night: 'Good night, {name}', morningStart: 5, afternoonStart: 12, eveningStart: 17, nightStart: 21, subtitle: '', dailyMessage: false, birthday: '', birthdayText: 'Happy birthday, {name}!' }),
    fields: [
      C('name', 'Your name', 'text'), C('auto', 'Time-based greeting', 'toggle'),
      C('custom', 'Custom greeting', 'text', { desc: 'Used when time-based greeting is off. {name} is replaced' }),
      C('morning', 'Morning message', 'text', { group: 'Schedule' }), C('afternoon', 'Afternoon message', 'text', { group: 'Schedule' }),
      C('evening', 'Evening message', 'text', { group: 'Schedule' }), C('night', 'Night message', 'text', { group: 'Schedule' }),
      C('morningStart', 'Morning starts (hour)', 'number', { group: 'Schedule', min: 0, max: 23 }),
      C('afternoonStart', 'Afternoon starts (hour)', 'number', { group: 'Schedule', min: 0, max: 23 }),
      C('eveningStart', 'Evening starts (hour)', 'number', { group: 'Schedule', min: 0, max: 23 }),
      C('nightStart', 'Night starts (hour)', 'number', { group: 'Schedule', min: 0, max: 23 }),
      C('subtitle', 'Subtitle', 'text'), C('dailyMessage', 'Daily message (from quotes)', 'toggle'),
      C('birthday', 'Special date (MM-DD)', 'text', { desc: 'Date-aware greeting, e.g. 04-21' }),
      C('birthdayText', 'Special date greeting', 'text')
    ] },
  { id: 'search', name: 'Search bar', defaults: commonDefaults({ y: 63, width: 560, padding: 0, fontSize: 17, engine: 'google', customUrl: 'https://www.google.com/search?q=%s', placeholder: 'Search the web', inputHeight: 50, inputPadding: 18, inputBg: '#000000', inputBgOpacity: 0.28, inputBlur: 12, inputBorderWidth: 1, inputBorderColor: '#ffffff', inputBorderOpacity: 0.18, inputRadius: 26, placeholderColor: '#ffffff', placeholderOpacity: 0.55, focusGlow: true, hoverLift: true, showIcon: true, showButton: false, showClear: true, newTab: false, history: false, focusKey: '/', autofocus: false }),
    fields: [
      C('engine', 'Search engine', 'select', { options: [...Object.keys(ENGINES), 'custom'] }),
      C('customUrl', 'Custom URL template', 'text', { desc: '%s is replaced by the query' }),
      C('placeholder', 'Placeholder', 'text'), C('autofocus', 'Focus on open', 'toggle'),
      C('focusKey', 'Focus shortcut key', 'text', { desc: 'Single key, e.g. /' }),
      C('newTab', 'Open results in new tab', 'toggle'),
      C('history', 'Local search history', 'toggle', { desc: 'Off by default. Stored only on this device' }),
      C('showIcon', 'Search icon', 'toggle'), C('showButton', 'Search button', 'toggle'), C('showClear', 'Clear button', 'toggle'),
      C('inputHeight', 'Bar height', 'range', { group: 'Bar style', min: 24, max: 120, unit: 'px' }),
      C('inputPadding', 'Input padding', 'range', { group: 'Bar style', min: 0, max: 60, unit: 'px' }),
      C('inputBg', 'Bar background', 'color', { group: 'Bar style' }),
      C('inputBgOpacity', 'Bar background opacity', 'range', { group: 'Bar style', min: 0, max: 1, step: 0.01 }),
      C('inputBlur', 'Bar backdrop blur', 'range', { group: 'Bar style', min: 0, max: 60, unit: 'px' }),
      C('inputBorderWidth', 'Bar border width', 'range', { group: 'Bar style', min: 0, max: 10, unit: 'px' }),
      C('inputBorderColor', 'Bar border color', 'color', { group: 'Bar style' }),
      C('inputBorderOpacity', 'Bar border opacity', 'range', { group: 'Bar style', min: 0, max: 1, step: 0.01 }),
      C('inputRadius', 'Bar radius', 'range', { group: 'Bar style', min: 0, max: 80, unit: 'px' }),
      C('placeholderColor', 'Placeholder color', 'color', { group: 'Bar style' }),
      C('placeholderOpacity', 'Placeholder opacity', 'range', { group: 'Bar style', min: 0, max: 1, step: 0.01 }),
      C('focusGlow', 'Focus glow', 'toggle', { group: 'Bar style' }), C('hoverLift', 'Hover lift', 'toggle', { group: 'Bar style' })
    ] },
  { id: 'shortcuts', name: 'Shortcuts', defaults: commonDefaults({ y: 78, padding: 0, fontSize: 13, columns: 7, rows: 0, tileWidth: 84, tileHeight: 84, iconSize: 38, gapX: 18, gapY: 18, tileBg: '#000000', tileBgOpacity: 0.25, tileBlur: 10, tileRadius: 18, tileBorderWidth: 1, tileBorderColor: '#ffffff', tileBorderOpacity: 0.12, iconShape: 'rounded', iconBg: '#ffffff', iconBgOpacity: 0, showTitles: true, titleAlign: 'center', titleSize: 12, hoverScale: 1.08, hoverEffect: 'lift', tileShadow: 'soft', newTab: false, keyboard: true, showGroups: true, showAdd: true }),
    fields: [
      C('columns', 'Columns', 'range', { min: 1, max: 16 }), C('rows', 'Max rows', 'range', { min: 0, max: 10, desc: '0 = unlimited' }),
      C('tileWidth', 'Tile width', 'range', { min: 24, max: 300, unit: 'px' }), C('tileHeight', 'Tile height', 'range', { min: 24, max: 300, unit: 'px' }),
      C('iconSize', 'Icon size', 'range', { min: 8, max: 160, unit: 'px' }),
      C('gapX', 'Horizontal gap', 'range', { min: 0, max: 100, unit: 'px', desc: 'Shortcut gap' }), C('gapY', 'Vertical gap', 'range', { min: 0, max: 100, unit: 'px' }),
      C('showTitles', 'Show titles', 'toggle'), C('titleSize', 'Title size', 'range', { min: 6, max: 40, unit: 'px' }),
      C('titleAlign', 'Title alignment', 'select', { options: ['left', 'center', 'right'] }),
      C('newTab', 'Open in new tab', 'toggle'), C('keyboard', 'Alt+1…9 opens shortcuts', 'toggle'),
      C('showGroups', 'Show group tabs', 'toggle'), C('showAdd', 'Show "+" add tile', 'toggle'),
      C('tileBg', 'Tile background', 'color', { group: 'Tile style' }),
      C('tileBgOpacity', 'Tile background opacity', 'range', { group: 'Tile style', min: 0, max: 1, step: 0.01 }),
      C('tileBlur', 'Tile blur', 'range', { group: 'Tile style', min: 0, max: 40, unit: 'px' }),
      C('tileRadius', 'Tile radius', 'range', { group: 'Tile style', min: 0, max: 150, unit: 'px', desc: 'Shortcut radius' }),
      C('tileBorderWidth', 'Tile border width', 'range', { group: 'Tile style', min: 0, max: 8, unit: 'px' }),
      C('tileBorderColor', 'Tile border color', 'color', { group: 'Tile style' }),
      C('tileBorderOpacity', 'Tile border opacity', 'range', { group: 'Tile style', min: 0, max: 1, step: 0.01 }),
      C('tileShadow', 'Tile shadow', 'select', { group: 'Tile style', options: shadowOpts }),
      C('iconShape', 'Icon shape', 'select', { group: 'Tile style', options: ['square', 'rounded', 'circle'] }),
      C('iconBg', 'Icon background', 'color', { group: 'Tile style' }),
      C('iconBgOpacity', 'Icon background opacity', 'range', { group: 'Tile style', min: 0, max: 1, step: 0.01 }),
      C('hoverEffect', 'Hover effect', 'select', { group: 'Tile style', options: ['none', 'lift', 'scale', 'glow', 'brighten'] }),
      C('hoverScale', 'Hover scale', 'range', { group: 'Tile style', min: 1, max: 1.5, step: 0.01, unit: '×' })
    ] },
  { id: 'weather', name: 'Weather', defaults: commonDefaults({ enabled: false, x: 90, y: 8, fontSize: 18, city: 'Kathmandu', lat: '', lon: '', units: 'metric', showDesc: true, showRange: true, refresh: 30 }),
    fields: [
      C('city', 'City', 'text', { desc: 'Uses free Open-Meteo (internet required, no API key)' }),
      C('lat', 'Latitude (optional)', 'text'), C('lon', 'Longitude (optional)', 'text'),
      C('units', 'Units', 'select', { options: ['metric', 'imperial'] }),
      C('showDesc', 'Show description', 'toggle'), C('showRange', 'Show high / low', 'toggle'),
      C('refresh', 'Refresh every (minutes)', 'range', { min: 5, max: 240 })
    ] },
  { id: 'quotes', name: 'Quotes', defaults: commonDefaults({ enabled: false, y: 92, fontSize: 15, width: 640, category: 'all', showAuthor: true, rotation: 'tab', interval: 60, custom: '', customOnly: false }),
    fields: [
      C('category', 'Category', 'select', { options: ['all', 'motivation', 'wisdom', 'focus', 'humor'] }),
      C('showAuthor', 'Show author', 'toggle'),
      C('rotation', 'Rotation', 'select', { options: ['tab', 'hourly', 'daily', 'interval'] }),
      C('interval', 'Interval (minutes)', 'range', { min: 1, max: 1440 }),
      C('custom', 'Custom quotes', 'textarea', { desc: 'One per line: Quote text — Author' }),
      C('customOnly', 'Only custom quotes', 'toggle')
    ] },
  { id: 'notes', name: 'Notes', defaults: commonDefaults({ enabled: false, x: 14, y: 50, width: 300, height: 320, padding: 14, bgOpacity: 0.3, blur: 14, fontSize: 15, fontFamily: 'system-ui', align: 'left', markdown: true }),
    fields: [C('markdown', 'Markdown preview', 'toggle', { desc: 'Notes autosave locally. Click a note to edit' })] },
  { id: 'todo', name: 'To-do list', defaults: commonDefaults({ enabled: false, x: 86, y: 50, width: 300, padding: 14, bgOpacity: 0.3, blur: 14, fontSize: 15, fontFamily: 'system-ui', align: 'left', hideDone: false, showDue: true }),
    fields: [C('hideDone', 'Hide completed', 'toggle'), C('showDue', 'Show due dates', 'toggle')] },
  { id: 'pomodoro', name: 'Pomodoro', defaults: commonDefaults({ enabled: false, x: 86, y: 18, width: 220, padding: 14, bgOpacity: 0.3, blur: 14, fontSize: 15, fontFamily: 'system-ui', work: 25, short: 5, long: 15, longEvery: 4, sound: true, volume: 0.5, focusMode: false }),
    fields: [
      C('work', 'Work minutes', 'range', { min: 1, max: 120 }), C('short', 'Short break minutes', 'range', { min: 1, max: 60 }),
      C('long', 'Long break minutes', 'range', { min: 1, max: 90 }), C('longEvery', 'Long break every N sessions', 'range', { min: 2, max: 10 }),
      C('sound', 'Sound when done', 'toggle'), C('volume', 'Volume', 'range', { min: 0, max: 1, step: 0.05 }),
      C('focusMode', 'Focus mode', 'toggle', { desc: 'Dims other widgets while a work session runs' })
    ] },
  { id: 'countdown', name: 'Countdown', defaults: commonDefaults({ enabled: false, x: 14, y: 14, fontSize: 15, fontFamily: 'system-ui', align: 'left', items: 'New Year|2027-01-01', showHours: false }),
    fields: [C('items', 'Countdowns', 'textarea', { desc: 'One per line: Label|YYYY-MM-DD or Label|YYYY-MM-DDTHH:MM' }), C('showHours', 'Show hours', 'toggle')] },
  { id: 'customText', name: 'Custom text', defaults: commonDefaults({ enabled: false, y: 20, fontSize: 18, text: 'Stay curious.' }),
    fields: [C('text', 'Text', 'textarea', { desc: 'Plain text. Line breaks kept. HTML is not executed' })] },
  { id: 'worldclocks', name: 'World clocks', defaults: commonDefaults({ enabled: false, x: 50, y: 8, fontSize: 14, fontFamily: 'system-ui', zones: 'London|Europe/London\nNew York|America/New_York\nTokyo|Asia/Tokyo', hour12: false, layout: 'row' }),
    fields: [C('zones', 'Clocks', 'textarea', { desc: 'One per line: Label|IANA zone' }), C('hour12', '12-hour', 'toggle'), C('layout', 'Layout', 'select', { options: ['row', 'column'] })] },
  { id: 'focus', name: 'Daily focus', defaults: commonDefaults({ enabled: false, y: 88, fontSize: 18, prompt: 'What is your main focus today?' }),
    fields: [C('prompt', 'Prompt', 'text')] },
  { id: 'calendar', name: 'Calendar', defaults: commonDefaults({ enabled: false, x: 14, y: 80, width: 240, padding: 12, bgOpacity: 0.3, blur: 14, fontSize: 13, fontFamily: 'system-ui', weekStart: 1 }),
    fields: [C('weekStart', 'Week starts on', 'select', { options: [{ v: 0, l: 'Sunday' }, { v: 1, l: 'Monday' }] })] },
  { id: 'bookmarks', name: 'Bookmarks', defaults: commonDefaults({ enabled: false, x: 14, y: 30, width: 260, padding: 12, bgOpacity: 0.3, blur: 14, fontSize: 13, fontFamily: 'system-ui', align: 'left', max: 15 }),
    fields: [C('max', 'Max items', 'range', { min: 1, max: 100, desc: 'Shows your bookmarks bar. Asks for bookmark permission' })] },
  { id: 'battery', name: 'Battery', defaults: commonDefaults({ enabled: false, x: 96, y: 96, fontSize: 13, fontFamily: 'system-ui' }), fields: [] }
];

// ---------- Defaults ----------
const DEFAULT_SHORTCUTS = [
  ['YouTube', 'https://www.youtube.com'], ['Facebook', 'https://www.facebook.com'], ['Instagram', 'https://www.instagram.com'],
  ['GitHub', 'https://github.com'], ['Slack', 'https://app.slack.com'], ['Gmail', 'https://mail.google.com']
].map(([title, url], i) => ({ id: 's' + i, title, url, icon: '', iconColor: '', bgColor: '', group: 'Main', pinned: false }));

export function buildDefaults() {
  const widgets = {};
  WIDGETS.forEach((w) => (widgets[w.id] = structuredClone(w.defaults)));
  return {
    version: SCHEMA_VERSION,
    theme: {
      mode: 'dark', palettes: { dark: { ...PALETTE_DARK }, light: { ...PALETTE_LIGHT }, custom: { ...PALETTE_DARK } },
      radius: 14, glass: 0.18, blur: 14, borderWidth: 1, borderOpacity: 0.12, shadow: 'soft', scale: 1,
      contentWidth: 900, maxHeight: 0, contentPadding: 24, gap: 24, density: 'comfortable', highContrast: false,
      layoutMode: 'free', stackAlign: 'center', stackJustify: 'center', stackOnNarrow: true, breakpoint: 720,
      fontFamily: 'Satisfy', fontSize: 16, fontWeight: 400, letterSpacing: 0, lineHeight: 1.3, textShadow: 'soft', remoteFonts: false,
      transitionMs: 200, easing: 'ease', entrance: 'fade', entranceMs: 600, entranceStagger: 60, disableAnimations: false, reduceMotion: 'system',
      showToolbar: true, tokens: ''
    },
    background: {
      source: 'library', color: '#0e1015', gradA: '#1b2236', gradB: '#0b0d12', gradC: '', angle: 160, radialPos: 'center',
      urls: '', videoUrl: '', collection: '', rotation: 'tab', interval: 30, shuffle: true, paused: false, favoritesOnly: false,
      brightness: 0.85, contrast: 1, saturation: 1, blur: 0, grayscale: 0, sepia: 0, hue: 0, opacity: 1,
      overlayColor: '#000000', overlayOpacity: 0.15, overlayGradient: false, overlayGradA: '#000000', overlayGradB: '#00000000', overlayAngle: 180,
      size: 'cover', posX: 50, posY: 50, fadeMs: 500, parallax: false, parallaxStrength: 20, perTheme: false, lightSource: 'library', lightColor: '#f3efe7'
    },
    widgets,
    shortcuts: { items: DEFAULT_SHORTCUTS, groups: ['Main'], activeGroup: 'Main' },
    customCss: { enabled: true, global: '', dark: '', light: '' },
    layouts: {},
    meta: { favorites: [], recent: [] },
    imported: {}
  };
}

// ---------- Categories ----------
const P = (prefix, list) => list.map((f) => ({ ...f, key: prefix + f.k }));
const palette = (m) => P(`theme.palettes.${m}.`, [
  C('bg', 'Page background', 'color', { group: `${m} palette` }), C('surface', 'Surface color', 'color', { group: `${m} palette` }),
  C('text', 'Primary text', 'color', { group: `${m} palette` }), C('text2', 'Secondary text', 'color', { group: `${m} palette` }),
  C('muted', 'Muted text', 'color', { group: `${m} palette` }), C('accent', 'Accent color', 'color', { group: `${m} palette` }),
  C('border', 'Border color', 'color', { group: `${m} palette` })
]);

export const CATEGORIES = [
  { id: 'appearance', name: 'Appearance', icon: '◐', custom: 'presets', fields: [
    ...P('theme.', [
      C('mode', 'Theme mode', 'select', { group: 'Theme', options: ['dark', 'light', 'system', 'custom'] }),
      C('highContrast', 'High-contrast mode', 'toggle', { group: 'Theme' }),
      C('radius', 'Global border radius', 'range', { group: 'Surfaces', min: 0, max: 60, unit: 'px' }),
      C('glass', 'Glass surface opacity', 'range', { group: 'Surfaces', min: 0, max: 1, step: 0.01, desc: 'Glassmorphism transparency' }),
      C('blur', 'Glass blur strength', 'range', { group: 'Surfaces', min: 0, max: 60, unit: 'px' }),
      C('borderWidth', 'Global border width', 'range', { group: 'Surfaces', min: 0, max: 8, unit: 'px' }),
      C('borderOpacity', 'Border / divider opacity', 'range', { group: 'Surfaces', min: 0, max: 1, step: 0.01 }),
      C('shadow', 'Global shadow', 'select', { group: 'Surfaces', options: shadowOpts }),
      C('scale', 'Interface scale', 'range', { group: 'Page', min: 0.5, max: 2, step: 0.05, unit: '×' }),
      C('contentWidth', 'Content width', 'range', { group: 'Page', min: 300, max: 2400, unit: 'px', desc: 'Used by stacked layout' }),
      C('maxHeight', 'Content max height', 'range', { group: 'Page', min: 0, max: 2000, unit: 'px', desc: '0 = full height' }),
      C('contentPadding', 'Page padding', 'range', { group: 'Page', min: 0, max: 200, unit: 'px' }),
      C('gap', 'Global widget gap', 'range', { group: 'Page', min: 0, max: 120, unit: 'px' }),
      C('density', 'Content density', 'select', { group: 'Page', options: ['compact', 'comfortable', 'spacious'] }),
      C('showToolbar', 'Show corner toolbar', 'toggle', { group: 'Page', desc: 'Settings, layout editor and background buttons' }),
      C('tokens', 'Custom design tokens', 'code', { group: 'Tokens', desc: 'One per line: --my-token: value; available everywhere as var(--my-token)' })
    ]), ...palette('dark'), ...palette('light'), ...palette('custom')
  ] },
  { id: 'typography', name: 'Typography', icon: 'Aa', custom: 'fonts', fields: P('theme.', [
    C('fontFamily', 'Global font', 'font'), C('fontSize', 'Base font size', 'range', { min: 8, max: 40, unit: 'px' }),
    C('fontWeight', 'Base font weight', 'range', { min: 100, max: 900, step: 100 }),
    C('letterSpacing', 'Base letter spacing', 'range', { min: -5, max: 20, step: 0.5, unit: 'px' }),
    C('lineHeight', 'Base line height', 'range', { min: 0.8, max: 2.5, step: 0.05 }),
    C('textShadow', 'Global text shadow', 'select', { options: Object.keys(TEXT_SHADOWS) }),
    C('remoteFonts', 'Load fonts from Google Fonts', 'toggle', { desc: 'Optional, needs internet. Off = local & system fonts only' })
  ]) },
  { id: 'background', name: 'Background', icon: '▣', custom: 'library', fields: P('background.', [
    C('source', 'Background source', 'select', { group: 'Source', options: ['color', 'linear', 'radial', 'library', 'urls', 'video'] }),
    C('color', 'Solid color', 'color', { group: 'Source' }),
    C('gradA', 'Gradient color 1', 'color', { group: 'Source' }), C('gradB', 'Gradient color 2', 'color', { group: 'Source' }),
    C('gradC', 'Gradient color 3', 'color', { group: 'Source', allowEmpty: true }),
    C('angle', 'Gradient angle', 'range', { group: 'Source', min: 0, max: 360, unit: '°' }),
    C('radialPos', 'Radial center', 'select', { group: 'Source', options: ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'] }),
    C('urls', 'Image URLs', 'textarea', { group: 'Source', desc: 'One URL per line (internet required)' }),
    C('videoUrl', 'Video URL', 'text', { group: 'Source', desc: 'Or upload videos to the library' }),
    C('perTheme', 'Different background in light mode', 'toggle', { group: 'Source' }),
    C('lightSource', 'Light mode source', 'select', { group: 'Source', options: ['color', 'linear', 'library', 'urls'] }),
    C('lightColor', 'Light mode color', 'color', { group: 'Source' }),
    C('rotation', 'Rotation', 'select', { group: 'Behavior', options: ['tab', 'interval', 'daily', 'manual'] }),
    C('interval', 'Rotation interval (minutes)', 'range', { group: 'Behavior', min: 1, max: 1440 }),
    C('shuffle', 'Shuffle', 'toggle', { group: 'Behavior' }), C('paused', 'Pause rotation', 'toggle', { group: 'Behavior' }),
    C('favoritesOnly', 'Favorites only', 'toggle', { group: 'Behavior' }),
    C('fadeMs', 'Fade-in duration', 'range', { group: 'Behavior', min: 0, max: 3000, step: 50, unit: 'ms' }),
    C('brightness', 'Brightness', 'range', { group: 'Adjustments', min: 0, max: 2, step: 0.01 }),
    C('contrast', 'Contrast', 'range', { group: 'Adjustments', min: 0, max: 2, step: 0.01 }),
    C('saturation', 'Saturation', 'range', { group: 'Adjustments', min: 0, max: 3, step: 0.01 }),
    C('blur', 'Background blur', 'range', { group: 'Adjustments', min: 0, max: 60, unit: 'px' }),
    C('grayscale', 'Grayscale', 'range', { group: 'Adjustments', min: 0, max: 1, step: 0.01 }),
    C('sepia', 'Sepia', 'range', { group: 'Adjustments', min: 0, max: 1, step: 0.01 }),
    C('hue', 'Hue rotation', 'range', { group: 'Adjustments', min: 0, max: 360, unit: '°' }),
    C('opacity', 'Image opacity', 'range', { group: 'Adjustments', min: 0, max: 1, step: 0.01 }),
    C('overlayColor', 'Tint / overlay color', 'color', { group: 'Overlay' }),
    C('overlayOpacity', 'Overlay opacity', 'range', { group: 'Overlay', min: 0, max: 1, step: 0.01 }),
    C('overlayGradient', 'Gradient overlay', 'toggle', { group: 'Overlay' }),
    C('overlayGradA', 'Overlay gradient start', 'color', { group: 'Overlay' }), C('overlayGradB', 'Overlay gradient end', 'color', { group: 'Overlay' }),
    C('overlayAngle', 'Overlay gradient angle', 'range', { group: 'Overlay', min: 0, max: 360, unit: '°' }),
    C('size', 'Scaling', 'select', { group: 'Framing', options: ['cover', 'contain', 'auto', '100% 100%'] }),
    C('posX', 'Focal point X', 'range', { group: 'Framing', min: 0, max: 100, unit: '%' }),
    C('posY', 'Focal point Y', 'range', { group: 'Framing', min: 0, max: 100, unit: '%' }),
    C('parallax', 'Parallax effect', 'toggle', { group: 'Framing' }),
    C('parallaxStrength', 'Parallax strength', 'range', { group: 'Framing', min: 2, max: 80, unit: 'px' })
  ]) },
  { id: 'layout', name: 'Layout', icon: '⊞', custom: 'layouts', fields: P('theme.', [
    C('layoutMode', 'Layout mode', 'select', { options: ['free', 'stack', 'grid'], desc: 'Free = drag anywhere. Stack = flex column. Grid = auto grid' }),
    C('stackAlign', 'Stack horizontal alignment', 'select', { options: ['flex-start', 'center', 'flex-end'] }),
    C('stackJustify', 'Stack vertical alignment', 'select', { options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-evenly'] }),
    C('stackOnNarrow', 'Stack widgets on narrow windows', 'toggle'),
    C('breakpoint', 'Responsive breakpoint', 'range', { min: 320, max: 1600, unit: 'px' })
  ]) },
  { id: 'animation', name: 'Animation', icon: '≈', fields: P('theme.', [
    C('disableAnimations', 'Disable all animations', 'toggle'),
    C('reduceMotion', 'Reduced motion', 'select', { options: ['system', 'on', 'off'] }),
    C('transitionMs', 'Transition duration', 'range', { min: 0, max: 2000, step: 10, unit: 'ms', desc: 'Hover, focus and settings transitions' }),
    C('easing', 'Easing', 'select', { options: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(.2,.8,.2,1)', 'cubic-bezier(.34,1.56,.64,1)'] }),
    C('entrance', 'Widget entrance', 'select', { options: ['none', 'fade', 'slide-up', 'slide-down', 'zoom'] }),
    C('entranceMs', 'Entrance duration', 'range', { min: 0, max: 3000, step: 50, unit: 'ms' }),
    C('entranceStagger', 'Entrance stagger', 'range', { min: 0, max: 500, step: 10, unit: 'ms' })
  ]) },
  ...WIDGETS.map((w) => ({
    id: 'w-' + w.id, name: w.name, icon: '◇', widget: w.id, custom: w.id === 'shortcuts' ? 'shortcutManager' : null,
    fields: [...P(`widgets.${w.id}.`, w.fields.map((f) => ({ group: w.name, ...f }))), ...P(`widgets.${w.id}.`, COMMON_FIELDS)]
  })),
  { id: 'css', name: 'Custom CSS', icon: '{}', custom: 'cssTools', fields: P('customCss.', [
    C('enabled', 'Enable custom CSS', 'toggle'),
    C('global', 'Global CSS', 'code', { desc: 'Applies to the new-tab page only' }),
    C('dark', 'Dark theme CSS', 'code'), C('light', 'Light theme CSS', 'code')
  ]) },
  { id: 'data', name: 'Profiles & data', icon: '⇅', custom: 'data', fields: [] }
];

export const ALL_FIELDS = CATEGORIES.flatMap((c) => c.fields.map((f) => ({ ...f, cat: c.id, catName: c.name })));
