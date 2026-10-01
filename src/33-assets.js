/* ================= будівник риболюда ================= */
function buildFish(cfg){
  var c = Object.assign({
    body: M.scale, belly: M.scaleD, fin: M.fin, skin: M.skin,
    s: 1, bald: true, hairs: 3, eye: 0x1a1c22, crown: false
  }, cfg || {});
  var g = new THREE.Group();
  var P = {};

  var hip = new THREE.Group();
  hip.position.y = 0.92 * c.s;
  g.add(hip);
  P.hip = hip;

  // тулуб — витягнута риб'яча туша
  var torso = new THREE.Group();
  hip.add(torso);
  P.torso = torso;
  var body = new THREE.Mesh(new THREE.SphereGeometry(0.42 * c.s, 14, 11), c.body);
  body.scale.set(0.86, 1.18, 0.7);
  body.position.y = 0.16 * c.s;
  body.castShadow = !LOWFX;
  torso.add(body);
  var belly = new THREE.Mesh(new THREE.SphereGeometry(0.33 * c.s, 12, 9), c.belly);
  belly.scale.set(0.8, 0.95, 0.55);
  belly.position.set(0, 0.06 * c.s, 0.12 * c.s);
  torso.add(belly);

  // спинний плавець
  var dors = new THREE.Mesh(new THREE.ConeGeometry(0.2 * c.s, 0.5 * c.s, 3), c.fin);
  dors.position.set(0, 0.5 * c.s, -0.2 * c.s);
  dors.rotation.x = -0.5;
  dors.scale.z = 0.3;
  torso.add(dors);

  // хвіст
  var tail = new THREE.Group();
  tail.position.set(0, -0.12 * c.s, -0.3 * c.s);
  torso.add(tail);
  var tfin = new THREE.Mesh(new THREE.ConeGeometry(0.3 * c.s, 0.62 * c.s, 4), c.fin);
  tfin.rotation.x = Math.PI / 2 + 0.25;
  tfin.scale.set(1, 1, 0.26);
  tfin.position.z = -0.3 * c.s;
  tail.add(tfin);
  P.tail = tail;

  // голова
  var head = new THREE.Group();
  head.position.y = 0.66 * c.s;
  torso.add(head);
  P.head = head;
  var skull = new THREE.Mesh(new THREE.SphereGeometry(0.28 * c.s, 14, 11), c.body);
  skull.scale.set(0.9, 0.92, 1.05);
  skull.castShadow = !LOWFX;
  head.add(skull);
  // морда й губи
  var snout = new THREE.Mesh(new THREE.SphereGeometry(0.15 * c.s, 10, 8), c.body);
  snout.position.set(0, -0.04 * c.s, 0.26 * c.s);
  head.add(snout);
  var lips = new THREE.Mesh(new THREE.TorusGeometry(0.085 * c.s, 0.045 * c.s, 6, 10), c.fin);
  lips.position.set(0, -0.05 * c.s, 0.37 * c.s);
  head.add(lips);
  // очі
  [-1, 1].forEach(function(s){
    var w = new THREE.Mesh(new THREE.SphereGeometry(0.075 * c.s, 8, 7), M.skin);
    w.material = new THREE.MeshLambertMaterial({ color: 0xf2ece0 });
    w.position.set(s * 0.19 * c.s, 0.04 * c.s, 0.17 * c.s);
    head.add(w);
    var p = new THREE.Mesh(new THREE.SphereGeometry(0.042 * c.s, 7, 6), new THREE.MeshBasicMaterial({ color: c.eye }));
    p.position.set(s * 0.22 * c.s, 0.04 * c.s, 0.21 * c.s);
    head.add(p);
  });
  // зябра
  [-1, 1].forEach(function(s){
    var gl = new THREE.Mesh(new THREE.BoxGeometry(0.02 * c.s, 0.16 * c.s, 0.1 * c.s), c.belly);
    gl.position.set(s * 0.245 * c.s, -0.02 * c.s, -0.02 * c.s);
    head.add(gl);
  });
  // лисина
  if (c.bald) {
    var pate = new THREE.Mesh(new THREE.SphereGeometry(0.235 * c.s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), c.skin);
    pate.position.set(0, 0.11 * c.s, -0.01 * c.s);
    pate.scale.set(1.02, 0.86, 1.04);
    head.add(pate);
    P.hairs = [];
    for (var h = 0; h < c.hairs; h++) {
      var hair = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * c.s, 0.014 * c.s, 0.26 * c.s, 4), M.wood);
      hair.position.set((h - (c.hairs - 1) / 2) * 0.07 * c.s, 0.3 * c.s, -0.02 * c.s);
      head.add(hair);
      P.hairs.push(hair);
    }
  }
  if (c.crown) {
    var cr = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * c.s, 0.3 * c.s, 0.16 * c.s, 8, 1, true), M.bossT);
    cr.position.set(0, 0.26 * c.s, 0);
    head.add(cr);
    for (var k = 0; k < 6; k++) {
      var sp = new THREE.Mesh(new THREE.ConeGeometry(0.05 * c.s, 0.22 * c.s, 4), M.bossT);
      var aa = k / 6 * Math.PI * 2;
      sp.position.set(Math.cos(aa) * 0.27 * c.s, 0.42 * c.s, Math.sin(aa) * 0.27 * c.s);
      head.add(sp);
    }
  }

  // руки
  P.arms = [];
  [-1, 1].forEach(function(s){
    var sh = new THREE.Group();
    sh.position.set(s * 0.33 * c.s, 0.4 * c.s, 0);
    torso.add(sh);
    var up = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * c.s, 0.065 * c.s, 0.34 * c.s, 6), c.body);
    up.position.y = -0.17 * c.s; up.castShadow = !LOWFX;
    sh.add(up);
    var el = new THREE.Group();
    el.position.y = -0.34 * c.s;
    sh.add(el);
    var fo = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * c.s, 0.055 * c.s, 0.32 * c.s, 6), c.body);
    fo.position.y = -0.16 * c.s;
    el.add(fo);
    var hand = new THREE.Group();
    hand.position.y = -0.32 * c.s;
    el.add(hand);
    var hm = new THREE.Mesh(new THREE.SphereGeometry(0.075 * c.s, 7, 6), c.skin);
    hand.add(hm);
    P.arms.push({ sh: sh, el: el, hand: hand, s: s });
  });

  // ноги
  P.legs = [];
  [-1, 1].forEach(function(s){
    var hp = new THREE.Group();
    hp.position.set(s * 0.17 * c.s, -0.12 * c.s, 0);
    hip.add(hp);
    var th = new THREE.Mesh(new THREE.CylinderGeometry(0.095 * c.s, 0.08 * c.s, 0.42 * c.s, 6), c.body);
    th.position.y = -0.21 * c.s; th.castShadow = !LOWFX;
    hp.add(th);
    var kn = new THREE.Group();
    kn.position.y = -0.42 * c.s;
    hp.add(kn);
    var sh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * c.s, 0.07 * c.s, 0.38 * c.s, 6), c.belly);
    sh2.position.y = -0.19 * c.s;
    kn.add(sh2);
    var ft = new THREE.Mesh(new THREE.BoxGeometry(0.16 * c.s, 0.1 * c.s, 0.3 * c.s), M.dark);
    ft.position.set(0, -0.4 * c.s, 0.06 * c.s);
    kn.add(ft);
    P.legs.push({ hp: hp, kn: kn, s: s });
  });

  // грудні плавці
  [-1, 1].forEach(function(s){
    var pf = new THREE.Mesh(new THREE.ConeGeometry(0.1 * c.s, 0.26 * c.s, 3), c.fin);
    pf.position.set(s * 0.3 * c.s, 0.1 * c.s, 0.1 * c.s);
    pf.rotation.set(0.4, 0, s * 1.2);
    pf.scale.z = 0.3;
    torso.add(pf);
  });

  g.userData.P = P;
  return g;
}

