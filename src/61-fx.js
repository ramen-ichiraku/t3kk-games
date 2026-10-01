/* ================= іскри від влучань ================= */
var sparkPool = [];
var sparkGeo = new THREE.SphereGeometry(0.07, 5, 4);
var sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
function sparks(x, y, z, n){
  for (var i = 0; i < n; i++) {
    var m = sparkPool.length ? sparkPool.pop() : new THREE.Mesh(sparkGeo, sparkMat);
    m.visible = true;
    m.scale.setScalar(0.7 + Math.random() * 0.9);
    m.position.set(x, y, z);
    scene.add(m);
    var a = Math.random() * Math.PI * 2, e = 0.3 + Math.random() * 1.2;
    fx.push({ m: m, vx: Math.cos(a) * 3.4 * e, vy: 2.2 + Math.random() * 2.6, vz: Math.sin(a) * 3.4 * e,
      life: 0.3 + Math.random() * 0.25, max: 0.55 });
  }
}
var fx = [];
function updateFx(dt){
  for (var i = fx.length - 1; i >= 0; i--) {
    var f = fx[i];
    f.life -= dt;
    if (f.life <= 0) { scene.remove(f.m); f.m.visible = false; sparkPool.push(f.m); fx.splice(i, 1); continue; }
    f.vy -= 14 * dt;
    f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
    f.m.scale.setScalar(Math.max(0.05, f.life / f.max));
  }
}

