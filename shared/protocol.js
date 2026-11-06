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

export const defaultInput = () => ({
  x: 0,
  z: 0,
  shoot: false,
  pass: false,
  tackle: false,
  sprint: false,
  aimX: 0,
  aimY: 0,
  seq: 0,
  ts: 0,
});

export const defaultPlayerState = (id, team, name) => ({
  id,
  team,
  name,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vz: 0,
  rx: 0,
  rz: 0,
  hasBall: false,
  sprinting: false,
  updatedAt: 0,
});

export const defaultBallState = () => ({
  x: 0,
  y: 0.55,
  z: 0,
  vx: 0,
  vz: 0,
  ownerId: null,
  updatedAt: 0,
});