/* ================= Жидінький Меч ================= */
function buildSword(s){
  s = s || 1;
  var g = new THREE.Group();
  var grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.05 * s, 0.26 * s, 6), M.crust);
  grip.position.y = -0.1 * s;
  g.add(grip);
  var guard = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.05 * s, 0.09 * s), M.crust);
  guard.position.y = 0.04 * s;
  g.add(guard);

  // клинок із семи ланок, кожна провисає — м'якуш не тримає форму
  var segs = [], prev = g, LEN = 0.21 * s;
  for (var i = 0; i < 7; i++) {
    var j = new THREE.Group();
    j.position.y = i === 0 ? 0.07 * s : LEN;
    prev.add(j);
    var w = (0.155 - i * 0.012) * s;
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, LEN * 1.02, 0.055 * s), M.bread);
    b.position.y = LEN / 2;
    b.castShadow = !LOWFX;
    j.add(b);
    // скоринка по краях
    [-1, 1].forEach(function(sg){
      var cr = new THREE.Mesh(new THREE.BoxGeometry(0.018 * s, LEN * 1.02, 0.06 * s), M.crust);
      cr.position.set(sg * w / 2, LEN / 2, 0);
      j.add(cr);
    });
    segs.push(j);
    prev = j;
  }
  g.userData.segs = segs;
  return g;
}
function wobbleSword(sw, t, drive){
  var segs = sw.userData.segs;
  for (var i = 0; i < segs.length; i++) {
    var k = (i + 1) / segs.length;
    segs[i].rotation.x = 0.1 * k + Math.sin(t * 7 - i * 0.7) * 0.075 * k + drive * 0.26 * k;
    segs[i].rotation.z = Math.cos(t * 5.3 - i * 0.55) * 0.06 * k;
  }
}

