export class Menu {
  constructor(onCreate, onJoin, onSetting, onSetName, onSetTeam) {
    this.onCreate = onCreate;
    this.onJoin = onJoin;
    this.onSetting = onSetting;
    this.onSetName = onSetName;
    this.onSetTeam = onSetTeam;
    this._bind();
  }
  _bind() {
    const $ = (id) => document.getElementById(id);
    $('btnCreate').addEventListener('click', () => this.onCreate());
    $('btnJoin').addEventListener('click', () => this.onJoin($('inpRoomId').value || null));
    $('inpName').addEventListener('change', (e) => this.onSetName(e.target.value));
    $('inpTeam').addEventListener('change', (e) => this.onSetTeam(e.target.value));
    $('inpKit').addEventListener('change', (e) => this.onSetting('kit', e.target.value));
    $('inpWeather').addEventListener('change', (e) => this.onSetting('weather', e.target.value));
    $('inpStadium').addEventListener('change', (e) => this.onSetting('stadium', e.target.value));
    $('inpPlatform').addEventListener('change', (e) => {
      const scheme = e.target.value === 'auto' ? null : e.target.value;
      this.onSetting('platform', scheme);
    });
  }
  show() { document.getElementById('menu').classList.remove('hidden'); }
  hide() { document.getElementById('menu').classList.add('hidden'); }
  setMsg(text) { document.getElementById('msg').textContent = text; }
  setRooms(rooms) {
    const el = document.getElementById('roomsList');
    el.innerHTML = '';
    for (const r of rooms) {
      const d = document.createElement('div');
      d.textContent = r.name + ' (' + r.clients.length + '/22)';
      d.style.cursor = 'pointer';
      d.onclick = () => this.onJoin(r.id);
      el.appendChild(d);
    }
  }
}
