const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Match, Room, Bot, randomName, MSG } = require('./match.js');
const { PITCH, PLAYER, BALL, NETCODE, MATCH, WEATHER, STADIUM, MSG: MSG2, defaultInput, defaultPlayerState } = require('../shared/constants.cjs');
const { Physics } = require('./physics.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../client')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const socketRoom = new Map();
const socketTeam = new Map();
const socketName = new Map();
let roomCounter = 0;

function createRoom(name) {
  const id = 'room-' + (++roomCounter) + '-' + Math.random().toString(36).slice(2, 6);
  const room = new Room(id, name, { weather: 'clear', stadium: 'classic' });
  rooms.set(id, room);
  return room;
}

function getOrCreateRoom(socket, roomId, name) {
  if (roomId && rooms.has(roomId)) return rooms.get(roomId);
  return createRoom(name || 'Room ' + roomCounter);
}

function broadcastRoomState(room) {
  room.broadcast(MSG.ROOM_STATE, room.stateSummary());
}

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on(MSG.JOIN_ROOM, ({ roomId, name, team }) => {
    const room = getOrCreateRoom(socket, roomId, name);
    const t = team || (room.getClientCount() % 2 === 0 ? 'home' : 'away');
    socketRoom.set(socket.id, room.id);
    socketTeam.set(socket.id, t);
    socketName.set(socket.id, name || 'Player');
    room.addClient(socket, socketName.get(socket.id), t);

    // Leave previous room if any
    // (handled by re-join; simple MVP)

    socket.join(room.id);
    socket.emit(MSG.JOIN_ROOM, { ok: true, roomId: room.id, team: t, name: socketName.get(socket.id), settings: room.settings });
    broadcastRoomState(room);

    if (room.getClientCount() >= 2 && room.match.state === 'lobby') {
      // Auto start when enough players, or wait for startMatch
    }
  });

  socket.on('setName', ({ name }) => {
    socketName.set(socket.id, name);
    const roomId = socketRoom.get(socket.id);
    if (roomId && rooms.has(roomId)) broadcastRoomState(rooms.get(roomId));
  });

  socket.on('setTeam', ({ team }) => {
    socketTeam.set(socket.id, team);
    const roomId = socketRoom.get(socket.id);
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const c = room.clients.get(socket.id);
      if (c) c.team = team;
      broadcastRoomState(room);
    }
  });

  socket.on('setSetting', ({ key, value }) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.settings[key] = value;
    broadcastRoomState(room);
  });

  socket.on(MSG.START_MATCH, () => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (room.match.state !== 'lobby') return;
    room.match.start();
    room.broadcast(MSG.SYNC_STATE, room.match.snapshot());
  });

  socket.on(MSG.INPUT, (input) => {
    const roomId = socketRoom.get(socket.id);
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    if (room.match.state !== 'playing') return;
    const team = socketTeam.get(socket.id);
    const name = socketName.get(socket.id);
    let p = room.match.players.find(pl => pl.id === socket.id);
    if (!p) {
      p = defaultPlayerState(socket.id, team, name, 0, 0);
      room.match.players.push(p);
    }
    p.x = input.x || p.x;
    // store input for server-side application next tick
    p._input = input;
    p._inputTs = input.ts || Date.now();
    p.sprinting = !!input.sprint;
    p.updatedAt = Date.now();
  });

  socket.on('disconnect', () => {
    const roomId = socketRoom.get(socket.id);
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.removeClient(socket.id);
      room.match.removePlayer(socket.id);
      room.broadcast(MSG.ROOM_STATE, room.stateSummary());
      if (room.match.state === 'playing') room.broadcast(MSG.SYNC_STATE, room.match.snapshot());
      if (room.getClientCount() === 0) rooms.delete(roomId);
    }
    socketRoom.delete(socket.id);
    socketTeam.delete(socket.id);
    socketName.delete(socket.id);
  });
});

setInterval(() => {
  const now = Date.now();
  const dt = NETCODE.MS_PER_TICK / 1000;
  for (const room of rooms.values()) {
    if (room.match.state === 'playing') {
      // apply queued inputs
      for (const p of room.match.players) {
        if (p._input) {
          Physics.updatePlayer(p, p._input, dt, PITCH.LENGTH / 2 - 1, PITCH.WIDTH / 2 - 1);
          p._input = null;
        }
      }
      // bots handled in match.tick
      room.match.tick(dt);
    }
    // snapshots
    if (room.match.state === 'playing' && now - room.match.lastSnapshot >= 1000 / NETCODE.SNAPSHOT_RATE) {
      room.match.lastSnapshot = now;
      room.broadcast(MSG.SYNC_STATE, room.match.snapshot());
    }
    if (room.match.state === 'ended') {
      room.broadcast(MSG.MATCH_END, { score: room.match.score, winner: room.match.score.home > room.match.score.away ? 'home' : room.match.score.away > room.match.score.home ? 'away' : 'draw' });
      room.match.state = 'lobby';
    }
  }
}, NETCODE.MS_PER_TICK);

server.listen(PORT, () => console.log('Server listening on http://localhost:' + PORT));
