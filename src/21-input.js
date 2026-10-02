/* ================= ввід ================= */
/* Браузер дає захопити мишу лише у відповідь на СПРАВЖНІЙ клік. На штучний
   він відмовляє — і, що гірше, після відмови блокує й наступні спроби, тож
   миша не захоплювалась уже ніколи. Тому зі штучного кліку навіть не
   пробуємо: гравець натисне сам, і тоді все спрацює з першого разу. */
function grabMouse(e){
  if (e && e.isTrusted === false) return;
  if (!cvs.requestPointerLock) return;
  try {
    var r = cvs.requestPointerLock();
    if (r && r.catch) r.catch(function(){});
  } catch (e) {}
}
var keys = {};
function tok(e){
  var c = e.code;
  if (c) return c;
  var k = (e.key || '').toLowerCase();
  if (k === 'w' || k === 'ц') return 'KeyW';
  if (k === 'a' || k === 'ф') return 'KeyA';
  if (k === 's' || k === 'і') return 'KeyS';
  if (k === 'd' || k === 'в') return 'KeyD';
  if (k === 'q' || k === 'й') return 'KeyQ';
  if (k === 'f' || k === 'а') return 'KeyF';
  if (k === 'e' || k === 'у') return 'KeyE';
  if (k === 'p' || k === 'з') return 'KeyP';
  if (k === ' ') return 'Space';
  if (k === 'escape') return 'Escape';
  if (k === 'shift') return 'ShiftLeft';
  return e.key || '';
}
var pressed = {};
window.addEventListener('keydown', function(e){
  var c = tok(e);
  keys[c] = 1;
  if (!pressed[c]) { pressed[c] = 1; onPress(c, e); }
  if (['KeyW','KeyA','KeyS','KeyD','Space','KeyQ','KeyE','KeyF','ShiftLeft','Tab'].indexOf(c) >= 0) e.preventDefault();
});
window.addEventListener('keyup', function(e){ var c = tok(e); keys[c] = 0; pressed[c] = 0; });
window.addEventListener('blur', function(){ keys = {}; pressed = {}; if (G.mode === 'play') pause(true); });

var mouse = { dx:0, dy:0, locked:false, lmb:false, rmb:false };
var cvs = renderer.domElement;
cvs.addEventListener('mousedown', function(e){
  if (G.mode !== 'play') return;
  if (!mouse.locked && cvs.requestPointerLock) { grabMouse(e); return; }
  if (e.button === 0) { mouse.lmb = true; attack(!!keys.ShiftLeft); }
  if (e.button === 1) { toggleLock(); e.preventDefault(); }
  if (e.button === 2) mouse.rmb = true;
});
window.addEventListener('mouseup', function(e){
  if (e.button === 0) mouse.lmb = false;
  if (e.button === 2) mouse.rmb = false;
});
cvs.addEventListener('contextmenu', function(e){ e.preventDefault(); });
document.addEventListener('pointerlockchange', function(){
  mouse.locked = document.pointerLockElement === cvs;
  document.getElementById('crosshair').classList.toggle('on', mouse.locked && G.mode === 'play');
});
document.addEventListener('mousemove', function(e){
  if (!mouse.locked) return;
  mouse.dx += e.movementX || 0;
  mouse.dy += e.movementY || 0;
});

/* дотик: ліва половина — рух, права — камера, подвійний тап — удар */
var touchMove = null, touchLook = null;
cvs.addEventListener('touchstart', function(e){
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (t.clientX < window.innerWidth * 0.45) {
      if (!touchMove) touchMove = { id:t.identifier, ox:t.clientX, oy:t.clientY, dx:0, dy:0 };
    } else if (!touchLook) {
      touchLook = { id:t.identifier, x:t.clientX, y:t.clientY, t:performance.now() };
    }
  }
}, { passive:true });
cvs.addEventListener('touchmove', function(e){
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (touchMove && t.identifier === touchMove.id) {
      var dx = t.clientX - touchMove.ox, dy = t.clientY - touchMove.oy;
      var d = Math.hypot(dx, dy);
      if (d > 58) { dx = dx / d * 58; dy = dy / d * 58; }
      touchMove.dx = dx; touchMove.dy = dy;
    } else if (touchLook && t.identifier === touchLook.id) {
      mouse.dx += (t.clientX - touchLook.x) * 1.6;
      mouse.dy += (t.clientY - touchLook.y) * 1.6;
      touchLook.x = t.clientX; touchLook.y = t.clientY;
    }
  }
}, { passive:true });
function endTouch(e){
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    if (touchMove && t.identifier === touchMove.id) touchMove = null;
    if (touchLook && t.identifier === touchLook.id) {
      if (performance.now() - touchLook.t < 220 && G.mode === 'play') attack();
      touchLook = null;
    }
  }
}
cvs.addEventListener('touchend', endTouch, { passive:true });
cvs.addEventListener('touchcancel', endTouch, { passive:true });

