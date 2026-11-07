# Football Tops — React Main Menu Integration (COMPLETE)

## Status
**Complete and pushed** — commit `05c5508` on `kilo/bubbly-crystal-22y` at `https://github.com/parofaro32-sketch/Footballio.git`.

## Summary
Replaced the vanilla JS main menu with the provided React `FootballTopsMenu` component, connected to the existing game-start functions.

## Files changed (3 files)

### `client/index.html`
- Added CDN scripts: React 18, ReactDOM 18, @babel/standalone
- Replaced `<div id="menu" class="panel">...</div>` with `<div id="react-menu" class="panel"></div>` mount point
- Added `<script type="text/babel">` block containing the exact `FootballTopsMenu` component (unchanged JSX) + `ReactDOM.render` into `#react-menu`
- Component callbacks: `onPlayBots: window.__startLocal__`, `onOnline: window.__startOnline__`, `onSettings: window.__onSettings__`

### `client/js/game.js`
- Removed `var menuUI = new Menu();`
- Added `window.__startOnline__ = startOnline;` (exposes existing online match function)
- Added `window.__onSettings__` handler (wraps existing `socket.setSetting` + `world.setSettings`)
- Removed all old menu button event listeners (`btnCreate`, `btnJoin`, `btnStart`, `btnLeave`, `goBack`, `btnLocal`) and `menuUI.onSetting/onSetName/onSetTeam` assignments
- Kept `showScreen('menu')` and `loop()` — React menu mounts inside `#react-menu`, `showScreen('menu')` reveals it
- `window.__startLocal__ = startLocal;` was already exposed

### `client/css/style.css`
- Unchanged — React component carries its own inline `<style>` block

## Startup flow
```
APP START → React FootballTopsMenu (via text/babel)
    → user clicks "PLAY AGAINST BOTS" → onPlayBots → startLocal() → showScreen('game') → Three.js match
    → user clicks "ONLINE" → onOnline → startOnline() → online match
    → user clicks "SETTINGS" → onSettings → socket.setSetting + world.setSettings
```

## Verification
- `node --check client/js/game.js` — passes (no syntax errors)
- All gameplay, Three.js, Socket.IO, AI, controls, stadium, routing code untouched
- Working tree clean, branch up to date with origin