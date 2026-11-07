# Football Tops — Loading Screen 0% Fix Plan

## Context
Repo: `parofaro32-sketch/Footballio`, branch `kilo/bubbly-crystal-22y`. Client is vanilla JavaScript (classic `<script>` tags, no React, no build system). The loading screen HTML exists in `client/index.html`, CSS in `client/css/style.css`, and JS logic in `client/js/game.js` (`Startup` class).

## Problem
The loading screen progress is permanently stuck at 0%. The current `Startup.start()` uses `setInterval` at 400ms for all steps. The user wants the exact logic from their React component translated to vanilla JS:
- Steps: 10 → 25 → 40 → 55 → 70 → 85 → 100
- Recursive `setTimeout` (not `setInterval`)
- 350ms between steps, 300ms at 100% before `onComplete`
- `completedRef` equivalent to ensure `onComplete` fires exactly once
- Async start: `setTimeout(advance, 100)` after mount

## Files affected (only)
- `client/js/game.js` — `Startup` class `start()` method and constructor

## Files NOT to touch
- `client/index.html` — loading HTML stays as-is
- `client/css/style.css` — loading CSS stays as-is
- All gameplay, Three.js, Socket.IO, multiplayer, AI, menu, routing files — untouched

## Implementation plan

### 1. Update `Startup` constructor (`client/js/game.js:958-982`)
Replace constructor body to match React component structure:
- Add `this._completedRef = false` equivalent (boolean flag)
- Add `this._cancelled = false`
- Add `this._startTimeout = null`
- Keep existing element refs (`el`, `statusEl`, `progressEl`, `pctEl`, `onComplete`)
- Remove `_interval`, `_timeout`, `_started` (replaced by `_cancelled` and recursive timeout pattern)
- Call `this.show()` then async-start via `setTimeout(advance, 100)`

### 2. Replace `Startup.prototype.start` (`client/js/game.js:1013-1031`)
Replace `setInterval`-based logic with recursive `setTimeout` matching React component exactly:

```
steps = [[10, "Initializing Football Tops..."], [25, "Starting game engine..."], [40, "Loading game systems..."], [55, "Preparing players..."], [70, "Preparing football..."], [85, "Preparing stadium..."], [100, "Ready!"]]
stepIndex = 0
advance() {
  if (cancelled) return
  if (stepIndex >= steps.length) {
    if (!completedRef) {
      completedRef = true
      setTimeout(() => { if (!cancelled) onComplete() }, 300)
    }
    return
  }
  [nextProgress, nextStatus] = steps[stepIndex]
  stepIndex += 1
  setProgress(nextProgress)
  setStatus(nextStatus)
  if (nextProgress < 100) setTimeout(advance, 350)
  else setTimeout(advance, 300)
}
startTimer = setTimeout(advance, 100)
return () => { cancelled = true; clearTimeout(startTimer) }
```

### 3. Preserve existing integration
`connect()` creates `startup = new Startup(onComplete)` where `onComplete` calls `showScreen('menu')` and `loop()`. This stays unchanged.

### 4. Validation
- `node --check client/js/game.js` — no syntax errors
- Progress visibly changes: 0% → 10% → 25% → 40% → 55% → 70% → 85% → 100%
- At 100%: `onComplete()` fires once → main menu appears
- No errors in browser console

## Risks
- Project is vanilla JS, not React — must translate React hooks (`useRef`, `useState`, `useEffect`) to vanilla JS equivalents (instance properties, closures)
- Element references (`loadingStatus`, `loadingBarFill`, `loadingPct`) must exist in DOM at construction time — they do in `client/index.html`

## Open questions
None. The user provided exact code and wants it applied with minimal changes.