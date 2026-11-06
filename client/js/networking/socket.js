import io from 'socket.io-client';

export class SocketClient {
  constructor(url) {
    const resolved = (typeof window !== 'undefined' && window.__SOCKET_URL__) || url || window.location.origin;
    this.socket = io(resolved, { transports: ['websocket', 'polling'] });
    this.roomId = null;
    this.team = null;
    this.name = null;
    this.listeners = {};
  }
  on(event, cb) { this.socket.on(event, cb); }
  off(event, cb) { this.socket.off(event, cb); }
  emit(event, data) { this.socket.emit(event, data); }
  connected() { return this.socket.connected; }
  join(roomId, name, team) {
    this.roomId = roomId; this.name = name; this.team = team;
    this.emit('joinRoom', { roomId, name, team });
  }
  setName(name) { this.emit('setName', { name }); }
  setTeam(team) { this.emit('setTeam', { team }); }
  setSetting(key, value) { this.emit('setSetting', { key, value }); }
  startMatch() { this.emit('startMatch'); }
  sendInput(input) { this.emit('input', input); }
}
