const PITCH = {
  LENGTH: 100,
  WIDTH: 64,
  GOAL_DEPTH: 10,
  GOAL_WIDTH: 7.32,
  GOAL_HEIGHT: 2.44,
  PENALTY_AREA: 16.5,
  GOAL_AREA: 5.5,
  CENTER_RADIUS: 9.15,
};

const PLAYER = {
  RADIUS: 0.9,
  SPEED: 5.5,
  SPRINT_SPEED: 8.5,
  ACCEL: 14,
  FRICTION: 4.0,
  KICK_DISTANCE: 2.2,
  SHOOT_SPEED: 26,
  PASS_SPEED: 16,
  TACKLE_RADIUS: 2.4,
};

const BALL = {
  RADIUS: 0.55,
  DRAG: 0.985,
  ROLL_DRAG: 0.92,
  MAX_SPEED: 40,
};

const NETCODE = {
  TICK_RATE: 30,
  SNAPSHOT_RATE: 20,
  MS_PER_TICK: 1000 / 30,
};

const MATCH = {
  DURATION_SEC: 180,
  PLAYERS_PER_TEAM: 11,
  TOTAL_PLAYERS: 22,
};

const WEATHER = { CLEAR: 'clear', RAIN: 'rain', SNOW: 'snow' };
const STADIUM = { CLASSIC: 'classic', NIGHT: 'night', DESERT: 'desert' };

const MSG = {
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  START_MATCH: 'startMatch',
  INPUT: 'input',
  SYNC_STATE: 'syncState',
  GOAL_SCORED: 'goalScored',
  MATCH_END: 'matchEnd',
  ROOM_STATE: 'roomState',
  ERROR: 'error',
};

function defaultInput() {
  return { x: 0, z: 0, shoot: false, pass: false, tackle: false, sprint: false, aimX: 0, aimY: 0, seq: 0, ts: 0 };
}

function defaultPlayerState(id, team, name, x, z) {
  return {
    id, team, name,
    x, y: 0, z,
    vx: 0, vz: 0,
    rx: 0, rz: 0,
    hasBall: false, sprinting: false,
    updatedAt: 0,
  };
}

function defaultBallState() {
  return { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null, updatedAt: 0 };
}

module.exports = { PITCH, PLAYER, BALL, NETCODE, MATCH, WEATHER, STADIUM, MSG, defaultInput, defaultPlayerState, defaultBallState };
