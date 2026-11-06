const { PITCH, PLAYER, BALL, MATCH, MSG, defaultPlayerState, defaultBallState } = require('../shared/constants.cjs');
const { Physics } = require('./physics.js');

const FORMATION_HOME = [
  { x: -30, z: 0, role: 'GK' },
  { x: -20, z: -16, role: 'LB' }, { x: -20, z: -8, role: 'CB' }, { x: -20, z: 8, role: 'CB' }, { x: -20, z: 16, role: 'RB' },
  { x: -8, z: -16, role: 'LM' }, { x: -8, z: 0, role: 'CM' }, { x: -8, z: 16, role: 'RM' },
  { x: 4, z: -12, role: 'ST' }, { x: 4, z: 12, role: 'ST' },
];
const FORMATION_AWAY = FORMATION_HOME.map(p => ({ x: -p.x, z: -p.z, role: p.role }));

function randomName() {
  const first = ['Alex','Sam','Jordan','Casey','Riley','Jamie','Quinn','Drew','Blake','Jesse'];
  const last = ['Smith','Lee','Kim','Garcia','Miller','Davis','Rodriguez','Wilson','Martinez','Anderson'];
  return first[Math.floor(Math.random() * first.length)] + ' ' + last[Math.floor(Math.random() * last.length)];
}

class Bot {
  constructor(id, team, name, formationPos) {
    this.id = id;
    this.team = team;
    this.name = name;
    this.homeX = formationPos.x;
    this.homeZ = formationPos.z;
    this.role = formationPos.role;
    this.state = 'idle';
    this.targetX = formationPos.x;
    this.targetZ = formationPos.z;
    this.reactionTimer = 0;
    this.shootTimer = 0;
    this.passTimer = 0;
    this.difficulty = 0.6 + Math.random() * 0.4;
  }

  update(dt, players, ball, match) {
    const me = match.players.find(p => p.id === this.id);
    if (!me) return;
    const input = { x: 0, z: 0, shoot: false, pass: false, tackle: false, sprint: false, aimX: 0, aimY: 0, seq: 0, ts: 0 };

    const bx = ball.x, bz = ball.z;
    const dToBall = dist(me.x, me.z, bx, bz);
    const hasBall = me.hasBall || (ball.ownerId === this.id);
    const nearestEnemy = this.findNearest(players, ball, me.team === 'home' ? 'away' : 'home', me.x, me.z);

    // State machine
    if (hasBall) {
      this.state = 'attack';
      const goalX = me.team === 'home' ? PITCH.LENGTH / 2 : -PITCH.LENGTH / 2;
      const goalZ = 0;
      const dToGoal = dist(me.x, me.z, goalX, goalZ);

      if (dToGoal < 14 && dToBall < 3 && Math.random() < this.difficulty * 0.3) {
        input.shoot = true;
        input.aimX = goalX - me.x;
        input.aimZ = goalZ - me.z;
        input.sprint = true;
      } else if (nearestEnemy && dist(me.x, me.z, nearestEnemy.x, nearestEnemy.z) < 5 && Math.random() < 0.15) {
        input.pass = true;
        const mate = this.findNearest(players, ball, me.team, me.x, me.z, true);
        if (mate) { input.aimX = mate.x - me.x; input.aimZ = mate.z - me.z; }
        else { input.aimX = goalX - me.x; input.aimZ = goalZ - me.z; }
      } else {
        input.x = (goalX - me.x) / Math.max(1, dToGoal);
        input.z = (goalZ - me.z) / Math.max(1, dToGoal);
        input.sprint = dToGoal > 10;
      }
    } else if (dToBall < 3.5) {
      this.state = 'chaseBall';
      input.x = (bx - me.x) / Math.max(0.1, dToBall);
      input.z = (bz - me.z) / Math.max(0.1, dToBall);
      input.sprint = true;
      if (dToBall < PLAYER.KICK_DISTANCE + 0.5 && Math.random() < this.difficulty * 0.25) {
        input.tackle = true;
        input.aimX = (me.team === 'home' ? PITCH.LENGTH / 2 : -PITCH.LENGTH / 2) - me.x;
        input.aimZ = 0 - me.z;
      }
    } else {
      this.state = 'defend';
      const hx = this.homeX, hz = this.homeZ;
      const dHome = dist(me.x, me.z, hx, hz);
      if (dHome > 3) {
        input.x = (hx - me.x) / Math.max(0.1, dHome);
        input.z = (hz - me.z) / Math.max(0.1, dHome);
      } else {
        input.x = 0; input.z = 0;
      }
    }

    Physics.updatePlayer(me, input, dt, PITCH.LENGTH / 2 - 1, PITCH.WIDTH / 2 - 1);
    me.updatedAt = Date.now();
  }

