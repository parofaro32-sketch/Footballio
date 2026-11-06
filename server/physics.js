const { PITCH, PLAYER, BALL, NETCODE, MATCH, defaultPlayerState, defaultBallState } = require('../shared/constants.cjs');

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function dist2(x1, z1, x2, z2) { const dx = x2 - x1, dz = z2 - z1; return dx * dx + dz * dz; }
function dist(x1, z1, x2, z2) { return Math.sqrt(dist2(x1, z1, x2, z2)); }

class Physics {
  static updatePlayer(p, input, dt, pitchHalfL, pitchHalfW) {
    const sprint = input.sprint;
    const maxSpeed = sprint ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
    const targetVx = input.x * maxSpeed;
    const targetVz = input.z * maxSpeed;

    p.vx += (targetVx - p.vx) * PLAYER.ACCEL * dt;
    p.vz += (targetVz - p.vz) * PLAYER.ACCEL * dt;

    p.vx *= Math.pow(1 - PLAYER.FRICTION * dt, 1);
    p.vz *= Math.pow(1 - PLAYER.FRICTION * dt, 1);

    p.x += p.vx * dt;
    p.z += p.vz * dt;

    p.x = clamp(p.x, -pitchHalfL + PLAYER.RADIUS, pitchHalfL - PLAYER.RADIUS);
    p.z = clamp(p.z, -pitchHalfW + PLAYER.RADIUS, pitchHalfW - PLAYER.RADIUS);

    if (input.x !== 0 || input.z !== 0) {
      p.rx = input.x;
      p.rz = input.z;
    }
  }

  static updateBall(ball, dt, wet) {
    const drag = wet ? BALL.ROLL_DRAG : BALL.DRAG;
    ball.vx *= drag;
    ball.vz *= drag;
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;

    const h = PITCH.LENGTH / 2;
    const w = PITCH.WIDTH / 2;
    if (ball.x < -h + BALL.RADIUS) { ball.x = -h + BALL.RADIUS; ball.vx *= -0.5; }
    if (ball.x > h - BALL.RADIUS) { ball.x = h - BALL.RADIUS; ball.vx *= -0.5; }
    if (ball.z < -w + BALL.RADIUS) { ball.z = -w + BALL.RADIUS; ball.vz *= -0.5; }
    if (ball.z > w - BALL.RADIUS) { ball.z = w - BALL.RADIUS; ball.vz *= -0.5; }
  }

  static kickBall(ball, kicker, speed, aimX, aimZ) {
    const dirX = aimX || kicker.rx;
    const dirZ = aimZ || kicker.rz;
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    ball.vx = (dirX / len) * speed;
    ball.vz = (dirZ / len) * speed;
    ball.ownerId = null;
    ball.y = 0.55;
  }
}

module.exports = { Physics, clamp, dist, dist2 };
