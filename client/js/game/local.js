import { PITCH, PLAYER, BALL, MATCH } from '/shared/constants.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(x1, z1, x2, z2) { const dx = x2 - x1, dz = z2 - z1; return Math.sqrt(dx * dx + dz * dz); }

export class LocalMatch {
  constructor(world, controls) {
    this.world = world;
    this.controls = controls;
    this.players = [];
    this.ball = { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null };
    this.score = { home: 0, away: 0 };
    this.time = MATCH.DURATION_SEC;
    this.state = 'playing';
    this.last = performance.now();
    this.localId = 'you';
  }

  start() {
    this.players = [];
    this.ball = { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null };
    this.score = { home: 0, away: 0 };
    this.time = MATCH.DURATION_SEC;
    this.state = 'playing';

    // local player (home)
    this.addPlayer(this.localId, 'home', 'You', -20, 0, true);

    // home bots (10)
    const homePos = [
      [-20,-16],[-20,-8],[-20,8],[-20,16],[-8,-16],[-8,0],[-8,16],[4,-12],[4,12],[-30,0]
    ];
    homePos.forEach((p, i) => this.addPlayer('botH' + i, 'home', 'H' + (i + 1), p[0], p[1], false));

    // away bots (11)
    const awayPos = [
      [20,-16],[20,-8],[20,8],[20,16],[8,-16],[8,0],[8,16],[-4,-12],[-4,12],[30,0],[0,0]
    ];
    awayPos.forEach((p, i) => this.addPlayer('botA' + i, 'away', 'A' + (i + 1), p[0], p[1], false));

    this.syncWorld();
  }

  addPlayer(id, team, name, x, z, isLocal) {
    this.players.push({ id, team, name, x, y: 0, z, vx: 0, vz: 0, rx: 0, rz: 0, hasBall: false, sprinting: false, isLocal });
    this.world.addPlayer(id, team, name, x, z, isLocal);
  }

  update() {
    try {
      const now = performance.now();
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      if (this.state !== 'playing') return;
      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.state = 'ended'; return; }

      const halfL = PITCH.LENGTH / 2 - 1;
      const halfW = PITCH.WIDTH / 2 - 1;

      // local player input
      const me = this.players.find(p => p.id === this.localId);
      if (me && this.controls) {
        const input = this.controls.update();
        const spd = input.sprint ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
        me.vx = input.x * spd;
        me.vz = input.z * spd;
        if (input.x !== 0 || input.z !== 0) { me.rx = input.x; me.rz = input.z; }
        me.sprinting = !!input.sprint;
      }

      // bots AI
      for (const p of this.players) {
        if (p.isLocal) continue;
        this.botThink(p, dt);
      }

      // move all players
      for (const p of this.players) {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.x = clamp(p.x, -halfL, halfL);
        p.z = clamp(p.z, -halfW, halfW);
        p.vx *= 0.85; p.vz *= 0.85;
      }

      // ball pickup
      for (const p of this.players) {
        if (p.hasBall) continue;
        if (this.ball.ownerId && this.ball.ownerId !== p.id) continue;
        if (dist(p.x, p.z, this.ball.x, this.ball.z) < PLAYER.KICK_DISTANCE + BALL.RADIUS) {
          p.hasBall = true;
          this.ball.ownerId = p.id;
        }
      }

      // carry ball
      const owner = this.players.find(p => p.hasBall);
      if (owner && this.ball.ownerId === owner.id) {
        this.ball.x = owner.x; this.ball.z = owner.z; this.ball.y = 0.55;
        this.ball.vx = owner.vx * 0.4; this.ball.vz = owner.vz * 0.4;
      } else {
        this.ball.vx *= BALL.DRAG; this.ball.vz *= BALL.DRAG;
        this.ball.x += this.ball.vx * dt;
        this.ball.z += this.ball.vz * dt;
        const h = PITCH.LENGTH / 2, w = PITCH.WIDTH / 2;
        if (this.ball.x < -h + BALL.RADIUS) { this.ball.x = -h + BALL.RADIUS; this.ball.vx *= -0.5; }
        if (this.ball.x > h - BALL.RADIUS) { this.ball.x = h - BALL.RADIUS; this.ball.vx *= -0.5; }
        if (this.ball.z < -w + BALL.RADIUS) { this.ball.z = -w + BALL.RADIUS; this.ball.vz *= -0.5; }
        if (this.ball.z > w - BALL.RADIUS) { this.ball.z = w - BALL.RADIUS; this.ball.vz *= -0.5; }
      }

      // goals
      const gw = PITCH.GOAL_WIDTH / 2;
      const gz = PITCH.LENGTH / 2;
      if (Math.abs(this.ball.z) < gw && Math.abs(this.ball.x) > gz - 2) {
        const team = this.ball.x > 0 ? 'home' : 'away';
        this.score[team] += 1;
        this.resetPositions();
      }

      this.syncWorld();
    } catch (e) {
      console.error('LocalMatch.update error:', e);
    }
  }

  botThink(p, dt) {
    try {
      const bx = this.ball.x, bz = this.ball.z;
      const d = dist(p.x, p.z, bx, bz);
      const homeX = p.team === 'home' ? -20 : 20;
      const hasBall = p.hasBall || this.ball.ownerId === p.id;
      const goalX = p.team === 'home' ? PITCH.LENGTH / 2 : -PITCH.LENGTH / 2;

      if (hasBall) {
        const dg = dist(p.x, p.z, goalX, 0);
        const speed = (dg < 14 && Math.random() < 0.3) ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
        p.vx = (goalX - p.x) / Math.max(0.1, dg) * speed;
        p.vz = (0 - p.z) / Math.max(0.1, dg) * speed;
        p.rx = goalX - p.x; p.rz = -p.z;
      } else if (d < 4) {
        p.vx = (bx - p.x) / Math.max(0.1, d) * PLAYER.SPRINT_SPEED;
        p.vz = (bz - p.z) / Math.max(0.1, d) * PLAYER.SPRINT_SPEED;
        p.rx = bx - p.x; p.rz = bz - p.z;
      } else {
        const targetZ = p.z > 0 ? 12 : -12;
        const dh = dist(p.x, p.z, homeX, targetZ);
        if (dh > 3) {
          p.vx = (homeX - p.x) / Math.max(0.1, dh) * PLAYER.SPEED;
          p.vz = (targetZ - p.z) / Math.max(0.1, dh) * PLAYER.SPEED;
          p.rx = homeX - p.x; p.rz = targetZ - p.z;
        } else {
          p.vx = 0; p.vz = 0;
        }
      }
    } catch (e) { console.error('botThink error:', e); }
  }

  resetPositions() {
    try {
      this.ball = { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null };
      for (const p of this.players) { p.hasBall = false; p.vx = 0; p.vz = 0; }
      this.syncWorld();
    } catch (e) { console.error('resetPositions error:', e); }
  }

  syncWorld() {
    try {
      for (const p of this.players) {
        this.world.setPlayerData(p.id, {
          x: p.x, y: p.y, z: p.z, vx: p.vx, vz: p.vz,
          rx: p.rx, rz: p.rz, hasBall: p.hasBall, sprinting: p.sprinting,
        });
      }
      this.world.setBallData(this.ball);
    } catch (e) { console.error('syncWorld error:', e); }
  }
}
