import * as THREE from 'three';
import { BALL } from '/shared/constants.js';

export class Ball {
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL.RADIUS, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 })
    );
    this.mesh.castShadow = true;
    this.mesh.position.y = BALL.RADIUS;
    this.data = { x: 0, y: BALL.RADIUS, z: 0, vx: 0, vz: 0, ownerId: null };
  }
  setData(data) { this.data = data; }
  update(dt) {
    const d = this.data;
    this.mesh.position.set(d.x, d.y || BALL.RADIUS, d.z);
  }
}
