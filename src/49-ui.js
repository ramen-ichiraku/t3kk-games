/* ================= інтерфейс ================= */
var UI = {
  hp: document.getElementById('hpFill'), st: document.getElementById('stFill'),
  fl: document.getElementById('flasks'), roe: document.getElementById('roe'),
  boss: document.getElementById('boss'), bossName: document.getElementById('bossName'),
  bossFill: document.getElementById('bossFill'),
  prompt: document.getElementById('prompt'), area: document.getElementById('area'),
  got: document.getElementById('got'), died: document.getElementById('died'),
  lock: document.getElementById('lockmark'), fade: document.getElementById('fade'),
  cards: document.getElementById('cards'),
  cStart: document.getElementById('cStart'), cFire: document.getElementById('cFire'),
  cWin: document.getElementById('cWin'), lvlList: document.getElementById('lvlList'),
  fireNote: document.getElementById('fireNote'), crosshair: document.getElementById('crosshair')
};
function bar(el, k){ el.style.transform = 'scaleX(' + Math.max(0, Math.min(1, k)) + ')'; }
function syncUI(){
  bar(UI.hp, P.hp / P.hpMax);
  bar(UI.st, P.st / P.stMax);
  UI.fl.textContent = P.flasks;
  UI.roe.textContent = P.roe;
  if (boss && G.bossOn) bar(UI.bossFill, boss.hp / boss.hpMax);
}
function showArea(name){
  UI.area.querySelector('.t').textContent = name;
  UI.area.classList.remove('show');
  void UI.area.offsetWidth;
  UI.area.classList.add('show');
}
function showGot(txt){
  UI.got.textContent = txt;
  UI.got.classList.remove('show');
  void UI.got.offsetWidth;
  UI.got.classList.add('show');
}
function setPrompt(txt){
  if (txt) { UI.prompt.innerHTML = txt; UI.prompt.classList.add('on'); }
  else UI.prompt.classList.remove('on');
}
function fade(on, cb){
  UI.fade.classList.toggle('on', on);
  if (cb) setTimeout(cb, 460);
}

