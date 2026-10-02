/* ================= зона 1: Міждуп'я ================= */
var chapelDoor = null, doorOpen = false;
var CAMP = null;

ZONES.field = {
  id: 'field',
  name: "Міждуп'я",
  chapel: true,
  road: ROAD,
  edge: EDGE,
  spawn: { x: CHAPEL.x, z: CHAPEL.z + 1.8, yaw: Math.PI },
  sky: { bg: 0x1d2233, fog: 0x2a3044, near: 18, far: 165, sun: 1.0, amb: 0.26, hemi: 0.62 },

  h: function(x, z){
    var h = Math.sin(x * 0.052) * 1.2 + Math.cos(z * 0.045) * 1.0 + Math.sin((x + z) * 0.026) * 1.7;
    h += Math.sin(x * 0.132 + 1.7) * 0.34 + Math.cos(z * 0.148 - 0.6) * 0.3;
    // дорога притискає рельєф
    var rd = Math.exp(-Math.pow(roadDist(x, z) / 4.6, 2));
    h = h * (1 - rd * 0.9) - rd * 0.22;
    // майданчик каплиці
    var cd = Math.hypot(x - CHAPEL.x, z - CHAPEL.z);
    if (cd < 12) h = h * (cd / 12) + 0.15 * (1 - cd / 12);
    // селище стоїть на рівному
    var vd = Math.hypot(x - 22, z - 20);
    if (vd < 17) { var kv = Math.min(1, (17 - vd) / 9); h = h * (1 - kv) + 0.5 * kv; }
    // сухе русло перетинає поле — міст через нього єдиний
    var rv = Math.abs(z - RIVER_Z);
    if (rv < 9.5) h -= Math.pow(1 - rv / 9.5, 1.3) * 4.2;
    // скельний масив, у якому ховається печера
    var kd = Math.hypot(x - MASSIF.x, z - MASSIF.z);
    if (kd < MASSIF.r) h += Math.pow(Math.max(0, 1 - kd / MASSIF.r), 1.55) * 13;
    // прохід крізь масив: пласка рампа, інакше камера тоне у схилі
    var td = segDist(x, z, GX, GORGE.z0, GX, GORGE.z1);
    if (td < 5.4) {
      var kt = Math.min(1, (5.4 - td) / 2.6);
      var zc = Math.max(GORGE.z1, Math.min(GORGE.z0, z));
      var ramp = 0.6 + ((zc - GORGE.z0) / (GORGE.z1 - GORGE.z0)) * (-1.5 - 0.6);
      h = h * (1 - kt) + ramp * kt;
    }
    // зала боса: рівна підлога, інакше в ній неможливо битися
    var ad = Math.hypot(x - ARENA.x, z - ARENA.z);
    if (ad < ARENA.r + 6) {
      var ka = Math.min(1, (ARENA.r + 6 - ad) / 7);
      h = h * (1 - ka) + (-1.5) * ka;
    }
    // чаша по краю світу
    var r = Math.hypot(x, z);
    if (r > RIM) h += Math.min(15, Math.pow((r - RIM) * 0.5, 1.9));
    return h;
  },

  // ворогам не місце в ущелині й залі боса
  keepOut: function(f){
    var ad = Math.hypot(f.x - ARENA.x, f.z - ARENA.z);
    var lim = ARENA.r + 8;
    if (ad < lim) {
      var a = Math.atan2(f.x - ARENA.x, f.z - ARENA.z);
      f.x = ARENA.x + Math.sin(a) * lim;
      f.z = ARENA.z + Math.cos(a) * lim;
    }
    if (f.z < GORGE.z0 && Math.abs(f.x - GX) < 9) f.z = GORGE.z0;
  },

  build: function(root){
    seed = 1337;
    root.add(buildTerrainMesh(ZONES.field.h, 340, 176, function(x, z){
      var t = Math.max(0, 1 - roadDist(x, z) / 4.2);
      var m = 0.78 + 0.42 * (Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + 0.5);
      return [(0.27 + t * 0.17) * m, (0.29 + t * 0.13) * m, (0.21 + t * 0.10) * m];
    }));
  /* ================= каплиця ================= */

  (function(){
    var cx = CHAPEL.x, cz = CHAPEL.z, y = hAt(cx, cz);
    var G0 = new THREE.Group();
    G0.position.set(cx, y, cz);
    root.add(G0);

    var floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 14), M.stoneD);
    floor.position.y = 0.1; floor.receiveShadow = !LOWFX;
    G0.add(floor);

    var WH = 5.4, TH = 0.8;
    function wall(lx, lz, w, d){
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, WH, d), M.stone);
      m.position.set(lx, WH / 2, lz);
      m.castShadow = !LOWFX; m.receiveShadow = !LOWFX;
      G0.add(m);
      addBox(cx + lx, cz + lz, w / 2, d / 2, 0);
    }
    wall(0, 7, 14, TH);            // тил
    wall(-7, 0, TH, 14);           // ліва
    wall(7, 0, TH, 14);            // права
    wall(-4.6, -7, 4.8, TH);       // фасад ліворуч від дверей
    wall(4.6, -7, 4.8, TH);        // фасад праворуч
    var lintel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.6, TH), M.stone);
    lintel.position.set(0, WH - 0.8, -7); G0.add(lintel);

    var roof = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.7, 15.4), M.stoneD);
    roof.position.y = WH + 0.35; roof.castShadow = !LOWFX;
    G0.add(roof);

    // колони всередині
    [[-4.4, 4.4], [4.4, 4.4], [-4.4, -3.2], [4.4, -3.2]].forEach(function(p){
      var c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, WH, 8), M.stoneL);
      c.position.set(p[0], WH / 2, p[1]); c.castShadow = !LOWFX;
      G0.add(c);
      addWall(cx + p[0], cz + p[1], 0.6);
    });

    // саркофаг, з якого підвівся герой
    var sar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.5), M.stoneL);
    sar.position.set(-3.6, 0.85, 3.6); sar.castShadow = !LOWFX;
    sar.rotation.y = 0.3;
    G0.add(sar);
    var lid = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 1.6), M.stone);
    lid.position.set(-2.4, 0.5, 5.2); lid.rotation.set(0.1, 0.5, 0.06);
    G0.add(lid);
    addBox(cx - 3.6, cz + 3.6, 1.4, 0.85, 0.3);

    // смолоскипи
    [[-5.4, 1.2], [5.4, 1.2]].forEach(function(p){
      var br = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 6), M.wood);
      br.position.set(p[0], 3.0, p[1]); G0.add(br);
      var fl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.ember);
      fl.position.set(p[0], 3.7, p[1]); G0.add(fl);
      var L = new THREE.PointLight(0xff9838, 0.95, 12);
      L.position.set(p[0], 3.8, p[1]);
      G0.add(L);
      flames.push({ mesh: fl, light: L, p: rnd() * 6 });
    });

    // двері
    var d = new THREE.Group();
    d.position.set(0, 0, -7);
    G0.add(d);
    [-1, 1].forEach(function(s){
      var leaf = new THREE.Group();
      leaf.position.set(s * 2.3, 0, 0);
      var pl = new THREE.Mesh(new THREE.BoxGeometry(2.3, 4.4, 0.25), M.wood);
      pl.position.set(-s * 1.15, 2.2, 0); pl.castShadow = !LOWFX;
      leaf.add(pl);
      for (var i = 0; i < 3; i++) {
        var bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.34), M.rust);
        bar.position.set(-s * 1.15, 0.7 + i * 1.5, 0);
        leaf.add(bar);
      }
      d.add(leaf);
      doorLeaves.push({ g: leaf, s: s });
    });
    chapelDoor = d;
    addBox(cx, cz - 7, 2.3, 0.3, 0);
    doorCollider = boxes[boxes.length - 1];
  })();

  /* ================= вогнища ================= */

  FIRES.forEach(function(F){
    var x = F.x, z = F.z, y = hAt(x, z);
    var G0 = new THREE.Group();
    G0.position.set(x, y, z);
    root.add(G0);
    // кільце каменю
    for (var i = 0; i < 11; i++) {
      var a = i / 11 * Math.PI * 2;
      var st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + rnd() * 0.18, 0), M.stone);
      st.position.set(Math.cos(a) * 1.3, 0.14, Math.sin(a) * 1.3);
      st.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      st.castShadow = !LOWFX;
      G0.add(st);
    }
    var ash = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.22, 14), M.dark);
    ash.position.y = 0.11; G0.add(ash);
    // хмиз
    for (var w = 0; w < 5; w++) {
      var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 5), M.wood);
      stick.position.set(Math.cos(w * 1.3) * 0.3, 0.3, Math.sin(w * 1.3) * 0.3);
      stick.rotation.set(1.1, w * 1.3, 0.4);
      G0.add(stick);
    }
    // меч у попелі
    var bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.3), M.rust);
    bl.position.y = 1.25; bl.rotation.z = 0.16; bl.castShadow = !LOWFX;
    G0.add(bl);
    var gd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.95), M.rust);
    gd.position.set(-0.05, 2.15, 0); G0.add(gd);
    // багатошарове полум'я
    var flames3 = [];
    for (var fl = 0; fl < 3; fl++) {
      var fm = new THREE.Mesh(new THREE.ConeGeometry(0.34 - fl * 0.08, 0.9 - fl * 0.2, 6),
        fl === 0 ? M.ember : new THREE.MeshBasicMaterial({ color: fl === 1 ? 0xffc451 : 0xfff0b4 }));
      fm.position.y = 0.45 + fl * 0.16;
      G0.add(fm);
      flames3.push(fm);
    }
    var L = new THREE.PointLight(0xff9a3c, 2.0, 24);
    L.position.y = 1.2;
    G0.add(L);
    flames.push({ mesh: flames3[0], light: L, p: rnd() * 6 });
    // іскри, що здіймаються
    var emb = [];
    for (var e = 0; e < 10; e++) {
      var em = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 3), new THREE.MeshBasicMaterial({ color: 0xffb457 }));
      G0.add(em); emb.push({ m: em, t: rnd(), sp: 0.5 + rnd() * 0.7, a: rnd() * 6.28, r: 0.15 + rnd() * 0.5 });
    }
    addWall(x, z, 0.95, y + 1.3);
    fireObjs.push({ F: F, g: G0, flames: flames3, emb: emb, lit: false });
  });

  /* ================= орієнтири й забудова ================= */

  // спільні дрібниці
  var ROCKS = ['rock-a', 'rock-b', 'rock-c', 'rocks', 'rocks-tall'];
  function scatterRocks(cx, cz, rad, n, minS, maxS){
    for (var i = 0; i < n; i++) {
      var a = rnd() * 6.283, r = rnd() * rad;
      var x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      var sc = minS + rnd() * (maxS - minS);
      var m = modelAny(ROCKS, { s: sc * 2.1 });
      if (m) {
        m.position.set(x, hAt(x, z), z);
        m.rotation.set(rr(-0.12, 0.12), rnd() * 6.283, rr(-0.12, 0.12));
        root.add(m);
      } else {
        m = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), M.stone);
        m.position.set(x, hAt(x, z) + sc * 0.35, z);
        m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        m.scale.set(1, rr(0.5, 0.9), rr(0.8, 1.2));
        m.castShadow = !LOWFX;
        root.add(m);
      }
      if (sc > 1.0) addWall(x, z, sc * 0.75, hAt(x, z) + sc * 1.1);
    }
  }
  var TREES = ['pine-dead', 'pine-crooked', 'pine', 'tree-tall', 'tree'];
  function deadTree(x, z, h){
    var y = hAt(x, z);
    // h — бажана висота в метрах; моделі Kenney заввишки близько 2.3, звідси масштаб
    var m = modelAny(TREES, { s: h / 2.3 });
    if (m) {
      m.position.set(x, y - 0.1, z);
      m.rotation.set(rr(-0.05, 0.05), rnd() * 6.283, rr(-0.05, 0.05));
      root.add(m);
      addWall(x, z, 0.55, y + h);
      return;
    }
    var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.46, h, 6), M.wood);
    tr.position.set(x, y + h / 2, z);
    tr.rotation.z = rr(-0.1, 0.1);
    tr.castShadow = !LOWFX;
    root.add(tr);
    addWall(x, z, 0.5, y + h);
  }

  /* --- зруйнований будинок ---
     Стіни збираються з модулів Kenney по 2.6 метра. Зіткнення лишаються
     суцільними коробками, як були: гравцеві байдуже, зі скількох шматків
     складена стіна, а от прохідність крізь шви була б одразу помітна. */
  var MS = 2.6;
  function ruinHouse(x, z, rot, w, d, hgt, gaps){
    var y = hAt(x, z);
    var g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    root.add(g);
    var t = 0.5;

    // розміри підганяємо під сітку модулів, щоб панелі сходились без щілин
    var nx = Math.max(1, Math.round(w / MS)), nz = Math.max(1, Math.round(d / MS));
    w = nx * MS; d = nz * MS;

    function panel(lx, lz, ry, lvl, id){
      var m = model(id, { s: MS });
      if (!m) return false;
      m.position.set(lx, lvl * MS, lz);
      m.rotation.y = ry;
      g.add(m);
      return true;
    }
    function pick(lvl, top){
      if (top && rnd() < 0.42) return null;              // верх обвалився
      if (rnd() < 0.16) return 'house-broken';
      if (lvl === 0 && rnd() < 0.18) return 'house-window';
      return 'house-wall';
    }
    // стіна вздовж Z (панель уже лежить уздовж Z, повертати не треба)
    function runZ(lx, lvls, ry){
      for (var j = 0; j < nz; j++)
        for (var l = 0; l < lvls; l++) {
          var id = pick(l, l === lvls - 1);
          if (id) panel(lx, -d / 2 + MS * (j + 0.5), ry, l, id);
        }
    }
    // стіна вздовж X
    function runX(lz, lvls, ry, doorAt){
      for (var i = 0; i < nx; i++)
        for (var l = 0; l < lvls; l++) {
          var id = (l === 0 && i === doorAt) ? 'house-door' : pick(l, l === lvls - 1);
          if (id) panel(-w / 2 + MS * (i + 0.5), lz, ry, l, id);
        }
    }
    var H = Math.max(1, Math.round(hgt / MS));
    var hL = Math.max(1, Math.round(H * (gaps & 1 ? 0.5 : 1)));
    var hR = Math.max(1, Math.round(H * (gaps & 2 ? 0.55 : 1)));
    var hB = Math.max(1, Math.round(H * (gaps & 4 ? 0.45 : 1)));
    var okMdl = hasModel('house-wall');
    if (okMdl) {
      runZ(-w / 2, hL, 0);
      runZ(w / 2, hR, Math.PI);
      runX(-d / 2, hB, Math.PI / 2, (nx / 2) | 0);
      runX(d / 2, H, -Math.PI / 2, -1);
    } else {
      // без моделей — старі суцільні стіни
      function seg(lx, lz, sw, sd, sh){
        var m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), M.wall);
        m.position.set(lx, sh / 2, lz);
        m.castShadow = !LOWFX; m.receiveShadow = !LOWFX;
        g.add(m);
      }
      seg(-w / 2, 0, t, d, hgt * (gaps & 1 ? 0.45 : 1));
      seg(w / 2, 0, t, d, hgt * (gaps & 2 ? 0.5 : 1));
      seg(0, -d / 2, w, t, hgt * (gaps & 4 ? 0.4 : 1));
      seg(0, d / 2, w, t, hgt);
    }

    // зіткнення: чотири суцільні стіни незалежно від того, з чого вони зібрані
    var c = Math.cos(rot), s2 = Math.sin(rot);
    function wallBox(lx, lz, sw, sd, sh){
      addBox(x + lx * c - lz * s2, z + lx * s2 + lz * c, sw / 2, sd / 2, rot, y + sh);
    }
    wallBox(-w / 2, 0, t, d, hL * MS);
    wallBox(w / 2, 0, t, d, hR * MS);
    wallBox(0, -d / 2, w, t, hB * MS);
    wallBox(0, d / 2, w, t, H * MS);

    // уламки даху
    for (var r = 0; r < 4; r++) {
      var beam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.22, 0.24), M.wood);
      beam.position.set(rr(-0.6, 0.6), hgt * rr(0.5, 0.95), -d / 2 + r * (d / 3.4));
      beam.rotation.set(rr(-0.3, 0.3), rr(-0.2, 0.2), rr(-0.25, 0.25));
      g.add(beam);
    }
    // підлога
    var fl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), M.wallD);
    fl.position.y = 0.1; fl.receiveShadow = !LOWFX;
    g.add(fl);
    scatterRocks(x, z, Math.max(w, d) * 0.7, 5, 0.25, 0.6);
    // що лишилось від господарства
    var pr = ['barrel', 'barrel-open', 'crate', 'bucket', 'planks', 'firewood', 'hay', 'debris-wood'];
    for (var q = 0; q < 4; q++) {
      var qa = rnd() * 6.283, qr = Math.max(w, d) * (0.3 + rnd() * 0.3);
      placeModel(root, pr[(rnd() * pr.length) | 0],
        x + Math.cos(qa) * qr, z + Math.sin(qa) * qr, { s: rr(2.0, 3.0) });
    }
  }

  /* --- кістяк велетенської риби: головний орієнтир поля --- */
  (function(){
    var bx = -34, bz = 44, by = hAt(bx, bz);
    var g = new THREE.Group();
    g.position.set(bx, by, bz);
    g.rotation.y = 0.6;
    root.add(g);
    var bone = M.bone;
    // хребет
    for (var i = 0; i < 16; i++) {
      var v = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.0), bone);
      v.position.set(0, 3.6 - Math.pow((i - 7) / 8, 2) * 1.4, -11 + i * 1.5);
      v.castShadow = !LOWFX;
      g.add(v);
    }
    // ребра
    for (var r = 0; r < 9; r++) {
      var zz = -8 + r * 1.9;
      var sc = 1 - Math.abs(r - 4) / 7;
      [-1, 1].forEach(function(sd){
        var rib = new THREE.Mesh(new THREE.TorusGeometry(2.6 * (0.5 + sc), 0.22, 5, 10, Math.PI * 0.85), bone);
        rib.position.set(0, 3.4, zz);
        rib.rotation.set(0, Math.PI / 2, sd > 0 ? 0.25 : Math.PI - 0.25);
        rib.castShadow = !LOWFX;
        g.add(rib);
      });
    }
    // череп
    var sk = new THREE.Mesh(new THREE.SphereGeometry(2.7, 14, 10), bone);
    sk.scale.set(0.9, 1.0, 1.35);
    sk.position.set(0, 3.0, 14);
    sk.castShadow = !LOWFX;
    g.add(sk);
    var jaw = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.35, 6, 14), bone);
    jaw.position.set(0, 1.6, 16.4); jaw.rotation.x = 1.3;
    g.add(jaw);
    [-1, 1].forEach(function(sd){
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), M.dark);
      eye.position.set(sd * 1.5, 3.7, 15.4);
      g.add(eye);
    });
    // хвостові кістки
    for (var t2 = 0; t2 < 4; t2++) {
      var tb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.6), bone);
      tb.position.set(0, 3.2 - t2 * 0.3, -12 - t2 * 1.6);
      tb.rotation.x = t2 * 0.1;
      g.add(tb);
    }
    addWall(bx, bz, 2.4, by + 4);
    addWall(bx + 8, bz + 6, 2.0, by + 4);
    scatterRocks(bx, bz, 14, 10, 0.3, 0.9);
  })();

  /* --- дольмен: коло каменів із руною --- */
  (function(){
    var cx = -44, cz = 8;
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * 6.283;
      var x = cx + Math.cos(a) * 6.4, z = cz + Math.sin(a) * 6.4;
      var y = hAt(x, z), h = 3.4 + rnd() * 1.6;
      var st = new THREE.Mesh(new THREE.BoxGeometry(1.3, h, 0.8), M.stoneL);
      st.position.set(x, y + h / 2, z);
      st.rotation.set(rr(-0.06, 0.06), a + rr(-0.2, 0.2), rr(-0.07, 0.07));
      st.castShadow = !LOWFX;
      root.add(st);
      addWall(x, z, 0.75, y + h);
      if (i % 3 === 0) {
        var lin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.0), M.stone);
        lin.position.set(cx + Math.cos(a + 0.4) * 6.4, y + h + 0.3, cz + Math.sin(a + 0.4) * 6.4);
        lin.rotation.y = a + 1.2;
        root.add(lin);
      }
    }
    var oy = hAt(cx, cz);
    var alt = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.7, 10), M.stoneD);
    alt.position.set(cx, oy + 0.35, cz);
    root.add(alt);
    addWall(cx, cz, 1.7, oy + 0.9);
    scatterRocks(cx, cz, 10, 8, 0.3, 0.8);
  })();

  /* --- зруйнована вежа --- */
  (function(){
    var tx = -26, tz = -34, ty = hAt(tx, tz);
    var g = new THREE.Group();
    g.position.set(tx, ty, tz);
    root.add(g);
    var body = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.8, 15, 12), M.stoneL);
    body.position.y = 7.5; body.castShadow = !LOWFX;
    g.add(body);
    // обвалений верх
    for (var i = 0; i < 9; i++) {
      var a = i / 9 * 6.283;
      var h = 1.2 + rnd() * 2.4;
      var cr = new THREE.Mesh(new THREE.BoxGeometry(1.5, h, 1.0), M.stone);
      cr.position.set(Math.cos(a) * 3.0, 15 + h / 2, Math.sin(a) * 3.0);
      cr.rotation.y = a;
      g.add(cr);
    }
    var door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 0.6), M.dark);
    door.position.set(0, 1.6, 3.7);
    g.add(door);
    addWall(tx, tz, 3.4, ty + 17);
    scatterRocks(tx, tz, 12, 12, 0.4, 1.3);
    for (var d = 0; d < 3; d++) deadTree(tx + rr(-11, 11), tz + rr(-11, 11), 5 + rnd() * 3);
  })();

  /* --- селище: чотири руїни, криниця, огорожі, табір --- */
  CAMP = { x: 22, z: 20 };
  (function(){
    ruinHouse(CAMP.x - 7, CAMP.z + 6, 0.3, 7, 6, 3.6, 1);
    ruinHouse(CAMP.x + 6, CAMP.z + 8, -0.5, 6, 6, 3.4, 4);
    ruinHouse(CAMP.x + 9, CAMP.z - 6, 1.2, 8, 6, 3.8, 2);
    ruinHouse(CAMP.x - 8, CAMP.z - 8, -1.1, 6, 5, 3.2, 5);
    // криниця
    var wx = CAMP.x, wz = CAMP.z + 1, wy = hAt(wx, wz);
    var well = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 1.2, 12), M.stoneL);
    well.position.set(wx, wy + 0.6, wz); well.castShadow = !LOWFX;
    root.add(well);
    var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 12), M.dark);
    hole.position.set(wx, wy + 1.15, wz);
    root.add(hole);
    addWall(wx, wz, 1.3, wy + 1.4);
    [-1, 1].forEach(function(sd){
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 0.22), M.wood);
      post.position.set(wx + sd * 1.0, wy + 1.9, wz);
      root.add(post);
    });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.22), M.wood);
    beam.position.set(wx, wy + 3.0, wz);
    root.add(beam);
    // багаття табору (не вогнище для відпочинку)
    var fx2 = CAMP.x - 2, fz2 = CAMP.z - 3, fy2 = hAt(fx2, fz2);
    for (var s2 = 0; s2 < 7; s2++) {
      var a2 = s2 / 7 * 6.283;
      var st2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), M.stone);
      st2.position.set(fx2 + Math.cos(a2) * 0.9, fy2 + 0.1, fz2 + Math.sin(a2) * 0.9);
      root.add(st2);
    }
    var cf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), M.ember);
    cf.position.set(fx2, fy2 + 0.35, fz2);
    root.add(cf);
    var cl = new THREE.PointLight(0xff8a3a, 1.1, 13);
    cl.position.set(fx2, fy2 + 1.0, fz2);
    root.add(cl);
    flames.push({ mesh: cf, light: cl, p: rnd() * 6 });
    // огорожі
    for (var fnc = 0; fnc < 12; fnc++) {
      var fa = fnc / 12 * 6.283;
      var px2 = CAMP.x + Math.cos(fa) * 15, pz2 = CAMP.z + Math.sin(fa) * 15;
      if (roadDist(px2, pz2) < 4) continue;
      var py2 = hAt(px2, pz2);
      var pst = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.16), M.wood);
      pst.position.set(px2, py2 + 0.75, pz2);
      pst.rotation.z = rr(-0.15, 0.15);
      root.add(pst);
      var rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.2), M.wood);
      rail.position.set(px2, py2 + 1.0, pz2);
      rail.rotation.y = fa + Math.PI / 2;
      root.add(rail);
    }
    scatterRocks(CAMP.x, CAMP.z, 18, 10, 0.3, 0.9);
  })();

  /* --- міст через сухе русло --- */
  (function(){
    var bx = 4, bz = RIVER_Z, by = hAt(bx, bz + 9) + 0.2;
    var deck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.7, 18), M.stoneL);
    deck.position.set(bx, by, bz);
    deck.receiveShadow = !LOWFX; deck.castShadow = !LOWFX;
    root.add(deck);
    [-1, 1].forEach(function(sd){
      var par = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 18), M.stone);
      par.position.set(bx + sd * 3.35, by + 0.85, bz);
      par.castShadow = !LOWFX;
      root.add(par);
      addBox(bx + sd * 3.35, bz, 0.25, 9, 0, by + 1.4);
    });
    // опори
    [-5, 5].forEach(function(o){
      var pil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8, 1.4), M.stoneD);
      pil.position.set(bx, by - 4, bz + o);
      root.add(pil);
    });
    BRIDGE = { x: bx, z: bz, y: by };
  })();

  /* --- дороговкази вздовж шляху --- */
  (function(){
    for (var i = 0; i < 9; i++) {
      var t = i / 8;
      var seg = t * (ROAD.length - 1), si = Math.min(ROAD.length - 2, Math.floor(seg)), sf = seg - si;
      var rx = ROAD[si][0] + (ROAD[si + 1][0] - ROAD[si][0]) * sf;
      var rz = ROAD[si][1] + (ROAD[si + 1][1] - ROAD[si][1]) * sf;
      var side = i % 2 ? 1 : -1;
      var ox = rx + side * 4.6, oz = rz + rr(-1.5, 1.5);
      if (Math.abs(oz - RIVER_Z) < 11) continue;
      var oy = hAt(ox, oz);
      var post = model('town-lantern', { s: 1.9 });
      if (post) { post.position.set(ox, oy, oz); post.rotation.y = rnd() * 6.283; root.add(post); }
      else {
        post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 6), M.wood);
        post.position.set(ox, oy + 1.3, oz);
        post.castShadow = !LOWFX;
        root.add(post);
        var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), M.rust);
        lamp.position.set(ox, oy + 2.7, oz);
        root.add(lamp);
      }
      var fm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), M.ember);
      fm.position.set(ox, oy + 2.7, oz);
      root.add(fm);
      var L = new THREE.PointLight(0xffa24a, 0.75, 11);
      L.position.set(ox, oy + 2.8, oz);
      root.add(L);
      flames.push({ mesh: fm, light: L, p: rnd() * 6 });
    }
  })();

  /* --- загальна рослинність --- */
  (function(){
    var KEEP = [[CHAPEL.x, CHAPEL.z, 13], [CAMP.x, CAMP.z, 13], [ARENA.x, ARENA.z, ARENA.r + 4], [-44, 8, 8]];
    function clear(x, z){
      for (var i = 0; i < KEEP.length; i++)
        if (Math.hypot(x - KEEP[i][0], z - KEEP[i][1]) < KEEP[i][2]) return false;
      for (var f = 0; f < FIRES.length; f++)
        if (Math.hypot(x - FIRES[f].x, z - FIRES[f].z) < 6) return false;
      if (Math.abs(z - RIVER_Z) < 8 && Math.abs(x - 4) < 6) return false;
      return true;
    }
    for (var i = 0; i < 26; i++) {
      var a = rnd() * 6.283, r = 18 + rnd() * 84;
      var x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (roadDist(x, z) < 4.5 || !clear(x, z)) continue;
      deadTree(x, z, 4.5 + rnd() * 5);
    }
    // Каміння й трава йдуть екземплярами однієї моделі, тож уся розсип
    // коштує стільки ж викликів малювання, скільки один камінь.
    for (var k = 0; k < 170; k++) {
      var aa = rnd() * 6.283, rr2 = 10 + rnd() * 96;
      var px = Math.cos(aa) * rr2, pz = Math.sin(aa) * rr2;
      if (!clear(px, pz)) continue;
      var s2 = 0.3 + rnd() * 1.6;
      var rm = modelAny(ROCKS, { s: s2 * 2.0 });
      if (rm) {
        rm.position.set(px, hAt(px, pz), pz);
        rm.rotation.set(rr(-0.14, 0.14), rnd() * 6.283, rr(-0.14, 0.14));
        root.add(rm);
      }
      if (s2 > 1.0) addWall(px, pz, s2 * 0.75, hAt(px, pz) + s2 * 1.15);
    }

    // трава купами, а не рівним килимом
    var GRASS = ['grass', 'grass-large'];
    var gi = 0;
    for (var cl = 0; cl < 90 && gi < 1100; cl++) {
      var ca = rnd() * 6.283, cr = 12 + rnd() * 92;
      var cx2 = Math.cos(ca) * cr, cz2 = Math.sin(ca) * cr;
      if (!clear(cx2, cz2)) continue;
      var cnt = 8 + ((rnd() * 10) | 0);
      for (var t = 0; t < cnt && gi < 1100; t++) {
        var gx = cx2 + rr(-3.0, 3.0), gz = cz2 + rr(-3.0, 3.0);
        var gm = modelAny(GRASS, { s: rr(1.6, 3.4), shadow: false });
        if (!gm) break;
        gm.position.set(gx, hAt(gx, gz), gz);
        gm.rotation.y = rnd() * 6.283;
        root.add(gm);
        gi++;
      }
    }

    // цвинтар біля каплиці
    var GRAVES = ['grave-bevel', 'grave-broken', 'grave-cross', 'grave-round',
                  'grave-wide', 'grave-debris', 'cross-wood', 'cross-stone'];
    for (var s3 = 0; s3 < 26; s3++) {
      var ga = rnd() * 6.283, gr = 12 + rnd() * 12;
      var ox = CHAPEL.x + Math.cos(ga) * gr, oz = CHAPEL.z + Math.sin(ga) * gr;
      var oy = hAt(ox, oz);
      var st = modelAny(GRAVES, { s: rr(1.9, 2.8) });
      if (st) {
        st.position.set(ox, oy, oz);
        st.rotation.set(rr(-0.1, 0.1), rnd() * 6.283, rr(-0.12, 0.12));
      } else {
        st = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4 + rnd(), 0.22), M.stoneL);
        st.position.set(ox, oy + 0.75, oz);
        st.rotation.set(rr(-0.13, 0.13), rnd() * 3, rr(-0.15, 0.15));
        st.castShadow = !LOWFX;
      }
      root.add(st);
    }
    // склеп і вівтар як орієнтири на цвинтарі
    (function(){
      var cx3 = CHAPEL.x - 17, cz3 = CHAPEL.z - 4;
      var cr3 = placeModel(root, 'crypt-small', cx3, cz3, { s: 3.0, yaw: 0.4 });
      if (cr3) addBox(cx3, cz3, 2.1, 2.2, 0);
      placeModel(root, 'altar', CHAPEL.x + 15, CHAPEL.z + 9, { s: 2.6, yaw: -0.8 });
      placeModel(root, 'bench-broken', CHAPEL.x + 11, CHAPEL.z + 13, { s: 2.4 });
      placeModel(root, 'obelisk', CHAPEL.x - 9, CHAPEL.z + 18, { s: 4.2, yaw: 0.2 });
    })();
    // руїни арок уздовж дороги
    [[-12, 52], [14, 34], [-16, -14], [10, -34]].forEach(function(pp){
      var ax = pp[0], az = pp[1], ay = hAt(ax, az);
      var g2 = new THREE.Group();
      g2.position.set(ax, ay, az);
      g2.rotation.y = rnd() * 3;
      [-1, 1].forEach(function(s4){
        var col = model('column', { s: 5.0 });
        if (col) { col.position.set(s4 * 2.3, 0, 0); g2.add(col); return; }
        col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.64, 5.6, 8), M.stoneL);
        col.position.set(s4 * 2.3, 2.8, 0); col.castShadow = !LOWFX;
        g2.add(col);
      });
      var top = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.7, 1.1), M.stone);
      top.position.y = 5.9; top.castShadow = !LOWFX;
      g2.add(top);
      root.add(g2);
      addWall(ax - 2.3, az, 0.62, ay + 5.6);
      addWall(ax + 2.3, az, 0.62, ay + 5.6);
    });
  })();

  /* ================= ущелина і печера ================= */

  (function(){
    // скелі обабіч проходу — відсунуті, щоб вхід справді читався як прохід
    for (var i = 0; i < 30; i++) {
      var t = i / 29;
      var z = GORGE.z0 + t * (GORGE.z1 - GORGE.z0 - 6);
      [-1, 1].forEach(function(sd){
        var x = GX + sd * (7.6 + rnd() * 1.6);
        var y = hAt(x, z);
        var hgt = 6 + rnd() * 7;
        var m = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4 + rnd() * 1.8, 0), M.stoneD);
        m.position.set(x, y + hgt * 0.28, z);
        m.scale.set(1, hgt * 0.34, 1);
        m.rotation.set(rnd() * 0.5, rnd() * 3, rnd() * 0.5);
        m.castShadow = !LOWFX;
        root.add(m);
        addWall(x, z, 2.5, y + hgt);
      });
    }
    // портал печери: дві опори й перемичка, під ними вільний прохід
    var mz = CAVE.z, my = hAt(GX, mz);
    [-1, 1].forEach(function(sd){
      var pil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 7.2, 2.6), M.stoneD);
      pil.position.set(GX + sd * 5.4, my + 3.6, mz);
      pil.castShadow = !LOWFX;
      root.add(pil);
      addWall(GX + sd * 5.4, mz, 1.5, my + 7.2);
      // смолоскип на опорі
      var br = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 6), M.wood);
      br.position.set(GX + sd * 4.3, my + 3.4, mz + 0.4);
      br.rotation.z = sd * 0.5;
      root.add(br);
      var fm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), M.ember);
      fm.position.set(GX + sd * 3.9, my + 3.9, mz + 0.4);
      root.add(fm);
      var TL = new THREE.PointLight(0xffa24a, 1.3, 16);
      TL.position.set(GX + sd * 3.9, my + 4.1, mz + 0.4);
      root.add(TL);
      flames.push({ mesh: fm, light: TL, p: rnd() * 6 });
    });
    var lint = new THREE.Mesh(new THREE.BoxGeometry(13.6, 1.6, 3.0), M.stoneD);
    lint.position.set(GX, my + 8.0, mz); lint.castShadow = !LOWFX;
    root.add(lint);
    // навіс, що йде вглиб — темрява за порталом
    for (var k = 1; k <= 4; k++) {
      var arc = new THREE.Mesh(new THREE.BoxGeometry(13.6 - k * 0.6, 1.4, 3.4), M.stoneD);
      arc.position.set(GX, my + 8.2 + k * 0.35, mz - k * 3.2);
      root.add(arc);
    }

    // туманна завіса перед залою
    var gz = GORGE.z1;
    gateMesh = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 7.6),
      new THREE.MeshBasicMaterial({ color: 0xe0c073, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false }));
    gateMesh.position.set(GX, hAt(GX, gz) + 3.4, gz);
    root.add(gateMesh);

    // стіни зали
    for (var a = 0; a < 46; a++) {
      var an = a / 46 * Math.PI * 2;
      if (Math.abs(an - Math.PI / 2) < 0.26) continue;  // вхід
      var rx = ARENA.x + Math.cos(an) * (ARENA.r + 1.6);
      var rz = ARENA.z + Math.sin(an) * (ARENA.r + 1.6);
      var ry = hAt(rx, rz);
      var w = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2 + rnd() * 1.8, 0), M.stoneD);
      w.position.set(rx, ry + 2.8, rz);
      w.scale.set(1, 2.6 + rnd(), 1);
      w.rotation.set(rnd() * 0.4, rnd() * 3, rnd() * 0.4);
      w.castShadow = !LOWFX;
      root.add(w);
      addWall(rx, rz, 3.2, ry + 9);
    }
    // жаровні в залі
    [[0, -1], [1, 0], [-1, 0], [0.75, 0.75], [-0.75, 0.75]].forEach(function(d){
      var bx = ARENA.x + d[0] * (ARENA.r - 2.6), bz = ARENA.z + d[1] * (ARENA.r - 2.6);
      var by = hAt(bx, bz);
      var st = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.5, 6), M.rust);
      st.position.set(bx, by + 0.75, bz); root.add(st);
      var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.44, 0.5, 8), M.rust);
      bowl.position.set(bx, by + 1.65, bz); root.add(bowl);
      var f = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 6), M.ember);
      f.position.set(bx, by + 2.1, bz); root.add(f);
      var L = new THREE.PointLight(0xff8a3a, 1.25, 17);
      L.position.set(bx, by + 2.4, bz); root.add(L);
      flames.push({ mesh: f, light: L, p: rnd() * 6 });
      addWall(bx, bz, 0.5, by + 2.2);
    });
    // кістки
    for (var b2 = 0; b2 < 30; b2++) {
      var ba = rnd() * Math.PI * 2, br2 = rnd() * (ARENA.r - 2);
      var bx2 = ARENA.x + Math.cos(ba) * br2, bz2 = ARENA.z + Math.sin(ba) * br2;
      var bn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6 + rnd() * 0.8, 5), M.skin);
      bn.position.set(bx2, hAt(bx2, bz2) + 0.08, bz2);
      bn.rotation.set(Math.PI / 2, rnd() * 3, rnd() * 3);
      root.add(bn);
    }
  })();

  /* ================= рунні камені ================= */

  (function(){
    var TXT = [
      ['Спробуй перекат', 'Хто не котиться, того котять.'],
      ['Попереду ущелина', 'За туманом — те, що з мулу.'],
      ['Мулярі кидають здалеку', 'Підійди або обійди.'],
      ['Пузир повільний', 'Але поїзу в нього як у ковадла.'],
      ['Золотий карась бачить усе', 'І нічим не допомагає.'],
      ['Вогнище піднімає полеглих', 'І тебе теж. Це чесно.']
    ];
    var SPOT = [[-8, 64], [-34, 30], [-44, 8], [10, 8], [3, -18], [18, -44]];
    SPOT.forEach(function(sp, i){
      var x = sp[0], z = sp[1], y = hAt(x, z);
      var g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rnd() * 6.28;
      var st = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.3, 0.28), M.stoneL);
      st.position.y = 1.1; st.rotation.z = rr(-0.08, 0.08); st.castShadow = !LOWFX;
      g.add(st);
      var mark = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 5, 10),
        new THREE.MeshBasicMaterial({ color: 0xe8c06a }));
      mark.position.set(0, 1.4, 0.16);
      g.add(mark);
      var L = new THREE.PointLight(0xe0b44f, 0.5, 5);
      L.position.set(0, 1.5, 0.4);
      g.add(L);
      root.add(g);
      addWall(x, z, 0.45, y + 1.9);
      runes.push({ x: x, z: z, mark: mark, light: L, txt: TXT[i % TXT.length], p: rnd() * 6 });
    });
  })();


  }
};
