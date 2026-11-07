# Football Tops — Remove Loading Screen

## Context
Repo: `parofaro32-sketch/Footballio`, branch `kilo/bubbly-crystal-22y`. Client is vanilla JavaScript (`client/js/game.js`, no React/build system).

## Problem
The loading screen (`#loading-screen`) is permanently stuck at 0% and has caused repeated issues across many fix attempts. User wants it removed entirely.

## Goal
Startup flow: `APP START → EXISTING MAIN MENU` (no loading screen in between).

## Files affected

### `client/index.html`
1. Remove the `<div id="loading-screen">...</div>` block (lines 10-37, including the nested `loadingError` div).
2. Remove `hidden` class from `<div id="menu" class="panel hidden">` → `<div id="menu" class="panel">` so the main menu is visible immediately on page load.

### `client/js/game.js`
1. Remove the entire `Startup` class (lines 958-1037 approximately): constructor, `show`, `hide`, `_clearTimers`, `start`.
2. Remove `var startup = null;` variable declaration.
3. In `connect()`:
   - Remove `startup = new Startup(function() { ... })` and `startup.start()`.
   - Replace with direct `showScreen('menu'); loop();` after socket setup.
   - Update the `catch` block: remove `if (startup) { startup.hide(); }`, keep `setMsg(...)`, `showScreen('menu')`, `loop()`.
4. Remove `window.__forceHideLoading__` (references `startup.hide()`).
5. Remove `setStatus` method references (already part of Startup class removal).

## Files NOT to touch
- `client/css/style.css` — loading CSS can remain (unused CSS is harmless) or be left; user said remove only necessary code.
- `client/js/game.js` gameplay code: `PCControls`, `MobileControls`, `Weather`, `Pitch`, `Ball`, `Player`, `World`, `LocalMatch`, `Netcode`, `SocketClient`, `MSG`, `Menu`, `HUD`, `renderLobby`, `showScreen`, `sendInputLoop`, `loop`, `initWorld`, `startLocal`, `startOnline`, `requestFullscreen` — all untouched.
- All Three.js, Socket.IO, gameplay, AI, multiplayer, stadium, controls, routing code — untouched.

## Implementation plan (ordered tasks)
1. Edit `client/index.html`: delete `<div id="loading-screen">...</div>` block (lines 10-37).
2. Edit `client/index.html`: change `<div id="menu" class="panel hidden">` → `<div id="menu" class="panel">`.
3. Edit `client/js/game.js`: delete `Startup` class (constructor + all prototype methods).
4. Edit `client/js/game.js`: remove `var startup = null;` declaration.
5. Edit `client/js/game.js`: in `connect()`, replace `startup = new Startup(...) + startup.start()` with direct `showScreen('menu'); loop();`.
6. Edit `client/js/game.js`: update `connect()` catch block to remove `startup.hide()` reference.
7. Edit `client/js/game.js`: remove `window.__forceHideLoading__` assignment.
8. Run `node --check client/js/game.js` to verify syntax.
9. Commit and push.

## Validation steps
1. `node --check client/js/game.js` passes.
2. Open `http://localhost:3000` (or `node server/index.js`) — main menu appears immediately, no loading screen.
3. Refresh — main menu appears immediately again.
4. Browser console: no startup errors referencing `startup` or `loading-screen`.

## Risks
- `setMsg` writes to `#msg` element inside the menu — menu must be visible for errors to show (it will be, since menu is no longer hidden).
- `showScreen('menu')` already handles removing `hidden` from menu — this is the existing, tested path.
- `loop()` starts the render loop — canvas will render even on menu screen (background pitch), which is existing behavior when menu is shown.

## Open questions
None. The user explicitly requested removing only the loading screen with no other changes.