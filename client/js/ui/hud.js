export class HUD {
  constructor() {
    this.homeEl = document.getElementById('hudHome');
    this.awayEl = document.getElementById('hudAway');
    this.timeEl = document.getElementById('hudTime');
    this.weatherEl = document.getElementById('hudWeather');
  }
  show() { document.getElementById('hud').classList.remove('hidden'); }
  hide() { document.getElementById('hud').classList.add('hidden'); }
  setScore(home, away) { this.homeEl.textContent = 'Home ' + home; this.awayEl.textContent = 'Away ' + away; }
  setTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    this.timeEl.textContent = m + ':' + s;
  }
  setWeather(w) {
    const label = { clear: 'Clear', rain: 'Rain', snow: 'Snow' }[w] || w;
    this.weatherEl.textContent = label;
  }
}
