# Football Tops — React Main Menu Integration

## Context
Repo: `parofaro32-sketch/Footballio`, branch `kilo/bubbly-crystal-22y`. Client is **vanilla JavaScript** (classic `<script>` tags, no React, no build system, no JSX transform). Project uses CDN scripts (Three.js via unpkg, socket.io-client via esm.sh).

## Problem
User wants the provided React `FootballTopsMenu` component as the new main menu, replacing the existing vanilla JS menu (`<div id="menu">`). The component must connect `onPlayBots` to the existing `startLocal()` function (bot match), `onOnline` to `startOnline()`, and `onSettings` to the existing settings handler.

## Critical Decision — React Infrastructure
The project has no React/build system. To run the React component as-is (JSX), we need React + ReactDOM + a JSX transform in the browser.

**Recommended:** Add React, ReactDOM, and `@babel/standalone` via CDN script tags. Put the component in a `<script type="text/babel">` block. This runs the exact React component with zero redesign.

**Alternative:** Rewrite the component using `React.createElement` (no JSX, no Babel). Same component tree, different syntax. Smaller, faster, but not "the component" as provided.

## Files affected

### `client/index.html`
1. Add CDN script tags: React, ReactDOM, `@babel/standalone`
2. Replace `<div id="menu" class="panel">...</div>` block (lines 11-33) with `<div id="react-menu" class="panel"></div>` mount point
3. Add `<script type="text/babel">` block with `FootballTopsMenu` component + `ReactDOM.render` into `#react-menu`
4. Keep `<div id="lobby">`, `<div id="hud">`, `<div id="controlsMobile">`, `<div id="gameOver">` unchanged

### `client/js/game.js`
1. In `connect()`: after socket setup, mount React menu into `#react-menu` with:
   - `onPlayBots` → `startLocal` (existing bot match function, line ~1003)
   - `onOnline` → `startOnline` (existing online match function, line ~1020)
   - `onSettings` → settings handler (existing `menuUI.onSetting`, line ~1238)
2. Remove the old `btnCreate`, `btnJoin`, `btnStart`, `btnLeave`, `btnLocal`, `goBack` event listeners (lines ~1205-1246) — replaced by React buttons
3. Keep `showScreen('menu')` / `showScreen('game')` / `showScreen('lobby')` — React menu mounts inside `#menu` area, `showScreen('menu')` will reveal it

### `client/css/style.css`
- Keep existing loading CSS (unused but harmless)
- React component uses inline `<style>` block — no CSS file changes strictly needed
- May need to ensure `#canvas` stays behind React menu (z-index management)

## Implementation plan (ordered tasks)
1. Add React/ReactDOM/@babel/standalone CDN scripts to `client/index.html`
2. Replace `<div id="menu">...</div>` with `<div id="react-menu"></div>` mount point in `client/index.html`
3. Add `<script type="text/babel">` with `FootballTopsMenu` component + `ReactDOM.render` call in `client/index.html`
4. Update `connect()` in `client/js/game.js` to mount React menu with callbacks:
   - `onPlayBots` → `startLocal`
   - `onOnline` → `startOnline`
   - `onSettings` → settings handler
5. Remove old menu button event listeners (`btnCreate`, `btnJoin`, `btnStart`, `btnLeave`, `btnLocal`, `goBack`)
6. Run `node --check client/js/game.js` to verify syntax
7. Commit and push

## Files NOT to touch
- `client/js/game.js` gameplay code: `PCControls`, `MobileControls`, `Weather`, `Pitch`, `Ball`, `Player`, `World`, `LocalMatch`, `Netcode`, `SocketClient`, `MSG`, `HUD`, `renderLobby`, `sendInputLoop`, `loop`, `initWorld`, `requestFullscreen`
- `client/js/game.js` view functions: `showScreen`, `startLocal`, `startOnline`
- `client/css/style.css` (React component carries its own inline styles)
- All Three.js, Socket.IO, gameplay, AI, multiplayer, stadium, controls, routing code

## Validation steps
1. `node --check client/js/game.js` passes
2. Open `http://localhost:3000` — React main menu appears immediately (FOOTBALL TOPS branding, hero section, mode cards)
3. Click "PLAY AGAINST BOTS" → `startLocal()` runs → `showScreen('game')` → Three.js game opens with articulated players
4. Click "ONLINE" → `startOnline()` runs → online match flow
5. Click "SETTINGS" → settings handler invoked
6. Refresh — React menu appears again immediately
7. Browser console: no React/JSX errors

## Risks
- `@babel/standalone` is ~200KB+ and compiles JSX on the client — slower initial load, but works without build system
- `showScreen('menu')` removes `hidden` from `#react-menu` — React content will be visible since it's mounted inside
- When `showScreen('game')` is called, `#react-menu` gets `hidden` class — React app is hidden but still mounted (fine)
- The React component's inline `<style>` block is scoped to `.ft-app` — no conflict with existing CSS

## Open questions (need user decision)
**Q1: React infrastructure approach.** Use CDN + @babel/standalone to run the exact React JSX component (recommended, faithful to "use this component"), OR rewrite using React.createElement without Babel (smaller, faster, but not the component as provided)?

**Recommended:** CDN + @babel/standalone — runs the component exactly as provided.