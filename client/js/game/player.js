import * as THREE from 'three';
import { PLAYER, TEAM_COLORS } from '/shared/constants.js';

export class Player {
  constructor(id, team, name, x, z, isLocal, colors) {
    this.id = id;
    this.team = team;
    this.name = name;
    this.isLocal = isLocal;
    this.colors = colors;
    this.data = { x, y: 0, z, vx: 0, vz: 0, rx: 0, rz: 0, hasBall: false, sprinting: false };
    this.mesh = new THREE.Group();
    this._buildBody();
    this.mesh.position.set(x, 0, z);
    this.nameMesh = null;
  }
  _buildBody() {
    const color = this.team === 'home' ? this.colors.home : this.colors.away;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.2, 8, 12), new THREE.MeshStandardMaterial({ color }));
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    this.mesh.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0xddaa88 }));
    head.position.set(0, 1.0, 0);
    head.castShadow = true;
    this.mesh.add(head);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.35), new THREE.MeshStandardMaterial({ color: this.team === 'home' ? 0xffffff : 0xffffff }));
    shirt.position.set(0, 0.6, 0.22);
    this.mesh.add(shirt);
    const short = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.25), new THREE.MeshStandardMaterial({ color: 0x111 }));
    short.position.set(0, 0.25, 0.2);
    this.mesh.add(short);
  }
  setData(data) { this.data = data; }
  update(dt, camPos) {
    const d = this.data;
    this.mesh.position.set(d.x, d.y, d.z);
    if (d.rx !== 0 || d.rz !== 0) {
      const angle = Math.atan2(d.rx, -d.rz);
      this.mesh.rotation.y = angle;
    }
    if (this.nameMesh) {
      this.nameMesh.position.set(d.x, 1.6, d.z);
      this.nameMesh.lookAt(camPos);
    }
  }
}

Player.MeshGroup = class {
  constructor() {
    this.group = new THREE.Group();
    this.map = new Map();
  }
  add(p) { this.group.add(p.mesh); this.map.set(p.id, p); }
  remove(p) { this.group.remove(p.mesh); this.map.delete(p.id); }
  update(dt, camPos) {
    for (const p of this.map.values()) p.update(dt, camPos);
  }
};
