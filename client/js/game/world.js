import * as THREE from 'three';
import { PITCH, TEAM_COLORS, PLAYER, BALL, WEATHER, STADIUM } from '/shared/constants.js';
import { Pitch } from './pitch.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { Weather } from './graphics/weather.js';
import { Kits } from './graphics/kits.js';
import { LOD } from './graphics/lod.js';

export class World {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings || { weather: 'clear', stadium: 'classic' };
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.pixelRatio = this.isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.isMobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b1a0f, 30, 140);

    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.5, 300);
    this.camera.position.set(0, 18, -40);
    this.camera.lookAt(0, 0, 0);

    this.light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.light.position.set(30, 60, 30);
    this.light.castShadow = !this.isMobile;
    this.light.shadow.mapSize.width = this.isMobile ? 512 : 1024;
    this.light.shadow.mapSize.height = this.isMobile ? 512 : 1024;
    this.scene.add(this.light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    this.pitch = new Pitch(this.settings.stadium, this.isMobile);
    this.pitch.scene = this.scene;
    this.scene.add(this.pitch.mesh);

    this.ball = new Ball();
    this.scene.add(this.ball.mesh);

    this.players = new Map();
    this.playerMesh = new Player.MeshGroup();
    this.scene.add(this.playerMesh.group);
    this.lod = new LOD();
    this.weather = new Weather(this.settings.weather, this.scene, this.isMobile);

    this.lastTime = performance.now();
    this.onBallKick = null;
    this.onGoal = null;
  }

  setSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    if (this.settings.weather !== undefined) this.weather.set(this.settings.weather);
    if (this.settings.stadium !== undefined) this.pitch.setStadium(this.settings.stadium);
  }

  addPlayer(id, team, name, x, z, isLocal) {
    const p = new Player(id, team, name, x, z, isLocal, TEAM_COLORS);
    this.players.set(id, p);
    this.playerMesh.add(p);
    return p;
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (p) { this.playerMesh.remove(p); this.players.delete(id); }
  }
  setPlayerData(id, data) {
    const p = this.players.get(id);
    if (!p) return;
    p.setData(data);
  }
  setBallData(data) { this.ball.setData(data); }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  update(dt) {
    this.lod.update(this.camera.position);
    this.playerMesh.update(dt, this.camera.position);
    this.ball.update(dt);
    this.weather.update(dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
