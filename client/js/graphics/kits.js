import * as THREE from 'three';
import { TEAM_COLORS } from '/shared/constants.js';

export class Kits {
  constructor() {
    this.home = new THREE.MeshStandardMaterial({ color: TEAM_COLORS.home, roughness: 0.4, metalness: 0.1 });
    this.away = new THREE.MeshStandardMaterial({ color: TEAM_COLORS.away, roughness: 0.4, metalness: 0.1 });
    this.homeColor = TEAM_COLORS.home;
    this.awayColor = TEAM_COLORS.away;
  }
  setHome(hex) { this.homeColor = hex; this.home.color.set(hex); }
  setAway(hex) { this.awayColor = hex; this.away.color.set(hex); }
  material(team) { return team === 'home' ? this.home : this.away; }
}
