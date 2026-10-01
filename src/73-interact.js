/* ================= взаємодія ================= */
function nearest(){
  var d, best = null;
  if (G.inChapel) {
    d = Math.hypot(P.x - CHAPEL.x, P.z - (CHAPEL.z - 7));
    if (d < 3.4 && !doorOpen) return { kind: 'door', txt: '<b>E</b> — відчинити двері' };
  }
  for (var i = 0; i < FIRES.length; i++) {
    if (Math.hypot(P.x - FIRES[i].x, P.z - FIRES[i].z) < 3.4)
      return { kind: 'fire', fire: FIRES[i], txt: '<b>E</b> — ' + FIRES[i].name };
  }
  for (var r = 0; r < runes.length; r++) {
    if (Math.hypot(P.x - runes[r].x, P.z - runes[r].z) < 2.6)
      return { kind: 'rune', rune: runes[r], txt: '<b>E</b> — прочитати руну' };
  }
  if (G.roeDrop) {
    d = Math.hypot(P.x - G.roeDrop.x, P.z - G.roeDrop.z);
    if (d < 2.6) return { kind: 'roe', txt: '<b>E</b> — забрати ікру (' + G.roeDrop.amt + ')' };
  }
  return best;
}
function interact(){
  var n = G.prompt;
  if (!n) return;
  if (n.kind === 'door') {
    doorOpen = true;
    var idx = boxes.indexOf(doorCollider);
    if (idx >= 0) boxes.splice(idx, 1);
    if (ok()) { var t = AC.currentTime; nz(t, 1.1, 180, 0.6, 0.2, null, 70); tone(t, 90, 0.9, 'sawtooth', 0.1, 50); }
    setTimeout(function(){ showArea("Міждуп'я"); G.inChapel = false; }, 900);
  } else if (n.kind === 'fire') {
    G.fire = n.fire;
    G.mode = 'fire';
    exitLock();
    renderFire();
    UI.cFire.hidden = false;
    sFire();
  } else if (n.kind === 'rune') {
    showArea(n.rune.txt[0]);
    showGot(n.rune.txt[1]);
    if (ok()) { var t = AC.currentTime; tone(t, mf(76), 0.5, 'sine', 0.08); tone(t + 0.12, mf(83), 0.6, 'triangle', 0.05); }
  } else if (n.kind === 'roe') {
    P.roe += G.roeDrop.amt;
    showGot('Повернуто ' + G.roeDrop.amt + ' ікри');
    scene.remove(G.roeDrop.m);
    G.roeDrop = null;
    sRoe();
    syncUI();
  }
}
function renderFire(){
  var items = [
    { k: 'vit', n: 'Живучість', v: P.vit, d: 'здоров\'я ' + statHp() + ' → ' + (78 + (P.vit + 1) * 22) },
    { k: 'end', n: 'Витривалість', v: P.end, d: 'запас ' + statSt() + ' → ' + (82 + (P.end + 1) * 18) },
    { k: 'str', n: 'Сила', v: P.str, d: 'шкода ' + statDmg() + ' → ' + (16 + (P.str + 1) * 8) }
  ];
  var cost = levelCost();
  UI.lvlList.innerHTML = items.map(function(it){
    return '<button class="lvl" type="button" data-k="' + it.k + '"' + (P.roe < cost ? ' disabled' : '') + '>' +
      '<span><span class="n">' + it.n + ' ' + it.v + '</span><br><span class="v">' + it.d + '</span></span>' +
      '<span class="c">' + cost + '</span></button>';
  }).join('');
  Array.prototype.forEach.call(UI.lvlList.querySelectorAll('.lvl'), function(b){
    b.addEventListener('click', function(){ levelUp(b.getAttribute('data-k')); });
  });
  UI.fireNote.textContent = 'Ікри: ' + P.roe + '. Ціна наступного рівня: ' + cost + '.';
}
function levelUp(k){
  var cost = levelCost();
  if (P.roe < cost) return;
  P.roe -= cost;
  P[k]++;
  P.hpMax = statHp(); P.stMax = statSt();
  P.hp = P.hpMax; P.st = P.stMax;
  sFire();
  renderFire();
  syncUI();
}
function restAtFire(){
  P.hp = P.hpMax; P.st = P.stMax; P.flasks = P.flasksMax;
  var F = G.fire || FIRES[0];
  P.respawnAt = { x: F.x, z: F.z + 2.4 };
  G.lock = null;
  UI.lock.classList.remove('on');
  for (var i = 0; i < fireObjs.length; i++) if (fireObjs[i].F === F) fireObjs[i].lit = true;
  spawnAll();
  if (boss && !G.bossDead) {
    boss.hp = boss.hpMax; boss.phase = 1; boss.st = 'sleep'; boss.dead = 0;
    boss.x = ARENA.x; boss.z = ARENA.z - 6;
    G.bossOn = false;
    UI.boss.classList.remove('on');
    gateMesh.visible = true;
  }
  UI.cFire.hidden = true;
  G.mode = 'play';
  showArea((G.fire || FIRES[0]).name);
  syncUI();
}

