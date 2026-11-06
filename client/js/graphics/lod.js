export class LOD {
  constructor() { this.camPos = null; }
  update(camPos) { this.camPos = camPos; }
  distance(camPos, x, y, z) {
    if (!camPos) return 0;
    const dx = x - camPos.x, dy = y - camPos.y, dz = z - camPos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  shouldSimplify(camPos, x, y, z) { return this.distance(camPos, x, y, z) > 25; }
}
