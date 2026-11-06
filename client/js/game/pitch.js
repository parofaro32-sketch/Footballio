import * as THREE from 'three';
import { PITCH, TEAM_COLORS } from '/shared/constants.js';

export class Pitch {
  constructor(stadium = 'classic', isMobile = false) {
    this.isMobile = isMobile;
    this.stadium = stadium;
    this.group = new THREE.Group();
    this._build();
    this.setStadium(stadium);
  }
  _build() {
    const halfL = PITCH.LENGTH / 2;
    const halfW = PITCH.WIDTH / 2;

    const geo = new THREE.PlaneGeometry(PITCH.LENGTH, PITCH.WIDTH, 32, 32);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const alt = TEAM_COLORS.pitchGrassAlt;
    const base = TEAM_COLORS.pitchGrass;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const band = Math.floor((x + halfL) / 8) % 2;
      pos.setY(i, band ? 0.01 : 0);
    }
    geo.computeVertexNormals();

    this.material = new THREE.MeshStandardMaterial({ color: base, roughness: 0.9, metalness: 0 });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    this.lines = new THREE.Group();
    this._line(-halfL, 0, halfL, 0);
    this._line(halfL, 0, -halfL, 0);
    this._line(-halfL, -halfW, -halfL, halfW);
    this._line(halfL, -halfW, halfL, halfW);
    this._line(0, -halfW, 0, halfW);
    this._circle(0, 0, PITCH.CENTER_RADIUS);
    this._line(-halfL, -PITCH.PENALTY_AREA, -halfL, PITCH.PENALTY_AREA);
    this._line(-halfL + 4, -PITCH.PENALTY_AREA, -halfL + 4, PITCH.PENALTY_AREA);
    this._line(-halfL + 4, -PITCH.PENALTY_AREA, -halfL, -PITCH.PENALTY_AREA);
    this._line(-halfL + 4, PITCH.PENALTY_AREA, -halfL, PITCH.PENALTY_AREA);
    this._line(halfL, -PITCH.PENALTY_AREA, halfL, PITCH.PENALTY_AREA);
    this._line(halfL - 4, -PITCH.PENALTY_AREA, halfL - 4, PITCH.PENALTY_AREA);
    this._line(halfL - 4, -PITCH.PENALTY_AREA, halfL, -PITCH.PENALTY_AREA);
    this._line(halfL - 4, PITCH.PENALTY_AREA, halfL, PITCH.PENALTY_AREA);
    this.group.add(this.lines);

    this.goals = new THREE.Group();
    this._goal(-halfL);
    this._goal(halfL);
    this.group.add(this.goals);

    const stands = new THREE.Group();
    this._stands(stands, -halfL - 6);
    this._stands(stands, halfL + 6);
    this._standsSide(stands, -halfW - 6, 0, 1);
    this._standsSide(stands, halfW + 6, 0, 0);
    this.group.add(stands);
  }
  _line(x1, z1, x2, z2) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, 0.02, z1), new THREE.Vector3(x2, 0.02, z2)]);
    const m = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const l = new THREE.Line(g, m);
    this.lines.add(l);
  }
  _circle(x, z, r) {
    const pts = [];
    for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI * 2; pts.push(new THREE.Vector3(x + Math.cos(a) * r, 0.02, z + Math.sin(a) * r)); }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.lines.add(new THREE.LineLoop(g, m));
  }
  _goal(x) {
    const gw = PITCH.GOAL_WIDTH / 2;
    const gh = PITCH.GOAL_HEIGHT;
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, gh, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    post.position.set(x, gh / 2, -gw); post.castShadow = true; g.add(post);
    const post2 = post.clone(); post2.position.set(x, gh / 2, gw); g.add(post2);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, gw * 2, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    bar.rotation.z = Math.PI / 2; bar.position.set(x, gh, 0); bar.castShadow = true; g.add(bar);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(gw * 2, gh), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
    net.position.set(x, gh / 2, 0); net.rotation.y = Math.PI / 2; g.add(net);
    this.goals.add(g);
  }
  _stands(g, z) {
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const h = 2 + r * 1.5;
      const deep = new THREE.Mesh(new THREE.BoxGeometry(PITCH.LENGTH, h, 3), new THREE.MeshStandardMaterial({ color: 0x333 }));
      deep.position.set(0, h / 2 + 0.1, z - 2 - r * 3.5);
      g.add(deep);
    }
  }
  _standsSide(g, z, x, dir) {
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const h = 2 + r * 1.5;
      const deep = new THREE.Mesh(new THREE.BoxGeometry(3, h, PITCH.WIDTH), new THREE.MeshStandardMaterial({ color: 0x333 }));
      deep.position.set(z, h / 2 + 0.1, x);
      g.add(deep);
    }
  }
  setStadium(stadium) {
    this.stadium = stadium;
    let sky, grass, ambient;
    if (stadium === 'night') { sky = 0x050a14; grass = 0x1a2b1a; ambient = 0x404040; }
    else if (stadium === 'desert') { sky = 0x2b2012; grass = 0x3a3a1a; ambient = 0x605030; }
    else { sky = 0x0b1a0f; grass = TEAM_COLORS.pitchGrass; ambient = 0xffffff; }
    this.scene && this.scene.background && (this.scene.background = new THREE.Color(sky));
    this.material.color.set(grass);
    if (this.scene) this.scene.fog.color.set(sky);
  }
}
