export class Netcode {
  constructor() {
    this.seq = 0;
    this.inputs = [];
    this.remotePlayers = new Map();
    this.interpDelay = 100;
    this.snapshots = [];
    this.localPlayerId = null;
    this.lastSnapshotTime = 0;
  }

  setLocalPlayerId(id) { this.localPlayerId = id; }

  makeInput(x, z, actions) {
    this.seq++;
    const input = {
      x, z,
      shoot: !!actions.shoot, pass: !!actions.pass, tackle: !!actions.tackle, sprint: !!actions.sprint,
      aimX: actions.aimX || 0, aimZ: actions.aimZ || 0,
      seq: this.seq, ts: Date.now(),
    };
    this.inputs.push({ seq: this.seq, input, ts: Date.now() });
    while (this.inputs.length > 200) this.inputs.shift();
    return input;
  }

  getInputBySeq(seq) { return this.inputs.find(i => i.seq === seq); }

  applySnapshot(snap) {
    this.lastSnapshotTime = Date.now();
    this.snapshots.push({ t: Date.now(), players: snap.players, ball: snap.ball, score: snap.score, time: snap.time, state: snap.state });
    while (this.snapshots.length > 120) this.snapshots.shift();
    this.remotePlayers.clear();
    for (const p of snap.players) {
      if (p.id === this.localPlayerId) continue;
      this.remotePlayers.set(p.id, { ...p, target: { ...p }, render: { ...p } });
    }
  }

  getInterpolatedPlayer(id, now) {
    const rp = this.remotePlayers.get(id);
    if (!rp) return null;
    const targetT = now - this.interpDelay;
    let s1 = null, s2 = null;
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].t <= targetT) { s2 = this.snapshots[i]; break; }
    }
    for (let i = s2 ? this.snapshots.indexOf(s2) + 1 : 0; i < this.snapshots.length; i++) {
      if (this.snapshots[i].t >= targetT) { s1 = this.snapshots[i]; break; }
    }
    if (!s1 || !s2) return rp.render;
    const p1 = s2.players.find(p => p.id === id);
    const p2 = s1.players.find(p => p.id === id);
    if (!p1 || !p2) return rp.render;
    const alpha = (targetT - s2.t) / Math.max(1, s1.t - s2.t);
    const r = {
      id: p1.id, team: p1.team, name: p1.name,
      x: p1.x + (p2.x - p1.x) * alpha,
      y: p1.y + (p2.y - p1.y) * alpha,
      z: p1.z + (p2.z - p1.z) * alpha,
      vx: p1.vx, vz: p1.vz,
      rx: p1.rx, rz: p1.rz,
      hasBall: p1.hasBall,
    };
    return r;
  }

  getInterpolatedBall(now) {
    if (this.snapshots.length < 2) return null;
    const targetT = now - this.interpDelay;
    let s1 = null, s2 = null;
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].t <= targetT) { s2 = this.snapshots[i]; break; }
    }
    for (let i = s2 ? this.snapshots.indexOf(s2) + 1 : 0; i < this.snapshots.length; i++) {
      if (this.snapshots[i].t >= targetT) { s1 = this.snapshots[i]; break; }
    }
    if (!s1 || !s2) return null;
    const alpha = (targetT - s2.t) / Math.max(1, s1.t - s2.t);
    return {
      x: s2.ball.x + (s1.ball.x - s2.ball.x) * alpha,
      y: s2.ball.y + (s1.ball.y - s2.ball.y) * alpha,
      z: s2.ball.z + (s1.ball.z - s2.ball.z) * alpha,
      ownerId: s1.ball.ownerId,
    };
  }

  getScore() {
    if (this.snapshots.length === 0) return { home: 0, away: 0 };
    return this.snapshots[this.snapshots.length - 1].score;
  }
  getTime() {
    if (this.snapshots.length === 0) return 0;
    return this.snapshots[this.snapshots.length - 1].time;
  }
  getState() {
    if (this.snapshots.length === 0) return 'lobby';
    return this.snapshots[this.snapshots.length - 1].state;
  }
}
