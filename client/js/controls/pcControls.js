import { isMobile, isPC, setPreferredScheme } from './platform.js';

export class PCControls {
  constructor() {
    this.input = { x: 0, z: 0, shoot: false, pass: false, tackle: false, sprint: false, aimX: 0, aimY: 0 };
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false, e: false };
    this.pointerLocked = false;
    this.yaw = 0;
    this.pitch = 0;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onContext = this._onContext.bind(this);
    this._onGamepad = null;
  }

  enable(canvas) {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('click', this._onClick);
    canvas.addEventListener('contextmenu', this._onContext);
    window.addEventListener('mousemove', this._onMouseMove);
  }

  disable() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  _onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') this.keys.w = true;
    if (k === 'a') this.keys.a = true;
    if (k === 's') this.keys.s = true;
    if (k === 'd') this.keys.d = true;
    if (k === ' ') this.keys.space = true;
    if (k === 'shift') this.keys.shift = true;
    if (k === 'e') this.keys.e = true;
  }
  _onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === 'w') this.keys.w = false;
    if (k === 'a') this.keys.a = false;
    if (k === 's') this.keys.s = false;
    if (k === 'd') this.keys.d = false;
    if (k === ' ') this.keys.space = false;
    if (k === 'shift') this.keys.shift = false;
    if (k === 'e') this.keys.e = false;
  }
  _onClick() {
    if (!this.pointerLocked) {
      const p = document.getElementById('canvas');
      if (p.requestPointerLock) p.requestPointerLock();
    }
  }
  _onContext(e) { e.preventDefault(); }
  _onMouseMove(e) {
    if (!this.pointerLocked) return;
    this.yaw -= e.movementX * 0.002;
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch - e.movementY * 0.002));
  }

  update() {
    const input = this.input;
    input.x = 0; input.z = 0;
    if (this.keys.w) input.z = -1;
    if (this.keys.s) input.z = 1;
    if (this.keys.a) input.x = -1;
    if (this.keys.d) input.x = 1;
    input.sprint = this.keys.shift;
    input.shoot = this.keys.space;
    input.tackle = this.keys.e;
    input.pass = false;
    input.aimX = Math.sin(this.yaw);
    input.aimZ = -Math.cos(this.yaw);
    this.pointerLocked = document.pointerLockElement === document.getElementById('canvas');
    return input;
  }
}

export class MobileControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = { x: 0, z: 0, shoot: false, pass: false, tackle: false, sprint: false, aimX: 0, aimY: 0 };
    this.joyActive = false;
    this.joyStart = { x: 0, y: 0 };
    this.joyPos = { x: 0, y: 0 };
    this.joyEl = document.getElementById('jsThumb');
    this.joyBase = document.getElementById('jsBase');
    this._bind();
  }

  _bind() {
    const base = document.getElementById('joystick');
    const start = (e) => { e.preventDefault(); this.joyActive = true; const t = this._touch(e); this.joyStart = t; this.joyPos = { x: 0, y: 0 }; this._updateThumb(); };
    const move = (e) => { e.preventDefault(); if (!this.joyActive) return; const t = this._touch(e); const dx = t.x - this.joyStart.x; const dy = t.y - this.joyStart.y; const d = Math.sqrt(dx*dx + dy*dy); const r = Math.min(d, 40); this.joyPos = { x: (dx / Math.max(d, 0.01)) * r, y: (dy / Math.max(d, 0.01)) * r }; this._updateThumb(); };
    const end = (e) => { e.preventDefault(); this.joyActive = false; this.joyPos = { x: 0, y: 0 }; this._updateThumb(); };
    base.addEventListener('touchstart', start, { passive: false });
    base.addEventListener('touchmove', move, { passive: false });
    base.addEventListener('touchend', end, { passive: false });
    base.addEventListener('touchcancel', end, { passive: false });

    const onBtn = (id, key, hold) => {
      const el = document.getElementById(id);
      const press = () => { this.input[key] = true; if (hold) el.classList.add('active'); };
      const release = () => { this.input[key] = false; el.classList.remove('active'); };
      el.addEventListener('touchstart', (e) => { e.preventDefault(); press(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); release(); }, { passive: false });
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', release);
    };
    onBtn('btnShoot', 'shoot');
    onBtn('btnPass', 'pass');
    onBtn('btnTackle', 'tackle');
    onBtn('btnSprint', 'sprint');

    window.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#canvas')) { const p = document.getElementById('canvas'); if (p.requestPointerLock) p.requestPointerLock(); }
    });
  }

  _touch(e) { const t = e.touches[0] || e.changedTouches[0]; const r = this.joyBase.getBoundingClientRect(); return { x: t.clientX - r.left - r.width / 2, y: t.clientY - r.top - r.height / 2 }; }
  _updateThumb() { this.joyEl.style.transform = `translate(calc(-50% + ${this.joyPos.x}px), calc(-50% + ${this.joyPos.y}px))`; }

  update() {
    const input = this.input;
    const r = 40;
    input.x = this.joyPos.x / r;
    input.z = -this.joyPos.y / r;
    input.x = Math.max(-1, Math.min(1, input.x));
    input.z = Math.max(-1, Math.min(1, input.z));
    return input;
  }
}