  findNearest(players, ball, team, x, z, excludeSelf = false) {
    let best = null, bestD = 1e9;
    for (const p of players) {
      if (p.team !== team) continue;
      if (excludeSelf && p.id === this.id) continue;
      const d = dist(x, z, p.x, p.z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }
}

class Match {
  constructor(roomId, settings) {
    this.roomId = roomId;
    this.settings = settings || {};
    this.weather = settings.weather || 'clear';
    this.stadium = settings.stadium || 'classic';
    this.players = [];
    this.ball = defaultBallState();
    this.score = { home: 0, away: 0 };
    this.time = MATCH.DURATION_SEC;
    this.state = 'lobby';
    this.startedAt = 0;
    this.bots = [];
    this.lastTick = Date.now();
    this.lastSnapshot = 0;
  }

  addPlayer(id, team, name, x, z) {
    const p = defaultPlayerState(id, team, name, x, z);
    this.players.push(p);
    return p;
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
    this.ball.ownerId = null;
    for (const p of this.players) if (p.hasBall) p.hasBall = false;
  }

  setBot(team, idx) {
    const formation = team === 'home' ? FORMATION_HOME : FORMATION_AWAY;
    const pos = formation[idx % formation.length];
    const bot = new Bot('bot-' + team + '-' + idx, team, 'Bot ' + (idx + 1), pos);
    this.bots.push(bot);
    this.players.push(defaultPlayerState(bot.id, team, bot.name, pos.x, pos.z));
  }

  fillBots() {
    const homeCount = this.players.filter(p => p.team === 'home' && !p.id.startsWith('bot-')).length;
    const awayCount = this.players.filter(p => p.team === 'away' && !p.id.startsWith('bot-')).length;
    for (let i = homeCount; i < MATCH.PLAYERS_PER_TEAM; i++) this.setBot('home', i);
    for (let i = awayCount; i < MATCH.PLAYERS_PER_TEAM; i++) this.setBot('away', i);
  }

  start() {
    this.state = 'playing';
    this.startedAt = Date.now();
    this.time = MATCH.DURATION_SEC;
    this.score = { home: 0, away: 0 };
    this.ball = defaultBallState();
    this.ball.x = 0; this.ball.z = 0;
    this.fillBots();
    this.resetPositions();
  }

  resetPositions() {
    const homeFormation = FORMATION_HOME;
    const awayFormation = FORMATION_AWAY;
    let hi = 0, ai = 0;
    for (const p of this.players) {
      if (p.id.startsWith('bot-')) continue;
      if (p.team === 'home') {
        const pos = homeFormation[hi % homeFormation.length];
        p.x = pos.x; p.z = pos.z; hi++;
      } else {
        const pos = awayFormation[ai % awayFormation.length];
        p.x = pos.x; p.z = pos.z; ai++;
      }
      p.vx = 0; p.vz = 0; p.hasBall = false;
    }
    for (const bot of this.bots) {
      const p = this.players.find(pl => pl.id === bot.id);
      if (p) { p.x = bot.homeX; p.z = bot.homeZ; p.vx = 0; p.vz = 0; p.hasBall = false; }
    }
    this.ball = defaultBallState();
    this.ball.x = 0; this.ball.z = 0;
  }

  goal(team) {
    this.score[team] += 1;
    this.resetPositions();
    return { team, score: { ...this.score } };
  }

  tick(dt) {
    if (this.state !== 'playing') return;
    this.time -= dt;
    if (this.time <= 0) { this.time = 0; this.state = 'ended'; return; }

    // Bot AI
    for (const bot of this.bots) {
      bot.update(dt, this.players, this.ball, this);
    }

    // Player-ball interaction & tackling
    for (const p of this.players) {
      if (p.hasBall) continue;
      if (this.ball.ownerId && this.ball.ownerId !== p.id) continue;
      const d = dist(p.x, p.z, this.ball.x, this.ball.z);
      if (d < PLAYER.KICK_DISTANCE + BALL.RADIUS) {
        p.hasBall = true;
        this.ball.ownerId = p.id;
        this.ball.vx = p.vx * 0.5;
        this.ball.vz = p.vz * 0.5;
      }
    }

    // Carry ball with owner
    const owner = this.players.find(p => p.hasBall);
    if (owner && this.ball.ownerId === owner.id) {
      this.ball.x = owner.x;
      this.ball.z = owner.z;
      this.ball.y = 0.55;
    }

    Physics.updateBall(this.ball, dt, this.weather === 'rain');

    // Goals
    const gw = PITCH.GOAL_WIDTH / 2;
    const gh = PITCH.GOAL_HEIGHT;
    const gz = PITCH.LENGTH / 2;
    if (Math.abs(this.ball.z) < gw && Math.abs(this.ball.x) > gz - 2) {
      const team = this.ball.x > 0 ? 'home' : 'away';
      this.goal(team);
    }
  }

  snapshot() {
    return {
      roomId: this.roomId,
      state: this.state,
      time: this.time,
      score: this.score,
      weather: this.weather,
      stadium: this.stadium,
      players: this.players.map(p => ({
        id: p.id, team: p.team, name: p.name,
        x: p.x, y: p.y, z: p.z,
        vx: p.vx, vz: p.vz,
        rx: p.rx, rz: p.rz,
        hasBall: p.hasBall, sprinting: p.sprinting,
      })),
      ball: { ...this.ball },
    };
  }
}

class Room {
  constructor(id, name, settings) {
    this.id = id;
    this.name = name;
    this.settings = settings || {};
    this.clients = new Map();
    this.match = new Match(id, settings);
    this.createdAt = Date.now();
  }

  addClient(socket, name, team) {
    this.clients.set(socket.id, { socket, name, team, ready: false });
  }

  removeClient(socketId) {
    this.clients.delete(socketId);
  }

  getClientCount() { return this.clients.size; }

  broadcast(event, data) {
    for (const { socket } of this.clients.values()) socket.emit(event, data);
  }

  stateSummary() {
    const clients = [];
    for (const [sid, c] of this.clients.entries()) clients.push({ id: sid, name: c.name, team: c.team, ready: c.ready });
    return { id: this.id, name: this.name, clients, settings: this.settings, matchState: this.match.state, score: this.match.score, time: this.match.time };
  }
}

module.exports = { Match, Room, Bot, randomName };
