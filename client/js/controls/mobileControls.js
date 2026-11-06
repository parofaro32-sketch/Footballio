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
    const move = (e) => { e.preventDefault(); if (!this.joyActive) return; const t = this._touch(e); const dx = t.x - this.joyStart.x; const dy = t.y - this.joyStart.y; const d = Math.sqrt(dx * dx + dy * dy); const r = Math.min(d, 40); this.joyPos = { x: (dx / Math.max(d, 0.01)) * r, y: (dy / Math.max(d, 0.01)) * r }; this._updateThumb(); };
    const end = (e) => { e.preventDefault(); this.joyActive = false; this.joyPos = { x: 0, y: 0 }; this._updateThumb(); };
    base.addEventListener('touchstart', start, { passive: false });
    base.addEventListener('touchmove', move, { passive: false });
    base.addEventListener('touchend', end, { passive: false });
    base.addEventListener('touchcancel', end, { passive: false });

    const onBtn = (id, key) => {
      const el = document.getElementById(id);
      const press = () => { this.input[key] = true; el.classList.add('active'); };
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
      if (e.target.closest('#canvas')) {
        const p = document.getElementById('canvas');
        if (p.requestPointerLock) p.requestPointerLock();
      }
    });
  }

  _touch(e) {
    const t = e.touches[0] || e.changedTouches[0];
    const r = this.joyBase.getBoundingClientRect();
    return { x: t.clientX - r.left - r.width / 2, y: t.clientY - r.top - r.height / 2 };
  }
  _updateThumb() {
    this.joyEl.style.transform = `translate(calc(-50% + ${this.joyPos.x}px), calc(-50% + ${this.joyPos.y}px))`;
  }

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
