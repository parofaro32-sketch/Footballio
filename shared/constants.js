export const PITCH = {
  LENGTH: 100,
  WIDTH: 64,
  GOAL_DEPTH: 10,
  GOAL_WIDTH: 7.32,
  GOAL_HEIGHT: 2.44,
  PENALTY_AREA: 16.5,
  GOAL_AREA: 5.5,
  CENTER_RADIUS: 9.15,
};

export const TEAM_COLORS = {
  home: 0x4a90e2,
  away: 0xe94560,
  ball: 0xffffff,
  pitchGrass: 0x2d5a27,
  pitchGrassAlt: 0x244a1e,
  line: 0xffffff,
};

export const PLAYER = {
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

export const BALL = {
  RADIUS: 0.55,
  MASS: 0.45,
  DRAG: 0.985,
  ROLL_DRAG: 0.92,
  MAX_SPEED: 40,
};

export const NETCODE = {
  TICK_RATE: 30,
  SNAPSHOT_RATE: 20,
  INPUT_RATE: 30,
  INTERP_DELAY_MS: 100,
};

export const MATCH = {
  DURATION_SEC: 180,
  PLAYERS_PER_TEAM: 11,
  TOTAL_PLAYERS: 22,
};

export const WEATHER = {
  CLEAR: 'clear',
  RAIN: 'rain',
  SNOW: 'snow',
};

export const STADIUM = {
  CLASSIC: 'classic',
  NIGHT: 'night',
  DESERT: 'desert',
};

export const KIT = {
  HOME: 'home',
  AWAY: 'away',
};

export const MSG = {
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

export const CONTROL = {
  MOVE_X: 'x',
  MOVE_Z: 'z',
  SHOOT: 'shoot',
  PASS: 'pass',
  TACKLE: 'tackle',
  SPRINT: 'sprint',
  AIM_X: 'aimX',
  AIM_Y: 'aimY',
};
