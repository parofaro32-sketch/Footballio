import * as THREE from 'three';
import { PCControls } from './controls/pcControls.js';
import { MobileControls } from './controls/mobileControls.js';
import { controlScheme, isMobile, isPC, setPreferredScheme } from './platform.js';
import { SocketClient } from './networking/socket.js';
import { Netcode } from './networking/netcode.js';
import { World } from './game/world.js';
import { LocalMatch } from './game/local.js';
import { Menu } from './ui/menu.js';
import { HUD } from './ui/hud.js';
import { MSG } from '/shared/protocol.js';

const canvas = document.getElementById('canvas');
const msgEl = document.getElementById('msg');

let scheme = controlScheme();
const selPlatform = document.getElementById('inpPlatform');
if (selPlatform) selPlatform.value = scheme;
if (isMobile()) {
  const cm = document.getElementById('controlsMobile');
  if (cm) cm.classList.remove('hidden');
}

let world = null;
let controls = null;
let socket = null;
let netcode = null;
let hud = null;
let localMatch = null;

let localPlayerId = null;
let localTeam = null;
let localName = 'Player';
let lastInputTime = 0;
const INPUT_INTERVAL = 1000 / 30;

let gameState = 'lobby';
let mode = null;

const menuEl = document.getElementById('menu');
const lobbyEl = document.getElementById('lobby');
const gameOverEl = document.getElementById('gameOver');

function setMsg(text) {
  if (msgEl) msgEl.textContent = text || '';
  if (text) console.error(text);
}

function initWorld(settings) {
  if (world) { try { world.dispose(); } catch (e) {} }
  world = new World(canvas, settings);
  netcode = new Netcode();
  hud = new HUD();
  if (!controls) {
    if (isMobile()) controls = new MobileControls(canvas);
    else { controls = new PCControls(); controls.enable(canvas); }
  }
}

function startLocal() {
  try {
    setMsg('');
    mode = 'local';
    gameState = 'playing';
    initWorld({ weather: 'clear', stadium: 'classic' });
    localMatch = new LocalMatch(world, controls);
    localMatch.start();
    showScreen('game');
  } catch (e) {
    setMsg('Local match failed: ' + (e && e.message ? e.message : String(e)));
  }
}

function startOnline() {
  try {
    mode = 'online';
    gameState = 'playing';
    if (hud) hud.show();
    if (isMobile()) {
      const cm = document.getElementById('controlsMobile');
      if (cm) cm.classList.remove('hidden');
    }
    showScreen('game');
  } catch (e) {
    setMsg('Online start failed: ' + (e && e.message ? e.message : String(e)));
  }
}

function renderLobby(summary) {
  try {
    const title = document.getElementById('lobbyTitle');
    if (title) title.textContent = 'Lobby - ' + (summary && summary.name || '');
    const list = document.getElementById('lobbyPlayers');
    if (list) {
      list.innerHTML = '';
      if (summary && summary.clients) {
        for (const c of summary.clients) {
          const d = document.createElement('div');
          d.textContent = c.name + ' - ' + c.team + (c.id === localPlayerId ? ' (you)' : '');
          list.appendChild(d);
        }
      }
    }
    const settingsEl = document.getElementById('lobbySettings');
    if (settingsEl && summary && summary.settings) {
      const s = summary.settings;
      settingsEl.innerHTML = 'Weather: ' + s.weather + ' &nbsp;|&nbsp; Stadium: ' + s.stadium + ' &nbsp;|&nbsp; Kit: ' + (s.kit || 'home');
    }
    const btnStart = document.getElementById('btnStart');
    if (btnStart) btnStart.disabled = !(localPlayerId && summary && summary.clients && summary.clients.length >= 2);
  } catch (e) { setMsg('renderLobby error: ' + String(e)); }
}

function showScreen(name) {
  try {
    [menuEl, lobbyEl, gameOverEl].forEach(function(el) { if (el) el.classList.add('hidden'); });
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.classList.add('hidden');
    const cm = document.getElementById('controlsMobile');
    if (cm) cm.classList.add('hidden');
    if (name === 'menu') { if (menuEl) menuEl.classList.remove('hidden'); }
    if (name === 'lobby') { if (lobbyEl) lobbyEl.classList.remove('hidden'); }
    if (name === 'game') {
      if (hudEl) hudEl.classList.remove('hidden');
      if (isMobile()) { if (cm) cm.classList.remove('hidden'); }
    }
    if (name === 'gameover') { if (gameOverEl) gameOverEl.classList.remove('hidden'); }
  } catch (e) { setMsg('showScreen error: ' + String(e)); }
}

function sendInputLoop() {
  try {
    if (!controls || gameState !== 'playing') return;
    const now = Date.now();
    if (now - lastInputTime < INPUT_INTERVAL) return;
    lastInputTime = now;

    if (mode === 'local') {
      if (!localMatch) return;
      localMatch.update();
      if (world) world.update(0);
      if (world) world.render();
      return;
    }

    if (!socket || !socket.connected()) return;
    const input = controls.update();
    if (netcode) netcode.setLocalPlayerId(localPlayerId);
    const packed = netcode ? netcode.makeInput(input.x, input.z, input) : input;
    if (socket) socket.sendInput(packed);
    applyLocalInput(input);
  } catch (e) { setMsg('input loop error: ' + String(e)); }
}

