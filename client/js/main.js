import * as THREE from 'three';
import { io } from 'socket.io-client';
import { PCControls } from './controls/pcControls.js';
import { MobileControls } from './controls/mobileControls.js';
import { controlScheme, isMobile, isPC, setPreferredScheme } from './platform.js';
import { SocketClient } from './networking/socket.js';
import { Netcode } from './networking/netcode.js';
import { World } from './game/world.js';
import { Menu } from './ui/menu.js';
import { HUD } from './ui/hud.js';
import { MSG } from '/shared/protocol.js';

const canvas = document.getElementById('canvas');

let scheme = controlScheme();
document.getElementById('inpPlatform').value = scheme;
if (isMobile()) document.getElementById('controlsMobile').classList.remove('hidden');

let world = null;
let controls = null;
let socket = null;
let netcode = null;
let hud = null;
let menu = null;

let localPlayerId = null;
let localTeam = null;
let localName = 'Player';
let localPlayer = null;
let lastInputTime = 0;
const INPUT_INTERVAL = 1000 / 30;

let gameState = 'lobby';

const menuEl = document.getElementById('menu');
const lobbyEl = document.getElementById('lobby');
const gameOverEl = document.getElementById('gameOver');

function initWorld(settings) {
  if (world) world.dispose();
  world = new World(canvas, settings);
  netcode = new Netcode();
  hud = new HUD();

  localPlayer = world.addPlayer(localPlayerId, localTeam, localName, 0, 0, true);
  netcode.setLocalPlayerId(localPlayerId);

  if (isMobile() && !controls) controls = new MobileControls(canvas);
  else if (isPC() && !controls) { controls = new PCControls(); controls.enable(canvas); }

  socket.on('syncState', (snap) => {
    netcode.applySnapshot(snap);
    hud.setScore(snap.score.home, snap.score.away);
    hud.setTime(snap.time);
    if (localPlayerId) {
      netcode.setLocalPlayerId(localPlayerId);
    }
    world.setBallData(snap.ball);
    for (const p of snap.players) {
      if (p.id === localPlayerId) continue;
      world.setPlayerData(p.id, p);
    }
  });

  socket.on('goalScored', (data) => {
    hud.setScore(data.score.home, data.score.away);
  });

  socket.on('matchEnd', (data) => {
    gameState = 'ended';
    hud.hide();
    const goScore = document.getElementById('goScore');
    goScore.textContent = `Home ${data.score.home} - ${data.score.away}  (${data.winner})`;
    document.getElementById('goTitle').textContent = 'Match Over';
    gameOverEl.classList.remove('hidden');
  });

  socket.on('roomState', (summary) => {
    renderLobby(summary);
  });

  socket.on('error', (data) => {
    menu.setMsg(data.message || 'Error');
  });
}

function renderLobby(summary) {
  document.getElementById('lobbyTitle').textContent = 'Lobby - ' + summary.name;
  const list = document.getElementById('lobbyPlayers');
  list.innerHTML = '';
  for (const c of summary.clients) {
    const d = document.createElement('div');
    d.textContent = c.name + ' - ' + c.team + (c.id === localPlayerId ? ' (you)' : '');
    list.appendChild(d);
  }
  const s = summary.settings;
  document.getElementById('lobbySettings').innerHTML =
    `Weather: ${s.weather} &nbsp;|&nbsp; Stadium: ${s.stadium} &nbsp;|&nbsp; Kit: ${s.kit || 'home'}`;
  const btnStart = document.getElementById('btnStart');
  btnStart.disabled = !(localPlayerId && summary.clients.length >= 2);
}

function showScreen(name) {
  [menuEl, lobbyEl, gameOverEl].forEach(el => el.classList.add('hidden'));
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('controlsMobile').classList.add('hidden');
  if (name === 'menu') menuEl.classList.remove('hidden');
  if (name === 'lobby') lobbyEl.classList.remove('hidden');
  if (name === 'game') {
    document.getElementById('hud').classList.remove('hidden');
    if (isMobile()) document.getElementById('controlsMobile').classList.remove('hidden');
  }
  if (name === 'gameover') gameOverEl.classList.remove('hidden');
}

function sendInputLoop() {
  if (!controls || !socket || !socket.connected() || gameState !== 'playing') return;
  const now = Date.now();
  if (now - lastInputTime < INPUT_INTERVAL) return;
  lastInputTime = now;
  const input = controls.update();
  netcode.setLocalPlayerId(localPlayerId);
  const packed = netcode.makeInput(input.x, input.z, input);
  socket.sendInput(packed);
  applyLocalInput(input);
}

function applyLocalInput(input) {
  if (!localPlayer) return;
  const d = localPlayer.data;
  d.x = d.x; // kept
  d.vx = input.x * (input.sprint ? 8.5 : 5.5);
  d.vz = input.z * (input.sprint ? 8.5 : 5.5);
  d.sprinting = !!input.sprint;
  if (input.x !== 0 || input.z !== 0) { d.rx = input.x; d.rz = input.z; }
  world.setPlayerData(localPlayerId, d);
}

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - (world ? world.lastTime : now)) / 1000, 0.1);
  if (world) world.lastTime = now;

  sendInputLoop();
  if (world) {
    if (gameState === 'playing') world.update(dt);
    world.render();
  }
}

function connect() {
  socket = new SocketClient(window.location.origin);
  menu = new Menu();
  socket.on('connect', () => { console.log('socket connected'); });
  socket.on('disconnect', () => { console.log('socket disconnected'); });

  socket.on(MSG.JOIN_ROOM, ({ ok, roomId, team, name, settings }) => {
    if (!ok) { menu.setMsg('Failed to join'); return; }
    localPlayerId = socket.socket.id;
    localTeam = team;
    localName = name;
    initWorld(settings);
    showScreen('lobby');

    menu.onSetting = (key, value) => {
      socket.setSetting(key, value);
      if (world) world.setSettings({ [key]: value });
      if (key === 'platform') setPreferredScheme(value === 'auto' ? null : value);
    };
    menu.onSetName = (n) => { socket.setName(n); localName = n; };
    menu.onSetTeam = (t) => { socket.setTeam(t); localTeam = t; };
  });

  document.getElementById('btnCreate').addEventListener('click', () => {
    const name = document.getElementById('inpName').value || 'Player';
    localName = name;
    socket.join('create-' + Date.now(), name, document.getElementById('inpTeam').value);
  });
  document.getElementById('btnJoin').addEventListener('click', () => {
    const name = document.getElementById('inpName').value || 'Player';
    localName = name;
    socket.join(document.getElementById('inpRoomId').value || 'room-1', name, document.getElementById('inpTeam').value);
  });
  document.getElementById('btnStart').addEventListener('click', () => socket.startMatch());
  document.getElementById('btnLeaveLobby').addEventListener('click', () => showScreen('menu'));
  document.getElementById('goBack').addEventListener('click', () => { showScreen('menu'); location.reload(); });

  window.addEventListener('resize', () => { if (world) world.resize(); });

  showScreen('menu');
  loop();
}

connect();
