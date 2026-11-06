# Football Game — Quality & Polish Plan

## Context
Repo: `parofaro32-sketch/Footballio`, branch `kilo/bubbly-crystal-22y`. Client is a classic-script bundled game (`client/js/game.js`) using Three.js + socket.io-client. Local vs-bots mode works on Vercel but quality is poor:
- Controls feel unresponsive
- Stadium/pitch looks like 1995 (flat, no atmosphere)
- Main menu is bare; no loading screen
- Game canvas not fullscreen on start
- Player bodies render poorly (capsule blobs, no animation, blurry)

## Decisions (to be implemented)
| Area | Decision |
|------|----------|
| Controls | Keep WASD+mouse (PC) and virtual joystick+buttons (mobile), but add input deadzone smoothing, aim-assist toward ball, and visible control hints on HUD |
| Graphics | Upgrade to better lighting (hemisphere + directional + spot), add pitch grass texture pattern, net geometry, crowd stands with simple variation, post-processing bloom-ish via emissive materials, fog tuned per stadium |
| Player models | Replace capsule blobs with articulated low-poly players (separate torso/head/limbs meshes), team kit colors (shirt/shorts/socks), run animation (bob + leg swing) driven by velocity |
| Menu | Peak main menu with team name, animated background (pitch rotate), kit/weather/stadium selectors with preview, loading screen on match start |
| Fullscreen | Request fullscreen on match start (PC) / lock orientation + hide URL bar hints (mobile) |
| Render | Enable antialias, higher shadow map, PCFSoftShadowMap on PC; mobile keeps lighter preset |

## Ordered task list
1. **Controls polish** (`client/js/game.js` PCControls/MobileControls)
   - Add input smoothing/lerp so movement isn't jerky
   - Add deadzone for mobile joystick
   - Add subtle aim rotation toward ball when near it
   - Add on-screen control hint (PC: WASD/Space/Shift/E; mobile buttons already visible)
2. **Stadium graphics upgrade** (`Pitch`, `World`)
   - Grass: two-tone mowing pattern already exists; strengthen contrast + add subtle noise
   - Pitch lines: thicker, brighter, slight emissive
   - Goals: real net mesh + crossbar, net sway slightly
   - Stands: add per-row color variation, simple "seats" via small boxes, floodlight poles
   - Lighting: hemisphere light (sky/ground) + directional sun + spotlights on pitch; enable shadows on PC
   - Fog: tune per stadium (classic/night/desert)
3. **Player model + animation** (`Player`)
   - Replace single capsule with grouped parts: torso (box), head (sphere), arms, legs (separate meshes)
   - Team kit: shirt color = team color, shorts/socks contrasting
   - Run animation: torso bob (sin on time), leg swing, arm counter-swing, scaled by speed
   - Idle: tiny sway
   - Kick: leg extension when hasBall + shoot
4. **Main menu + loading screen** (`client/index.html` CSS + `client/js/game.js` UI)
   - Peak menu: dark glass panel, animated title, team name, selectors with live preview chips
   - Loading screen: full-screen overlay with spinner + "Loading match..." shown between menu and gameplay
   - Menu background: rotating pitch preview behind panel
5. **Fullscreen on start** (`startLocal`/`startOnline`)
   - PC: `canvas.requestFullscreen()` on match start
   - Mobile: `screen.orientation.lock('landscape')` where available, hide URL bar via `window.scrollTo(0,1)` on load
6. **Render preset per platform** (`World`)
   - PC: antialias true, shadow map 1024, pixel ratio min(dpr,2)
   - Mobile: antialias false, shadow map 512 or off, pixel ratio min(dpr,1.5)

## Risks
- Three.js r160 `CapsuleGeometry`/`BoxGeometry`/`SphereGeometry` available — yes
- Fullscreen API may be blocked by browsers unless triggered by user gesture — match start button click is a gesture, OK
- Mobile orientation lock not supported everywhere — guard with try/catch
- Bundle is one large file; keep class structure but no modules

## Validation steps
1. Open `http://localhost:3000` (server still runs `node server/index.js`) — menu shows, click Play Local
2. Verify canvas goes fullscreen on match start
3. Verify players have separate body parts, team colors, run animation while moving
4. Verify pitch/stands/lighting look like a stadium, not flat 1995
5. Verify controls feel smooth (no jerky input)
6. Open mobile DevTools emulation — verify joystick buttons + orientation attempt

## Open questions (none blocking)
- Whether to add a simple kick animation (leg extension) — recommended, low cost
- Whether to keep kit/weather/stadium selectors affecting local match — already wired via settings; preview on menu optional

## Implementation note
Edit `client/js/game.js` (bundled classic script), `client/index.html` (menu/loading HTML + CSS in `client/css/style.css`). No new dependencies. Do NOT change server.