function applyLocalInput(input) {
  try {
    if (!localMatch || !world) return;
    // LocalMatch handles its own input; nothing to apply to world here
  } catch (e) {}
}

function loop() {
  requestAnimationFrame(loop);
  try {
    if (world) {
      sendInputLoop();
      if (gameState === 'playing' && mode === 'online') {
        const now = performance.now();
        const dt = Math.min((now - (world.lastTime || now)) / 1000, 0.1);
        world.lastTime = now;
        world.update(dt);
      }
      world.render();
    }
  } catch (e) { setMsg('render loop error: ' + String(e)); }
}

function connect() {
  try {
    socket = new SocketClient(window.location.origin);
    const menuUI = new Menu();

    socket.on('connect', function() { console.log('socket connected'); });
    socket.on('disconnect', function() { console.log('socket disconnected'); });

    socket.on(MSG.JOIN_ROOM, function(data) {
      try {
        if (!data || !data.ok) { setMsg('Failed to join room'); return; }
        localPlayerId = socket && socket.socket ? socket.socket.id : null;
        localTeam = data.team;
        localName = data.name || 'Player';
        initWorld(data.settings || {});
        localPlayerId && netcode && netcode.setLocalPlayerId(localPlayerId);
        world.addPlayer(localPlayerId, localTeam, localName, 0, 0, true);
        showScreen('lobby');
      } catch (e) { setMsg('join error: ' + String(e)); }
    });

    socket.on('syncState', function(snap) {
      try {
        if (!netcode) return;
        netcode.applySnapshot(snap);
        if (hud) { hud.setScore(snap.score.home, snap.score.away); hud.setTime(snap.time); }
        netcode.setLocalPlayerId(localPlayerId);
        if (world) {
          world.setBallData(snap.ball);
          if (snap.players) {
            for (const p of snap.players) {
              if (p.id === localPlayerId) continue;
              world.setPlayerData(p.id, p);
            }
          }
        }
      } catch (e) { setMsg('sync error: ' + String(e)); }
    });

    socket.on('goalScored', function(data) {
      try { if (hud && data && data.score) hud.setScore(data.score.home, data.score.away); } catch (e) {}
    });

    socket.on('matchEnd', function(data) {
      try {
        gameState = 'ended';
        if (hud) hud.hide();
        const goScore = document.getElementById('goScore');
        const goTitle = document.getElementById('goTitle');
        if (goScore && data && data.score) goScore.textContent = 'Home ' + data.score.home + ' - ' + data.score.away + '  (' + (data.winner || 'draw') + ')';
        if (goTitle) goTitle.textContent = 'Match Over';
        if (gameOverEl) gameOverEl.classList.remove('hidden');
      } catch (e) {}
    });

    socket.on('roomState', function(summary) {
      try { renderLobby(summary); } catch (e) {}
    });

    socket.on('error', function(data) {
      try { setMsg(data && data.message ? data.message : 'Error'); } catch (e) {}
    });

    // Menu actions
    const btnCreate = document.getElementById('btnCreate');
    const btnJoin = document.getElementById('btnJoin');
    const btnStart = document.getElementById('btnStart');
    const btnLeave = document.getElementById('btnLeaveLobby');
    const goBack = document.getElementById('goBack');
    const btnLocal = document.getElementById('btnLocal');

    if (btnCreate) btnCreate.addEventListener('click', function() {
      const nameEl = document.getElementById('inpName');
      const teamEl = document.getElementById('inpTeam');
      localName = (nameEl && nameEl.value) || 'Player';
      localTeam = (teamEl && teamEl.value) || 'home';
      if (socket) socket.join('create-' + Date.now(), localName, localTeam);
    });
    if (btnJoin) btnJoin.addEventListener('click', function() {
      const nameEl = document.getElementById('inpName');
      const roomEl = document.getElementById('inpRoomId');
      const teamEl = document.getElementById('inpTeam');
      localName = (nameEl && nameEl.value) || 'Player';
      localTeam = (teamEl && teamEl.value) || 'home';
      if (socket) socket.join((roomEl && roomEl.value) || 'room-1', localName, localTeam);
    });
    if (btnStart) btnStart.addEventListener('click', function() {
      if (socket) socket.startMatch();
      startOnline();
    });
    if (btnLeave) btnLeave.addEventListener('click', function() { showScreen('menu'); });
    if (goBack) goBack.addEventListener('click', function() { showScreen('menu'); location.reload(); });
    if (btnLocal) btnLocal.addEventListener('click', function(e) {
      if (e) e.preventDefault();
      startLocal();
    });

    // Settings
    menuUI.onSetting = function(key, value) {
      try {
        if (socket) socket.setSetting(key, value);
        if (world) world.setSettings({ [key]: value });
        if (key === 'platform') setPreferredScheme(value === 'auto' ? null : value);
      } catch (e) {}
    };
    menuUI.onSetName = function(n) { localName = n; if (socket) socket.setName(n); };
    menuUI.onSetTeam = function(t) { localTeam = t; if (socket) socket.setTeam(t); };

    window.addEventListener('resize', function() { if (world) world.resize(); });

    showScreen('menu');
    loop();
  } catch (e) {
    setMsg('Connect failed: ' + (e && e.message ? e.message : String(e)));
    showScreen('menu');
    loop();
  }
}

// Global error handler
window.addEventListener('error', function(evt) {
  setMsg('JS error: ' + (evt.message || String(evt)));
});

window.__startLocal__ = startLocal;

connect();
