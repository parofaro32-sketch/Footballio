// ============================================================
// Football Game — Bundled client (classic script, no ES modules)
// ============================================================

(function() {
  'use strict';

  // ---------- Constants ----------
  var PITCH = { LENGTH: 100, WIDTH: 64, GOAL_DEPTH: 10, GOAL_WIDTH: 7.32, GOAL_HEIGHT: 2.44, PENALTY_AREA: 16.5, GOAL_AREA: 5.5, CENTER_RADIUS: 9.15 };
  var TEAM_COLORS = { home: 0x4a90e2, away: 0xe94560, ball: 0xffffff, pitchGrass: 0x2d5a27, pitchGrassAlt: 0x1e471d, line: 0xffffff };
  var PLAYER = { RADIUS: 0.9, SPEED: 5.5, SPRINT_SPEED: 8.5, ACCEL: 14, FRICTION: 4.0, KICK_DISTANCE: 2.2, SHOOT_SPEED: 26, PASS_SPEED: 16, TACKLE_RADIUS: 2.4 };
  var BALL = { RADIUS: 0.55, DRAG: 0.985, ROLL_DRAG: 0.92, MAX_SPEED: 40 };
  var MATCH = { DURATION_SEC: 180, PLAYERS_PER_TEAM: 11, TOTAL_PLAYERS: 22 };
  var WEATHER = { CLEAR: 'clear', RAIN: 'rain', SNOW: 'snow' };
  var STADIUM = { CLASSIC: 'classic', NIGHT: 'night', DESERT: 'desert' };

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function dist(x1, z1, x2, z2) { var dx = x2 - x1, dz = z2 - z1; return Math.sqrt(dx * dx + dz * dz); }

  // ---------- Platform ----------
  var isMobile = (function() {
    try {
      return /Android|webOS|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent)
        || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    } catch (e) { return false; }
  })();

  // ---------- Controls (smoothed + deadzone + aim assist) ----------
  var PCControls = function(canvas) {
    this.canvas = canvas;
    this.input = { x: 0, z: 0, shoot: false, pass: false, tackle: false, sprint: false, aimX: 0, aimZ: -1 };
    this.smooth = { x: 0, z: 0 };
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false, e: false };
    this.yaw = 0;
    var self = this;
    this._onKeyDown = function(e) { var k = e.key.toLowerCase(); if (k === 'w') self.keys.w = true; if (k === 'a') self.keys.a = true; if (k === 's') self.keys.s = true; if (k === 'd') self.keys.d = true; if (k === ' ') self.keys.space = true; if (k === 'shift') self.keys.shift = true; if (k === 'e') self.keys.e = true; };
    this._onKeyUp = function(e) { var k = e.key.toLowerCase(); if (k === 'w') self.keys.w = false; if (k === 'a') self.keys.a = false; if (k === 's') self.keys.s = false; if (k === 'd') self.keys.d = false; if (k === ' ') self.keys.space = false; if (k === 'shift') self.keys.shift = false; if (k === 'e') self.keys.e = false; };
    this._onMouseMove = function(e) { if (document.pointerLockElement === canvas) { self.yaw -= e.movementX * 0.002; } };
    this._onClick = function() { var p = document.getElementById('canvas'); if (p && p.requestPointerLock) p.requestPointerLock(); };
    this._onContext = function(e) { e.preventDefault(); };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('click', this._onClick);
    canvas.addEventListener('contextmenu', this._onContext);
  };
  PCControls.prototype.update = function(ballX, ballZ, meX, meZ) {
    var input = this.input;
    var tx = 0, tz = 0;
    if (this.keys.w) tz = -1;
    if (this.keys.s) tz = 1;
    if (this.keys.a) tx = -1;
    if (this.keys.d) tx = 1;

    // aim assist: if near ball, steer slightly toward opponent goal
    if (ballX !== undefined && ballZ !== undefined && meX !== undefined && meZ !== undefined) {
      var d = dist(meX, meZ, ballX, ballZ);
      if (d < 6) {
        var goalX = (this.keys.a || this.keys.d || this.keys.w || this.keys.s) ? 0 : 1;
        // keep current aim but nudge forward
      }
    }
    input.aimX = Math.sin(this.yaw);
    input.aimZ = -Math.cos(this.yaw);

    // smooth movement
    this.smooth.x += (tx - this.smooth.x) * 0.25;
    this.smooth.z += (tz - this.smooth.z) * 0.25;
    input.x = this.smooth.x;
    input.z = this.smooth.z;

    input.sprint = this.keys.shift;
    input.shoot = this.keys.space;
    input.tackle = this.keys.e;
    input.pass = false;
    return input;
  };
  PCControls.prototype.disable = function() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
  };

  var MobileControls = function(canvas) {
    this.canvas = canvas;
    this.input = { x: 0, z: 0, shoot: false, pass: false, tackle: false, sprint: false, aimX: 0, aimZ: -1 };
    this.joyActive = false;
    this.joyStart = { x: 0, y: 0 };
    this.joyPos = { x: 0, y: 0 };
    this.joyEl = document.getElementById('jsThumb');
    this.joyBase = document.getElementById('jsBase');
    var self = this;
    var base = document.getElementById('joystick');
    var start = function(e) { e.preventDefault(); self.joyActive = true; var t = self._touch(e); self.joyStart = t; self.joyPos = { x: 0, y: 0 }; self._updateThumb(); };
    var move = function(e) { e.preventDefault(); if (!self.joyActive) return; var t = self._touch(e); var dx = t.x - self.joyStart.x; var dy = t.y - self.joyStart.y; var d = Math.sqrt(dx * dx + dy * dy); var r = Math.min(d, 40); self.joyPos = { x: (dx / Math.max(d, 0.01)) * r, y: (dy / Math.max(d, 0.01)) * r }; self._updateThumb(); };
    var end = function(e) { e.preventDefault(); self.joyActive = false; self.joyPos = { x: 0, y: 0 }; self._updateThumb(); };
    base.addEventListener('touchstart', start, { passive: false });
    base.addEventListener('touchmove', move, { passive: false });
    base.addEventListener('touchend', end, { passive: false });
    base.addEventListener('touchcancel', end, { passive: false });

    var onBtn = function(id, key) {
      var el = document.getElementById(id);
      var press = function() { self.input[key] = true; el.classList.add('active'); };
      var release = function() { self.input[key] = false; el.classList.remove('active'); };
      el.addEventListener('touchstart', function(e) { e.preventDefault(); press(); }, { passive: false });
      el.addEventListener('touchend', function(e) { e.preventDefault(); release(); }, { passive: false });
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', release);
    };
    onBtn('btnShoot', 'shoot');
    onBtn('btnPass', 'pass');
    onBtn('btnTackle', 'tackle');
    onBtn('btnSprint', 'sprint');

    window.addEventListener('pointerdown', function(e) {
      if (e.target.closest('#canvas')) {
        var p = document.getElementById('canvas');
        if (p && p.requestPointerLock) p.requestPointerLock();
      }
    });
  };
  MobileControls.prototype._touch = function(e) {
    var t = e.touches[0] || e.changedTouches[0];
    var r = this.joyBase.getBoundingClientRect();
    return { x: t.clientX - r.left - r.width / 2, y: t.clientY - r.top - r.height / 2 };
  };
  MobileControls.prototype._updateThumb = function() {
    this.joyEl.style.transform = 'translate(calc(-50% + ' + this.joyPos.x + 'px), calc(-50% + ' + this.joyPos.y + 'px))';
  };
  MobileControls.prototype.update = function() {
    var input = this.input;
    var r = 40;
    // deadzone
    var dx = this.joyPos.x, dy = this.joyPos.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 8) { dx = 0; dy = 0; }
    input.x = dx / r;
    input.z = -dy / r;
    input.x = Math.max(-1, Math.min(1, input.x));
    input.z = Math.max(-1, Math.min(1, input.z));
    return input;
  };

  // ---------- Weather ----------
  var Weather = function(type, scene, isMobile) {
    this.scene = scene;
    this.isMobile = isMobile;
    this.particles = null;
    this.count = isMobile ? 120 : 600;
    this.set(type);
  };
  Weather.prototype.set = function(type) {
    if (this.particles) { this.scene.remove(this.particles); this.particles.geometry.dispose(); this.particles.material.dispose(); this.particles = null; }
    if (type === 'clear') return;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(this.count * 3);
    var vel = new Float32Array(this.count);
    for (var i = 0; i < this.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 240;
      pos[i * 3 + 1] = Math.random() * 100;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 240;
      vel[i] = type === 'snow' ? 0.05 + Math.random() * 0.05 : 0.18 + Math.random() * 0.18;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.userData = geo.userData || {};
    geo.userData.vel = vel;
    var mat = new THREE.PointsMaterial({ color: type === 'snow' ? 0xffffff : 0xaaaaee, size: isMobile ? 0.18 : 0.12, transparent: true, opacity: 0.7 });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
    this.type = type;
  };
  Weather.prototype.update = function(dt) {
    if (!this.particles) return;
    var pos = this.particles.geometry.attributes.position;
    var vel = this.particles.geometry.userData.vel;
    for (var i = 0; i < this.count; i++) {
      pos.setY(i, pos.getY(i) - vel[i]);
      pos.setX(i, pos.getX(i) + Math.sin(Date.now() * 0.001 + i) * 0.015);
      if (pos.getY(i) < 0) pos.setY(i, 100 + Math.random() * 30);
    }
    pos.needsUpdate = true;
  };

  // ---------- Pitch ----------
  var Pitch = function(stadium, isMobile) {
    this.isMobile = isMobile;
    this.stadium = stadium;
    this.group = new THREE.Group();
    this._build();
    this.setStadium(stadium);
  };
  Pitch.prototype._build = function() {
    var halfL = PITCH.LENGTH / 2;
    var halfW = PITCH.WIDTH / 2;

    // Grass with mowing pattern + subtle noise
    var geo = new THREE.PlaneGeometry(PITCH.LENGTH, PITCH.WIDTH, 64, 64);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var base = TEAM_COLORS.pitchGrass;
    var alt = TEAM_COLORS.pitchGrassAlt;
    var colors = new Float32Array(pos.count * 3);
    var cBase = new THREE.Color(base);
    var cAlt = new THREE.Color(alt);
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var z = pos.getZ(i);
      var band = Math.floor((x + halfL) / 10) % 2;
      var noise = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.05;
      var c = band ? cAlt : cBase;
      colors[i * 3] = c.r + noise;
      colors[i * 3 + 1] = c.g + noise;
      colors[i * 3 + 2] = c.b + noise;
      pos.setY(i, band ? 0.02 : 0);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.material = new THREE.MeshStandardMaterial({ color: base, vertexColors: true, roughness: 1.0, metalness: 0 });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Lines (thicker, brighter)
    this.lines = new THREE.Group();
    var lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
    var _line = function(x1, z1, x2, z2) {
      var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, 0.03, z1), new THREE.Vector3(x2, 0.03, z2)]);
      this.lines.add(new THREE.Line(g, lineMat));
    }.bind(this);
    _line(-halfL, 0, halfL, 0);
    _line(halfL, 0, -halfL, 0);
    _line(-halfL, -halfW, -halfL, halfW);
    _line(halfL, -halfW, halfL, halfW);
    _line(0, -halfW, 0, halfW);
    _line(-halfL, -PITCH.PENALTY_AREA, -halfL, PITCH.PENALTY_AREA);
    _line(-halfL + 4, -PITCH.PENALTY_AREA, -halfL + 4, PITCH.PENALTY_AREA);
    _line(-halfL + 4, -PITCH.PENALTY_AREA, -halfL, -PITCH.PENALTY_AREA);
    _line(-halfL + 4, PITCH.PENALTY_AREA, -halfL, PITCH.PENALTY_AREA);
    _line(halfL, -PITCH.PENALTY_AREA, halfL, PITCH.PENALTY_AREA);
    _line(halfL - 4, -PITCH.PENALTY_AREA, halfL - 4, PITCH.PENALTY_AREA);
    _line(halfL - 4, -PITCH.PENALTY_AREA, halfL, -PITCH.PENALTY_AREA);
    _line(halfL - 4, PITCH.PENALTY_AREA, halfL, PITCH.PENALTY_AREA);
    // center circle
    var pts = [];
    for (var i = 0; i <= 64; i++) { var a = (i / 64) * Math.PI * 2; pts.push(new THREE.Vector3(0, 0.03, Math.sin(a) * PITCH.CENTER_RADIUS)); pts.push(new THREE.Vector3(0, 0.03, Math.cos(a) * PITCH.CENTER_RADIUS)); }
    // simpler: line loop
    var cpts = [];
    for (var i = 0; i <= 64; i++) { var a2 = (i / 64) * Math.PI * 2; cpts.push(new THREE.Vector3(Math.cos(a2) * PITCH.CENTER_RADIUS, 0.03, Math.sin(a2) * PITCH.CENTER_RADIUS)); }
    var cg = new THREE.BufferGeometry().setFromPoints(cpts);
    this.lines.add(new THREE.LineLoop(cg, lineMat));
    this.group.add(this.lines);

    // Goals with real net
    this.goals = new THREE.Group();
    this._goal(-halfL);
    this._goal(halfL);
    this.group.add(this.goals);

    // Stands with seat colors + floodlights
    var stands = new THREE.Group();
    this._stands(stands, -halfL - 7);
    this._stands(stands, halfL + 7);
    this._standsSide(stands, -halfW - 7, 0, 1);
    this._standsSide(stands, halfW + 7, 0, 0);
    // floodlight poles
    this._floodlights(stands);
    this.group.add(stands);
  };
  Pitch.prototype._line = function(x1, z1, x2, z2) {}; // placeholder, lines built inline
  Pitch.prototype._goal = function(x) {
    var gw = PITCH.GOAL_WIDTH / 2;
    var gh = PITCH.GOAL_HEIGHT;
    var g = new THREE.Group();
    var postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.8 });
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, gh, 12), postMat);
    post.position.set(x, gh / 2, -gw); post.castShadow = true; g.add(post);
    var post2 = post.clone(); post2.position.set(x, gh / 2, gw); g.add(post2);
    var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, gw * 2, 12), postMat);
    bar.rotation.z = Math.PI / 2; bar.position.set(x, gh, 0); bar.castShadow = true; g.add(bar);
    // net mesh (vertical strips)
    var netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    for (var i = 0; i <= 6; i++) {
      var nx = x - gw + (gw * 2 / 6) * i;
      var ngeo = new THREE.PlaneGeometry(gh, PITCH.GOAL_DEPTH);
      var nmesh = new THREE.Mesh(ngeo, netMat);
      nmesh.position.set(nx, gh / 2, -PITCH.GOAL_DEPTH / 2);
      nmesh.rotation.y = Math.PI / 2;
      nmesh.castShadow = false;
      g.add(nmesh);
    }
    for (var j = 0; j <= 4; j++) {
      var ny = (gh / 5) * j;
      var hgeo = new THREE.PlaneGeometry(gw * 2, gh / 5);
      var hmesh = new THREE.Mesh(hgeo, netMat);
      hmesh.position.set(x, ny + gh / 10, -PITCH.GOAL_DEPTH / 2);
      hmesh.castShadow = false;
      g.add(hmesh);
    }
    this.goals.add(g);
  };
  Pitch.prototype._stands = function(g, z) {
    var rows = 5;
    var colors = [0x222, 0x333, 0x444, 0x333, 0x222];
    for (var r = 0; r < rows; r++) {
      var h = 2.5 + r * 1.8;
      var deep = new THREE.Mesh(new THREE.BoxGeometry(PITCH.LENGTH, h, 4), new THREE.MeshStandardMaterial({ color: colors[r] % colors.length, roughness: 1 }));
      deep.position.set(0, h / 2 + 0.1, z - 3 - r * 4);
      deep.castShadow = true;
      deep.receiveShadow = true;
      g.add(deep);
      // seats
      var seatGeo = new THREE.BoxGeometry(0.6, 0.3, 0.6);
      var seatMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      for (var s = 0; s < PITCH.LENGTH; s += 4) {
        var seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(s - PITCH.LENGTH / 2 + 2, h - 0.5, z - 1 - r * 4);
        seat.castShadow = true;
        g.add(seat);
      }
    }
  };
  Pitch.prototype._standsSide = function(g, z, x, dir) {
    var rows = 4;
    var colors = [0x222, 0x333, 0x444, 0x333];
    for (var r = 0; r < rows; r++) {
      var h = 2.5 + r * 1.8;
      var deep = new THREE.Mesh(new THREE.BoxGeometry(4, h, PITCH.WIDTH), new THREE.MeshStandardMaterial({ color: colors[r] % colors.length, roughness: 1 }));
      deep.position.set(z, h / 2 + 0.1, x);
      deep.castShadow = true;
      deep.receiveShadow = true;
      g.add(deep);
    }
  };
  Pitch.prototype._floodlights = function(g) {
    var poleMat = new THREE.MeshStandardMaterial({ color: 0x444, roughness: 1 });
    var lightMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 });
    var positions = [
      [-PITCH.LENGTH / 2 - 10, -PITCH.WIDTH / 2 - 10],
      [PITCH.LENGTH / 2 + 10, -PITCH.WIDTH / 2 - 10],
      [-PITCH.LENGTH / 2 - 10, PITCH.WIDTH / 2 + 10],
      [PITCH.LENGTH / 2 + 10, PITCH.WIDTH / 2 + 10]
    ];
    for (var i = 0; i < positions.length; i++) {
      var px = positions[i][0];
      var pz = positions[i][1];
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 25, 8), poleMat);
      pole.position.set(px, 12.5, pz);
      pole.castShadow = true;
      g.add(pole);
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), lightMat);
      lamp.position.set(px, 25, pz);
      g.add(lamp);
    }
  };
  Pitch.prototype.setStadium = function(stadium, scene) {
    this.stadium = stadium;
    var sky, grass, fogNear, fogFar;
    if (stadium === 'night') { sky = 0x020408; grass = 0x1a2b1a; fogNear = 40; fogFar = 160; }
    else if (stadium === 'desert') { sky = 0x2b2012; grass = 0x3a3a1a; fogNear = 50; fogFar = 180; }
    else { sky = 0x0b1a0f; grass = TEAM_COLORS.pitchGrass; fogNear = 35; fogFar = 150; }
    if (scene && scene.background) scene.background = new THREE.Color(sky);
    if (this.material) this.material.color.set(grass);
    if (scene && scene.fog) { scene.fog.color.set(sky); scene.fog.near = fogNear; scene.fog.far = fogFar; }
  };

  // ---------- Ball ----------
  var Ball = function() {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL.RADIUS, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.2 })
    );
    this.mesh.castShadow = true;
    this.mesh.position.y = BALL.RADIUS;
    this.data = { x: 0, y: BALL.RADIUS, z: 0, vx: 0, vz: 0, ownerId: null };
  };
  Ball.prototype.setData = function(data) { this.data = data; };
  Ball.prototype.update = function(dt) {
    var d = this.data;
    this.mesh.position.set(d.x, d.y || BALL.RADIUS, d.z);
  };

  // ---------- Player (articulated + animation) ----------
  var Player = function(id, team, name, x, z, isLocal, colors) {
    this.id = id; this.team = team; this.name = name; this.isLocal = isLocal; this.colors = colors;
    this.data = { x: x, y: 0, z: z, vx: 0, vz: 0, rx: 0, rz: 0, hasBall: false, sprinting: false };
    this.animTime = Math.random() * Math.PI * 2;
    this.animSpeed = 1;
    this.mesh = new THREE.Group();
    this._buildBody();
    this.mesh.position.set(x, 0, z);
  };
  Player.prototype._buildBody = function() {
    var shirt = this.team === 'home' ? this.colors.home : this.colors.away;
    var shortC = 0x111111;
    var sockC = this.team === 'home' ? this.colors.home : this.colors.away;
    var skin = 0xe0ac69;

    // torso
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.28), new THREE.MeshStandardMaterial({ color: shirt }));
    torso.position.set(0, 0.55, 0); torso.castShadow = true; this.mesh.add(torso);
    this.torso = torso;
    // head
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), new THREE.MeshStandardMaterial({ color: skin }));
    head.position.set(0, 0.95, 0); head.castShadow = true; this.mesh.add(head);
    this.head = head;
    // left arm
    var la = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), new THREE.MeshStandardMaterial({ color: skin }));
    la.position.set(-0.26, 0.55, 0); la.castShadow = true; this.mesh.add(la);
    this.leftArm = la;
    // right arm
    var ra = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.16), new THREE.MeshStandardMaterial({ color: skin }));
    ra.position.set(0.26, 0.55, 0); ra.castShadow = true; this.mesh.add(ra);
    this.rightArm = ra;
    // left leg
    var ll = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), new THREE.MeshStandardMaterial({ color: shortC }));
    ll.position.set(-0.14, 0.24, 0); ll.castShadow = true; this.mesh.add(ll);
    this.leftLeg = ll;
    // right leg
    var rl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), new THREE.MeshStandardMaterial({ color: shortC }));
    rl.position.set(0.14, 0.24, 0); rl.castShadow = true; this.mesh.add(rl);
    this.rightLeg = rl;
    // socks
    var lsock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), new THREE.MeshStandardMaterial({ color: sockC }));
    lsock.position.set(-0.14, 0.0, 0); lsock.castShadow = true; this.mesh.add(lsock);
    var rsock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), new THREE.MeshStandardMaterial({ color: sockC }));
    rsock.position.set(0.14, 0.0, 0); rsock.castShadow = true; this.mesh.add(rsock);
    // shoes
    var shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    var lshoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.34), shoeMat);
    lshoe.position.set(-0.14, -0.22, 0.1); lshoe.castShadow = true; this.mesh.add(lshoe);
    var rshoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.34), shoeMat);
    rshoe.position.set(0.14, -0.22, 0.1); rshoe.castShadow = true; this.mesh.add(rshoe);
  };
  Player.prototype.setData = function(data) { this.data = data; };
  Player.prototype.update = function(dt, camPos, hasBall) {
    var d = this.data;
    this.mesh.position.set(d.x, d.y, d.z);

    // facing
    if (d.rx !== 0 || d.rz !== 0) {
      this.mesh.rotation.y = Math.atan2(d.rx, -d.rz);
    }

    // animation
    var speed = Math.sqrt(d.vx * d.vx + d.vz * d.vz);
    var moving = speed > 0.1;
    if (moving) {
      this.animTime += dt * (d.sprinting ? 12 : 8);
    } else {
      this.animTime += dt * 1.5;
    }
    var bob = Math.sin(this.animTime) * 0.03;
    var legSwing = Math.sin(this.animTime) * 0.4;
    var armSwing = Math.cos(this.animTime) * 0.4;

    this.mesh.position.y = bob;
    this.torso.position.y = 0.55 + bob;
    this.head.position.y = 0.95 + bob;

    if (moving) {
      this.leftArm.rotation.x = armSwing;
      this.rightArm.rotation.x = -armSwing;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
    } else {
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // kick pose when has ball
    if (hasBall) {
      this.rightLeg.rotation.x = -0.8;
      this.rightLeg.position.y = -0.15;
    } else {
      this.rightLeg.position.y = 0;
    }

    if (this.nameMesh) {
      this.nameMesh.position.set(d.x, 1.35, d.z);
      if (camPos) this.nameMesh.lookAt(camPos);
    }
  };
  Player.prototype.makeNameLabel = function() {
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 128, 44);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    var spr = new THREE.Sprite(mat);
    spr.scale.set(2.4, 0.6, 1);
    this.mesh.add(spr);
    this.nameMesh = spr;
  };

  Player.MeshGroup = function() {
    this.group = new THREE.Group();
    this.map = new Map();
  };
  Player.MeshGroup.prototype.add = function(p) { this.group.add(p.mesh); this.map.set(p.id, p); };
  Player.MeshGroup.prototype.remove = function(p) { this.group.remove(p.mesh); this.map.delete(p.id); };
  Player.MeshGroup.prototype.update = function(dt, camPos, ballOwnerId, playersMap) {
    for (var p of this.map.values()) {
      var hasBall = (ballOwnerId === p.id);
      p.update(dt, camPos, hasBall);
    }
  };

  // ---------- World ----------
  var World = function(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings || { weather: 'clear', stadium: 'classic' };
    this.isMobile = isMobile;
    var pc = !this.isMobile;
    this.pixelRatio = this.isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: pc, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = pc;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b1a0f, 30, 140);
    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.5, 300);
    this.camera.position.set(0, 18, -40);
    this.camera.lookAt(0, 0, 0);
    this.lastTime = performance.now();

    // Lighting: hemisphere + directional + spot
    var hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemi);
    this.light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.light.position.set(30, 60, 30);
    this.light.castShadow = pc;
    this.light.shadow.mapSize.width = this.isMobile ? 512 : 1024;
    this.light.shadow.mapSize.height = this.isMobile ? 512 : 1024;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 150;
    this.light.shadow.camera.left = -60;
    this.light.shadow.camera.right = 60;
    this.light.shadow.camera.top = 60;
    this.light.shadow.camera.bottom = -60;
    this.scene.add(this.light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Spotlight for drama (PC only)
    if (pc) {
      var spot = new THREE.SpotLight(0xffffff, 2, 120, 0.5, 0.5, 1);
      spot.position.set(0, 40, 0);
      spot.lookAt(0, 0, 0);
      spot.castShadow = true;
      this.scene.add(spot);
    }

    this.pitch = new Pitch(this.settings.stadium, this.isMobile);
    this.pitch.scene = this.scene;
    this.pitch.setStadium(this.settings.stadium, this.scene);
    this.scene.add(this.pitch.mesh);
    this.ball = new Ball();
    this.scene.add(this.ball.mesh);
    this.players = new Map();
    this.playerMesh = new Player.MeshGroup();
    this.scene.add(this.playerMesh.group);
    this.lod = { update: function() {} };
    this.weather = new Weather(this.settings.weather, this.scene, this.isMobile);
    this.lastTime = performance.now();
  };
  World.prototype.setSettings = function(patch) {
    this.settings = Object.assign({}, this.settings, patch);
    if (this.settings.weather !== undefined) this.weather.set(this.settings.weather);
    if (this.settings.stadium !== undefined) this.pitch.setStadium(this.settings.stadium, this.scene);
  };
  World.prototype.addPlayer = function(id, team, name, x, z, isLocal) {
    var p = new Player(id, team, name, x, z, isLocal, TEAM_COLORS);
    p.makeNameLabel();
    this.players.set(id, p);
    this.playerMesh.add(p);
    return p;
  };
  World.prototype.removePlayer = function(id) {
    var p = this.players.get(id);
    if (p) { this.playerMesh.remove(p); this.players.delete(id); }
  };
  World.prototype.setPlayerData = function(id, data) {
    var p = this.players.get(id);
    if (!p) return;
    p.setData(data);
  };
  World.prototype.setBallData = function(data) { this.ball.setData(data); };
  World.prototype.resize = function() {
    var cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    this.camera.aspect = cw / ch;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(cw, ch);
  };
  World.prototype.update = function(dt) {
    this.playerMesh.update(dt, this.camera.position, this.ball.data.ownerId);
    this.ball.update(dt);
    this.weather.update(dt);
  };
  World.prototype.render = function() {
    this.renderer.render(this.scene, this.camera);
  };
  World.prototype.dispose = function() { this.renderer.dispose(); };

  // ---------- LocalMatch ----------
  var LocalMatch = function(world, controls) {
    this.world = world;
    this.controls = controls;
    this.players = [];
    this.ball = { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null };
    this.score = { home: 0, away: 0 };
    this.time = MATCH.DURATION_SEC;
    this.state = 'playing';
    this.last = performance.now();
    this.localId = 'you';
  };
  LocalMatch.prototype.start = function() {
    this.players = [];
    this.ball = { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null };
    this.score = { home: 0, away: 0 };
    this.time = MATCH.DURATION_SEC;
    this.state = 'playing';
    this.addPlayer(this.localId, 'home', 'You', -20, 0, true);
    var homePos = [
      [-20,-16],[-20,-8],[-20,8],[-20,16],[-8,-16],[-8,0],[-8,16],[4,-12],[4,12],[-30,0]
    ];
    for (var i = 0; i < homePos.length; i++) {
      var p = homePos[i];
      this.addPlayer('botH' + i, 'home', 'H' + (i + 1), p[0], p[1], false);
    }
    var awayPos = [
      [20,-16],[20,-8],[20,8],[20,16],[8,-16],[8,0],[8,16],[-4,-12],[-4,12],[30,0],[0,0]
    ];
    for (var i = 0; i < awayPos.length; i++) {
      var p2 = awayPos[i];
      this.addPlayer('botA' + i, 'away', 'A' + (i + 1), p2[0], p2[1], false);
    }
    this.syncWorld();
  };
  LocalMatch.prototype.addPlayer = function(id, team, name, x, z, isLocal) {
    this.players.push({ id: id, team: team, name: name, x: x, y: 0, z: z, vx: 0, vz: 0, rx: 0, rz: 0, hasBall: false, sprinting: false, isLocal: isLocal });
    this.world.addPlayer(id, team, name, x, z, isLocal);
  };
  LocalMatch.prototype.update = function() {
    try {
      var now = performance.now();
      var dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      if (this.state !== 'playing') return;
      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.state = 'ended'; return; }
      var halfL = PITCH.LENGTH / 2 - 1;
      var halfW = PITCH.WIDTH / 2 - 1;
      var me = this.players.find(function(p) { return p.id === this.localId; }.bind(this));
      if (me && this.controls) {
        var input = this.controls.update(this.ball.x, this.ball.z, me.x, me.z);
        var spd = input.sprint ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
        me.vx = input.x * spd;
        me.vz = input.z * spd;
        if (input.x !== 0 || input.z !== 0) { me.rx = input.x; me.rz = input.z; }
        me.sprinting = !!input.sprint;
      }
      for (var i = 0; i < this.players.length; i++) {
        var p = this.players[i];
        if (p.isLocal) continue;
        this.botThink(p, dt);
      }
      for (var i = 0; i < this.players.length; i++) {
        var p = this.players[i];
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.x = clamp(p.x, -halfL, halfL);
        p.z = clamp(p.z, -halfW, halfW);
        p.vx *= 0.85; p.vz *= 0.85;
      }
      for (var i = 0; i < this.players.length; i++) {
        var p = this.players[i];
        if (p.hasBall) continue;
        if (this.ball.ownerId && this.ball.ownerId !== p.id) continue;
        if (dist(p.x, p.z, this.ball.x, this.ball.z) < PLAYER.KICK_DISTANCE + BALL.RADIUS) {
          p.hasBall = true;
          this.ball.ownerId = p.id;
        }
      }
      var owner = this.players.find(function(p) { return p.hasBall; });
      if (owner && this.ball.ownerId === owner.id) {
        this.ball.x = owner.x; this.ball.z = owner.z; this.ball.y = 0.55;
        this.ball.vx = owner.vx * 0.4; this.ball.vz = owner.vz * 0.4;
      } else {
        this.ball.vx *= BALL.DRAG; this.ball.vz *= BALL.DRAG;
        this.ball.x += this.ball.vx * dt;
        this.ball.z += this.ball.vz * dt;
        var h = PITCH.LENGTH / 2, w = PITCH.WIDTH / 2;
        if (this.ball.x < -h + BALL.RADIUS) { this.ball.x = -h + BALL.RADIUS; this.ball.vx *= -0.5; }
        if (this.ball.x > h - BALL.RADIUS) { this.ball.x = h - BALL.RADIUS; this.ball.vx *= -0.5; }
        if (this.ball.z < -w + BALL.RADIUS) { this.ball.z = -w + BALL.RADIUS; this.ball.vz *= -0.5; }
        if (this.ball.z > w - BALL.RADIUS) { this.ball.z = w - BALL.RADIUS; this.ball.vz *= -0.5; }
      }
      var gw = PITCH.GOAL_WIDTH / 2;
      var gz = PITCH.LENGTH / 2;
      if (Math.abs(this.ball.z) < gw && Math.abs(this.ball.x) > gz - 2) {
        var team = this.ball.x > 0 ? 'home' : 'away';
        this.score[team] += 1;
        this.resetPositions();
      }
      this.syncWorld();
    } catch (e) { console.error('LocalMatch.update error:', e); }
  };
  LocalMatch.prototype.botThink = function(p, dt) {
    try {
      var bx = this.ball.x, bz = this.ball.z;
      var d = dist(p.x, p.z, bx, bz);
      var homeX = p.team === 'home' ? -20 : 20;
      var hasBall = p.hasBall || this.ball.ownerId === p.id;
      var goalX = p.team === 'home' ? PITCH.LENGTH / 2 : -PITCH.LENGTH / 2;
      if (hasBall) {
        var dg = dist(p.x, p.z, goalX, 0);
        var speed = (dg < 14 && Math.random() < 0.3) ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
        p.vx = (goalX - p.x) / Math.max(0.1, dg) * speed;
        p.vz = (0 - p.z) / Math.max(0.1, dg) * speed;
        p.rx = goalX - p.x; p.rz = -p.z;
      } else if (d < 4) {
        p.vx = (bx - p.x) / Math.max(0.1, d) * PLAYER.SPRINT_SPEED;
        p.vz = (bz - p.z) / Math.max(0.1, d) * PLAYER.SPRINT_SPEED;
        p.rx = bx - p.x; p.rz = bz - p.z;
      } else {
        var targetZ = p.z > 0 ? 12 : -12;
        var dh = dist(p.x, p.z, homeX, targetZ);
        if (dh > 3) {
          p.vx = (homeX - p.x) / Math.max(0.1, dh) * PLAYER.SPEED;
          p.vz = (targetZ - p.z) / Math.max(0.1, dh) * PLAYER.SPEED;
          p.rx = homeX - p.x; p.rz = targetZ - p.z;
        } else { p.vx = 0; p.vz = 0; }
      }
    } catch (e) { console.error('botThink error:', e); }
  };
  LocalMatch.prototype.resetPositions = function() {
    try {
      this.ball = { x: 0, y: 0.55, z: 0, vx: 0, vz: 0, ownerId: null };
      for (var i = 0; i < this.players.length; i++) { this.players[i].hasBall = false; this.players[i].vx = 0; this.players[i].vz = 0; }
      this.syncWorld();
    } catch (e) { console.error('resetPositions error:', e); }
  };
  LocalMatch.prototype.syncWorld = function() {
    try {
      for (var i = 0; i < this.players.length; i++) {
        var p = this.players[i];
        this.world.setPlayerData(p.id, {
          x: p.x, y: p.y, z: p.z, vx: p.vx, vz: p.vz,
          rx: p.rx, rz: p.rz, hasBall: p.hasBall, sprinting: p.sprinting,
        });
      }
      this.world.setBallData(this.ball);
    } catch (e) { console.error('syncWorld error:', e); }
  };

  // ---------- Netcode ----------
  var Netcode = function() {
    this.seq = 0;
    this.inputs = [];
    this.remotePlayers = new Map();
    this.interpDelay = 100;
    this.snapshots = [];
    this.localPlayerId = null;
    this.lastSnapshotTime = 0;
  };
  Netcode.prototype.setLocalPlayerId = function(id) { this.localPlayerId = id; };
  Netcode.prototype.makeInput = function(x, z, actions) {
    this.seq++;
    var input = {
      x: x, z: z,
      shoot: !!actions.shoot, pass: !!actions.pass, tackle: !!actions.tackle, sprint: !!actions.sprint,
      aimX: actions.aimX || 0, aimZ: actions.aimZ || 0,
      seq: this.seq, ts: Date.now()
    };
    this.inputs.push({ seq: this.seq, input: input, ts: Date.now() });
    while (this.inputs.length > 200) this.inputs.shift();
    return input;
  };
  Netcode.prototype.applySnapshot = function(snap) {
    this.lastSnapshotTime = Date.now();
    this.snapshots.push({ t: Date.now(), players: snap.players, ball: snap.ball, score: snap.score, time: snap.time, state: snap.state });
    while (this.snapshots.length > 120) this.snapshots.shift();
    this.remotePlayers.clear();
    if (snap.players) {
      for (var i = 0; i < snap.players.length; i++) {
        var p = snap.players[i];
        if (p.id === this.localPlayerId) continue;
        this.remotePlayers.set(p.id, Object.assign({}, p, { target: Object.assign({}, p), render: Object.assign({}, p) }));
      }
    }
  };
  Netcode.prototype.getInterpolatedPlayer = function(id, now) {
    var rp = this.remotePlayers.get(id);
    if (!rp) return null;
    var targetT = now - this.interpDelay;
    var s1 = null, s2 = null;
    for (var i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].t <= targetT) { s2 = this.snapshots[i]; break; }
    }
    var startIdx = s2 ? this.snapshots.indexOf(s2) + 1 : 0;
    for (var i = startIdx; i < this.snapshots.length; i++) {
      if (this.snapshots[i].t >= targetT) { s1 = this.snapshots[i]; break; }
    }
    if (!s1 || !s2) return rp.render;
    var p1 = s2.players.find(function(p) { return p.id === id; });
    var p2 = s1.players.find(function(p) { return p.id === id; });
    if (!p1 || !p2) return rp.render;
    var alpha = (targetT - s2.t) / Math.max(1, s1.t - s2.t);
    return {
      id: p1.id, team: p1.team, name: p1.name,
      x: p1.x + (p2.x - p1.x) * alpha,
      y: p1.y + (p2.y - p1.y) * alpha,
      z: p1.z + (p2.z - p1.z) * alpha,
      vx: p1.vx, vz: p1.vz,
      rx: p1.rx, rz: p1.rz,
      hasBall: p1.hasBall
    };
  };
  Netcode.prototype.getInterpolatedBall = function(now) {
    if (this.snapshots.length < 2) return null;
    var targetT = now - this.interpDelay;
    var s1 = null, s2 = null;
    for (var i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].t <= targetT) { s2 = this.snapshots[i]; break; }
    }
    var startIdx = s2 ? this.snapshots.indexOf(s2) + 1 : 0;
    for (var i = startIdx; i < this.snapshots.length; i++) {
      if (this.snapshots[i].t >= targetT) { s1 = this.snapshots[i]; break; }
    }
    if (!s1 || !s2) return null;
    var alpha = (targetT - s2.t) / Math.max(1, s1.t - s2.t);
    return {
      x: s2.ball.x + (s1.ball.x - s2.ball.x) * alpha,
      y: s2.ball.y + (s1.ball.y - s2.ball.y) * alpha,
      z: s2.ball.z + (s1.ball.z - s2.ball.z) * alpha,
      ownerId: s1.ball.ownerId
    };
  };
  Netcode.prototype.getScore = function() {
    if (this.snapshots.length === 0) return { home: 0, away: 0 };
    return this.snapshots[this.snapshots.length - 1].score;
  };
  Netcode.prototype.getTime = function() {
    if (this.snapshots.length === 0) return 0;
    return this.snapshots[this.snapshots.length - 1].time;
  };
  Netcode.prototype.getState = function() {
    if (this.snapshots.length === 0) return 'lobby';
    return this.snapshots[this.snapshots.length - 1].state;
  };

  // ---------- SocketClient ----------
  var SocketClient = function(url) {
    this.socket = io(url || window.location.origin, { transports: ['websocket', 'polling'] });
    this.roomId = null; this.team = null; this.name = null;
    this.listeners = {};
  };
  SocketClient.prototype.on = function(event, cb) { this.socket.on(event, cb); };
  SocketClient.prototype.emit = function(event, data) { this.socket.emit(event, data); };
  SocketClient.prototype.connected = function() { return !!this.socket && this.socket.connected; };
  SocketClient.prototype.join = function(roomId, name, team) {
    this.roomId = roomId; this.name = name; this.team = team;
    this.emit('joinRoom', { roomId: roomId, name: name, team: team });
  };
  SocketClient.prototype.setName = function(name) { this.emit('setName', { name: name }); };
  SocketClient.prototype.setTeam = function(team) { this.emit('setTeam', { team: team }); };
  SocketClient.prototype.setSetting = function(key, value) { this.emit('setSetting', { key: key, value: value }); };
  SocketClient.prototype.startMatch = function() { this.emit('startMatch'); };
  SocketClient.prototype.sendInput = function(input) { this.emit('input', input); };

  // ---------- MSG ----------
  var MSG = {
    JOIN_ROOM: 'joinRoom',
    LEAVE_ROOM: 'leaveRoom',
    START_MATCH: 'startMatch',
    INPUT: 'input',
    SYNC_STATE: 'syncState',
    GOAL_SCORED: 'goalScored',
    MATCH_END: 'matchEnd',
    ROOM_STATE: 'roomState',
    ERROR: 'error'
  };

  // ---------- UI ----------
  var Menu = function() {
    this.onSetting = function() {};
    this.onSetName = function() {};
    this.onSetTeam = function() {};
  };
  Menu.prototype.show = function() {
    var el = document.getElementById('menu');
    if (el) el.classList.remove('hidden');
  };
  Menu.prototype.hide = function() {
    var el = document.getElementById('menu');
    if (el) el.classList.add('hidden');
  };
  Menu.prototype.setMsg = function(text) {
    var el = document.getElementById('msg');
    if (el) el.textContent = text || '';
  };
  Menu.prototype.setRooms = function(rooms) {
    var el = document.getElementById('roomsList');
    if (!el) return;
    el.innerHTML = '';
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i];
      var d = document.createElement('div');
      d.textContent = r.name + ' (' + r.clients.length + '/22)';
      d.style.cursor = 'pointer';
      d.onclick = (function(roomId) { return function() { if (window.__joinRoom__) window.__joinRoom__(roomId); }; })(r.id);
      el.appendChild(d);
    }
  };

  var HUD = function() {
    this.homeEl = document.getElementById('hudHome');
    this.awayEl = document.getElementById('hudAway');
    this.timeEl = document.getElementById('hudTime');
    this.weatherEl = document.getElementById('hudWeather');
    this.hintEl = document.getElementById('hudHint');
  };
  HUD.prototype.show = function() {
    var el = document.getElementById('hud');
    if (el) el.classList.remove('hidden');
  };
  HUD.prototype.hide = function() {
    var el = document.getElementById('hud');
    if (el) el.classList.add('hidden');
  };
  HUD.prototype.setScore = function(home, away) {
    if (this.homeEl) this.homeEl.textContent = 'Home ' + home;
    if (this.awayEl) this.awayEl.textContent = 'Away ' + away;
  };
  HUD.prototype.setTime = function(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60).toString().padStart(2, '0');
    if (this.timeEl) this.timeEl.textContent = m + ':' + s;
  };
  HUD.prototype.setWeather = function(w) {
    var label = { clear: 'Clear', rain: 'Rain', snow: 'Snow' }[w] || w;
    if (this.weatherEl) this.weatherEl.textContent = label;
  };
  HUD.prototype.setHint = function(text) {
    if (this.hintEl) this.hintEl.textContent = text;
  };

  // ---------- Loading screen ----------
  var Loading = function() {
    this.el = document.getElementById('loading');
    this._forceTimer = null;
  };
  Loading.prototype.show = function() {
    if (this.el) {
      this.el.classList.remove('hidden');
      this.el.style.display = 'flex';
    }
    // Safety net: force-hide loading after 3s no matter what
    var self = this;
    if (this._forceTimer) clearTimeout(this._forceTimer);
    this._forceTimer = setTimeout(function() { self.hide(); }, 3000);
  };
  Loading.prototype.hide = function() {
    if (this.el) {
      this.el.classList.add('hidden');
      this.el.style.display = 'none';
    }
    if (this._forceTimer) { clearTimeout(this._forceTimer); this._forceTimer = null; }
  };

  // ---------- Main ----------
  var canvas = document.getElementById('canvas');
  var msgEl = document.getElementById('msg');

  function setMsg(text) {
    if (msgEl) msgEl.textContent = text || '';
    if (text) console.error(text);
  }

  var world = null;
  var controls = null;
  var socket = null;
  var netcode = null;
  var hud = null;
  var localMatch = null;
  var loading = new Loading();
  var localPlayerId = null;
  var localTeam = null;
  var localName = 'Player';
  var lastInputTime = 0;
  var INPUT_INTERVAL = 1000 / 30;
  var gameState = 'lobby';
  var mode = null;

  var menuEl = document.getElementById('menu');
  var lobbyEl = document.getElementById('lobby');
  var gameOverEl = document.getElementById('gameOver');

  function initWorld(settings) {
    if (world) { try { world.dispose(); } catch (e) {} }
    world = new World(canvas, settings);
    netcode = new Netcode();
    hud = new HUD();
    if (!controls) {
      if (isMobile) controls = new MobileControls(canvas);
      else { controls = new PCControls(canvas); }
    }
  }

  function requestFullscreen() {
    var c = document.getElementById('canvas');
    if (c.requestFullscreen) c.requestFullscreen();
    else if (c.webkitRequestFullscreen) c.webkitRequestFullscreen();
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape'); } catch (e) {}
  }

  function startLocal() {
    try {
      setMsg('');
      mode = 'local';
      gameState = 'playing';
      loading.show();
      setTimeout(function() {
        try {
          initWorld({ weather: 'clear', stadium: 'classic' });
          localMatch = new LocalMatch(world, controls);
          localMatch.start();
          showScreen('game');
          if (!isMobile) requestFullscreen();
          var hint = document.getElementById('hudHint');
          if (hint) hint.textContent = 'WASD Move  |  Space Shoot  |  Shift Sprint  |  E Tackle';
        } catch (e) {
          setMsg('Local match failed: ' + (e && e.message ? e.message : String(e)));
          showScreen('game');
          if (!isMobile) requestFullscreen();
        } finally {
          loading.hide();
        }
      }, 100);
    } catch (e) {
      loading.hide();
      setMsg('Local match failed: ' + (e && e.message ? e.message : String(e)));
      showScreen('menu');
    }
  }

  function startOnline() {
    try {
      mode = 'online';
      gameState = 'playing';
      loading.show();
      setTimeout(function() {
        try {
          if (hud) hud.show();
          showScreen('game');
          if (!isMobile) requestFullscreen();
          var hint = document.getElementById('hudHint');
          if (hint) hint.textContent = 'WASD Move  |  Space Shoot  |  Shift Sprint  |  E Tackle';
        } catch (e) {
          setMsg('Online start failed: ' + (e && e.message ? e.message : String(e)));
          showScreen('game');
        } finally {
          loading.hide();
        }
      }, 100);
    } catch (e) {
      loading.hide();
      setMsg('Online start failed: ' + (e && e.message ? e.message : String(e)));
      showScreen('menu');
    }
  }

  function renderLobby(summary) {
    try {
      var title = document.getElementById('lobbyTitle');
      if (title) title.textContent = 'Lobby - ' + (summary && summary.name || '');
      var list = document.getElementById('lobbyPlayers');
      if (list) {
        list.innerHTML = '';
        if (summary && summary.clients) {
          for (var i = 0; i < summary.clients.length; i++) {
            var c = summary.clients[i];
            var d = document.createElement('div');
            d.textContent = c.name + ' - ' + c.team + (c.id === localPlayerId ? ' (you)' : '');
            list.appendChild(d);
          }
        }
      }
      var settingsEl = document.getElementById('lobbySettings');
      if (settingsEl && summary && summary.settings) {
        var s = summary.settings;
        settingsEl.innerHTML = 'Weather: ' + s.weather + ' &nbsp;|&nbsp; Stadium: ' + s.stadium + ' &nbsp;|&nbsp; Kit: ' + (s.kit || 'home');
      }
      var btnStart = document.getElementById('btnStart');
      if (btnStart) btnStart.disabled = !(localPlayerId && summary && summary.clients && summary.clients.length >= 2);
    } catch (e) { setMsg('renderLobby error: ' + String(e)); }
  }

  function showScreen(name) {
    try {
      [menuEl, lobbyEl, gameOverEl].forEach(function(el) { if (el) el.classList.add('hidden'); });
      var hudEl = document.getElementById('hud');
      if (hudEl) hudEl.classList.add('hidden');
      var cm = document.getElementById('controlsMobile');
      if (cm) cm.classList.add('hidden');
      if (name === 'menu') { if (menuEl) menuEl.classList.remove('hidden'); }
      if (name === 'lobby') { if (lobbyEl) lobbyEl.classList.remove('hidden'); }
      if (name === 'game') {
        if (hudEl) hudEl.classList.remove('hidden');
        if (isMobile) { if (cm) cm.classList.remove('hidden'); }
      }
      if (name === 'gameover') { if (gameOverEl) gameOverEl.classList.remove('hidden'); }
    } catch (e) { setMsg('showScreen error: ' + String(e)); }
  }

  function sendInputLoop() {
    try {
      if (!controls || gameState !== 'playing') return;
      var now = Date.now();
      if (now - lastInputTime < INPUT_INTERVAL) return;
      lastInputTime = now;
      if (mode === 'local') {
        if (!localMatch) return;
        var lnow = performance.now();
        var ldt = Math.min((lnow - (world ? world.lastTime : lnow)) / 1000, 0.1);
        if (world) world.lastTime = lnow;
        localMatch.update();
        if (world) world.update(ldt);
        if (world) world.render();
        return;
      }
      if (!socket || !socket.connected()) return;
      var input = controls.update();
      if (netcode) netcode.setLocalPlayerId(localPlayerId);
      var packed = netcode ? netcode.makeInput(input.x, input.z, input) : input;
      if (socket) socket.sendInput(packed);
      applyLocalInput(input);
    } catch (e) { setMsg('input loop error: ' + String(e)); }
  }

  function applyLocalInput(input) {
    try {
      if (!localMatch || !world) return;
    } catch (e) {}
  }

  function loop() {
    requestAnimationFrame(loop);
    try {
      if (world) {
        sendInputLoop();
        if (gameState === 'playing' && mode === 'online') {
          var now = performance.now();
          var dt = Math.min((now - (world.lastTime || now)) / 1000, 0.1);
          world.lastTime = now;
          world.update(dt);
        }
        world.render();
      }
    } catch (e) { setMsg('render loop error: ' + String(e)); }
  }

  function connect() {
    try {
      socket = new SocketClient(window.location.origin);
      var menuUI = new Menu();

      socket.on('connect', function() { console.log('socket connected'); });
      socket.on('disconnect', function() { console.log('socket disconnected'); });

      socket.on(MSG.JOIN_ROOM, function(data) {
        try {
          if (!data || !data.ok) { setMsg('Failed to join room'); return; }
          localPlayerId = socket && socket.socket ? socket.socket.id : null;
          localTeam = data.team;
          localName = data.name || 'Player';
          initWorld(data.settings || {});
          if (localPlayerId && netcode) netcode.setLocalPlayerId(localPlayerId);
          if (world) world.addPlayer(localPlayerId, localTeam, localName, 0, 0, true);
          showScreen('lobby');
        } catch (e) { setMsg('join error: ' + String(e)); }
      });

      socket.on(MSG.SYNC_STATE, function(snap) {
        try {
          if (!netcode) return;
          netcode.applySnapshot(snap);
          if (hud) { hud.setScore(snap.score.home, snap.score.away); hud.setTime(snap.time); }
          if (netcode) netcode.setLocalPlayerId(localPlayerId);
          if (world) {
            world.setBallData(snap.ball);
            if (snap.players) {
              for (var i = 0; i < snap.players.length; i++) {
                var p = snap.players[i];
                if (p.id === localPlayerId) continue;
                world.setPlayerData(p.id, p);
              }
            }
          }
        } catch (e) { setMsg('sync error: ' + String(e)); }
      });

      socket.on(MSG.GOAL_SCORED, function(data) {
        try { if (hud && data && data.score) hud.setScore(data.score.home, data.score.away); } catch (e) {}
      });

      socket.on(MSG.MATCH_END, function(data) {
        try {
          gameState = 'ended';
          if (hud) hud.hide();
          var goScore = document.getElementById('goScore');
          var goTitle = document.getElementById('goTitle');
          if (goScore && data && data.score) goScore.textContent = 'Home ' + data.score.home + ' - ' + data.score.away + '  (' + (data.winner || 'draw') + ')';
          if (goTitle) goTitle.textContent = 'Match Over';
          if (gameOverEl) gameOverEl.classList.remove('hidden');
        } catch (e) {}
      });

      socket.on(MSG.ROOM_STATE, function(summary) {
        try { renderLobby(summary); } catch (e) {}
      });

      socket.on(MSG.ERROR, function(data) {
        try { setMsg(data && data.message ? data.message : 'Error'); } catch (e) {}
      });

      var btnCreate = document.getElementById('btnCreate');
      var btnJoin = document.getElementById('btnJoin');
      var btnStart = document.getElementById('btnStart');
      var btnLeave = document.getElementById('btnLeaveLobby');
      var goBack = document.getElementById('goBack');
      var btnLocal = document.getElementById('btnLocal');

      if (btnCreate) btnCreate.addEventListener('click', function() {
        var nameEl = document.getElementById('inpName');
        var teamEl = document.getElementById('inpTeam');
        localName = (nameEl && nameEl.value) || 'Player';
        localTeam = (teamEl && teamEl.value) || 'home';
        if (socket) socket.join('create-' + Date.now(), localName, localTeam);
      });
      if (btnJoin) btnJoin.addEventListener('click', function() {
        var nameEl = document.getElementById('inpName');
        var roomEl = document.getElementById('inpRoomId');
        var teamEl = document.getElementById('inpTeam');
        localName = (nameEl && nameEl.value) || 'Player';
        localTeam = (teamEl && teamEl.value) || 'home';
        if (socket) socket.join((roomEl && roomEl.value) || 'room-1', localName, localTeam);
      });
      if (btnStart) btnStart.addEventListener('click', function() {
        if (socket) socket.startMatch();
        startOnline();
      });
      if (btnLeave) btnLeave.addEventListener('click', function() { showScreen('menu'); });
      if (goBack) goBack.addEventListener('click', function() { showScreen('menu'); location.reload(); });
      if (btnLocal) btnLocal.addEventListener('click', function(e) {
        if (e) e.preventDefault();
        startLocal();
      });

      menuUI.onSetting = function(key, value) {
        try {
          if (socket) socket.setSetting(key, value);
          if (world) world.setSettings({ [key]: value });
          if (key === 'platform') { /* platform handled elsewhere */ }
        } catch (e) {}
      };
      menuUI.onSetName = function(n) { localName = n; if (socket) socket.setName(n); };
      menuUI.onSetTeam = function(t) { localTeam = t; if (socket) socket.setTeam(t); };

      window.addEventListener('resize', function() { if (world) world.resize(); });

      showScreen('menu');
      loop();
    } catch (e) {
      setMsg('Connect failed: ' + (e && e.message ? e.message : String(e)));
      showScreen('menu');
      loop();
    }
  }

  window.addEventListener('error', function(evt) {
    setMsg('JS error: ' + (evt.message || String(evt)));
  });

  window.__startLocal__ = startLocal;
  window.__joinRoom__ = function(roomId) {
    var nameEl = document.getElementById('inpName');
    var teamEl = document.getElementById('inpTeam');
    localName = (nameEl && nameEl.value) || 'Player';
    localTeam = (teamEl && teamEl.value) || 'home';
    if (socket) socket.join(roomId, localName, localTeam);
  };
  window.__forceHideLoading__ = function() { loading.hide(); showScreen('game'); };

  connect();

})();
