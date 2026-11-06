import * as THREE from 'three';

export class Weather {
  constructor(type, scene, isMobile) {
    this.scene = scene;
    this.isMobile = isMobile;
    this.particles = null;
    this.count = isMobile ? 120 : 500;
    this.set(type);
  }
  set(type) {
    if (this.particles) { this.scene.remove(this.particles); this.particles.geometry.dispose(); this.particles.material.dispose(); this.particles = null; }
    if (type === 'clear') return;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.count * 3);
    const vel = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
      vel[i] = type === 'snow' ? 0.04 + Math.random() * 0.04 : 0.15 + Math.random() * 0.15;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.userData.vel = vel;
    const mat = new THREE.PointsMaterial({ color: type === 'snow' ? 0xffffff : 0xaaaaee, size: isMobile ? 0.15 : 0.1, transparent: true, opacity: 0.6 });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
    this.type = type;
    this.wind = 0;
  }
  update(dt) {
    if (!this.particles) return;
    const pos = this.particles.geometry.attributes.position;
    const vel = this.particles.geometry.userData.vel;
    for (let i = 0; i < this.count; i++) {
      pos.setY(i, pos.getY(i) - vel[i]);
      pos.setX(i, pos.getX(i) + Math.sin(Date.now() * 0.001 + i) * 0.01);
      if (pos.getY(i) < 0) pos.setY(i, 80 + Math.random() * 20);
    }
    pos.needsUpdate = true;
  }
}
