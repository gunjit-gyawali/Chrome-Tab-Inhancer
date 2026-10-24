# Ultra New Tab

A local-first, deeply customizable Chrome new-tab extension. Plain HTML, CSS and vanilla JavaScript (ES modules), Manifest V3, no build step.

## Install
1. Unzip. 2. Open `chrome://extensions`. 3. Enable **Developer mode**. 4. **Load unpacked** → select this folder.

## Use
- New tab: bottom-right toolbar → next background (⟳), layout editor (✥), Settings (⚙). Right-click a shortcut for its menu. `/` focuses search, `Alt+1…9` opens shortcuts.
- Settings Studio (`settings.html`, or click the toolbar icon): searchable (Ctrl+K), favorites ☆, recently changed, per-setting reset/copy/paste, per-category reset/export/import, undo/redo, live preview.
- Layout editor: drag, resize (corner handle), arrows to nudge (Shift = 5%), Ctrl+Z / Ctrl+Y, layers, order, free/stack/grid modes, narrow preview, saved layouts.
- Profiles & data: import Bonjourr or native JSON with preview + warnings, export full/partial, profiles, automatic backups, full reset.

## Files
| File | Role |
|---|---|
| `js/settings-schema.js` | Defaults, every field definition, categories, widget metadata |
| `js/storage.js` | chrome.storage wrapper, migration (versioned schema), helpers |
| `js/app.js` | New-tab runtime |
| `js/widget-registry.js` | Registry + shared widget styling + safe DOM helper |
| `js/widgets.js` | All widget renderers |
| `js/theme-manager.js` | CSS variables, fonts, custom CSS + validation |
| `js/background-manager.js` | Background sources, rotation, filters, parallax |
| `js/layout-editor.js` | Visual layout editor |
| `js/import-export.js` | Bonjourr conversion, validation, profiles, layouts |
| `js/settings.js` | Settings Studio UI |

## Adding a widget
1. Add `{ id, name, defaults: commonDefaults({...}), fields: [...] }` to `WIDGETS` in `settings-schema.js`.
2. Call `registerWidget(id, (el, config, ctx) => { ...; return cleanup })` in `widgets.js`.
It automatically gets a settings page, search entries, every common style option and layout editor support.

## CSS variables
`--page-background --surface --text-primary --text-secondary --text-muted --accent-color --border-color --border-width --radius --glass --glass-blur --shadow --widget-gap --content-width --content-padding --font --font-size --text-shadow --t-dur --t-ease --clock-size --shortcut-radius --search-background --background-blur`, plus any tokens you define in Appearance → Tokens.
Stable selectors: `.widget`, `.widget-<id>`, `[data-widget="<id>"]`, see Custom CSS → selector reference.

## Privacy & permissions
`storage`, `unlimitedStorage` (local images/fonts), `favicon` (local site icons). `bookmarks` is optional and requested only by the Bookmarks widget.
Internet is used only by: Weather (Open-Meteo, no key), image URLs you add, optional Google Fonts. No eval, no user JavaScript; user text is never rendered as HTML (notes markdown is escaped first).
