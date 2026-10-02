/* ================= натискання ================= */
function onPress(c, e){
  if (c === 'Escape' || c === 'KeyP') { if (G.mode === 'play' || G.mode === 'pause') pause(G.mode === 'play'); return; }
  if (G.mode !== 'play') return;
  if (c === 'KeyE') interact();
  else if (c === 'KeyF') jump();
  else if (c === 'KeyQ') quaff();
  else if (c === 'Tab') toggleLock();
}
function pause(on){
  if (on) { G.mode = 'pause'; exitLock(); if (AB.mus) AB.mus.gain.value = 0; }
  else { G.mode = 'play'; ac(); if (AB.mus) AB.mus.gain.value = 0.42; }
  document.getElementById('bPause').textContent = on ? 'Далі' : 'Пауза';
}

/* ================= кнопки ================= */
document.getElementById('bGo').addEventListener('click', function(e){
  UI.cStart.hidden = true;
  G.mode = 'play';
  aInit(); musicStart();
  showArea('Каплиця Пробудження');
  grabMouse(e);
  syncUI();
});
document.getElementById('bRest').addEventListener('click', restAtFire);
document.getElementById('bLeave').addEventListener('click', function(){
  UI.cFire.hidden = true; G.mode = 'play';
});
document.getElementById('bAgain').addEventListener('click', function(){ location.reload(); });
document.getElementById('bPause').addEventListener('click', function(){ pause(G.mode === 'play'); });
var bs = document.getElementById('bSound');
bs.textContent = sound ? 'Звук: увімк.' : 'Звук: вимк.';
bs.addEventListener('click', function(){
  setSound(!sound);
  bs.textContent = sound ? 'Звук: увімк.' : 'Звук: вимк.';
  if (sound) musicStart();
});

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

