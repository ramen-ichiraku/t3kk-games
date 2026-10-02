/* ================= небо =================
   Кольори вершин у Babylon не діють на самосвітні матеріали,
   тож градієнт малюємо в текстуру. */
(function(){
  var tex = new BABYLON.DynamicTexture('skytex', { width: 4, height: 256 }, bscene, false);
  var c = tex.getContext();
  var g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.00, 'rgb(26,32,62)');
  g.addColorStop(0.28, 'rgb(52,60,96)');
  g.addColorStop(0.52, 'rgb(96,96,126)');
  g.addColorStop(0.70, 'rgb(150,130,134)');
  g.addColorStop(0.84, 'rgb(206,158,116)');
  g.addColorStop(0.94, 'rgb(228,176,118)');
  g.addColorStop(1.00, 'rgb(122,98,86)');
  c.fillStyle = g; c.fillRect(0, 0, 4, 256);
  tex.update();
  var m = BABYLON.MeshBuilder.CreateSphere('sky', { diameter: 1300, segments: 20, sideOrientation: BABYLON.Mesh.BACKSIDE }, bscene);
  var mat = new BABYLON.StandardMaterial('skymat', bscene);
  mat.disableLighting = true;
  mat.emissiveTexture = tex;
  mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  mat.specularColor = new BABYLON.Color3(0, 0, 0);
  mat.fogEnabled = false;
  mat.backFaceCulling = false;
  m.material = mat;
  // гравець не відходить далі ста сорока одиниць від центру, тож нерухома
  // сфера завжди навколо нього; infiniteDistance давав обрізану панель збоку
  m.isPickable = false;
  // усе лишається в групі 0: Babylon чистить буфер глибини між групами,
  // тож ландшафт у групі 1 затирав і гравця, і весь реквізит
})();

/* ================= золотий карась удалині ================= */
var bigKaras;
(function(){
  var G0 = new THREE.Group();
  // слабка самосвітність + власний ліхтар спереду: інакше силует зливається в пляму
  var gm  = new THREE.MeshLambertMaterial({ color: 0xc9a03c, emissive: 0x241903, fog: false });
  var gm2 = new THREE.MeshLambertMaterial({ color: 0xe6cf80, emissive: 0x33260a, fog: false });
  var gmD = new THREE.MeshLambertMaterial({ color: 0x8a6b22, emissive: 0x1d1405, fog: false });
  var gmF = new THREE.MeshLambertMaterial({ color: 0xe8be5c, emissive: 0x43310b, fog: false });

  var body = new THREE.Mesh(new THREE.SphereGeometry(26, 26, 20), gm);
  body.scale.set(1, 1.5, 0.62);
  G0.add(body);
  // темне черево — щоб низ не зливався з верхом
  var bel = new THREE.Mesh(new THREE.SphereGeometry(21, 20, 16), gmD);
  bel.scale.set(0.96, 1.25, 0.5);
  bel.position.set(0, -8, 5);
  G0.add(bel);
  // зяброва дуга і темний поділ між головою й тілом
  var gill = new THREE.Mesh(new THREE.TorusGeometry(12.5, 1.5, 6, 14, Math.PI), gmD);
  gill.position.set(0, 24, 3); gill.rotation.z = -Math.PI / 2;
  G0.add(gill);
  // луска великими дугами
  for (var sc2 = 0; sc2 < 5; sc2++) {
    var arc = new THREE.Mesh(new THREE.TorusGeometry(15 - sc2 * 1.6, 0.85, 5, 12, Math.PI * 0.9), gmD);
    arc.position.set(0, 14 - sc2 * 11, 6);
    arc.rotation.z = -Math.PI / 2;
    G0.add(arc);
  }

  var head = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 16), gm2);
  head.scale.set(1, 1.15, 0.6); head.position.set(0, 34, 0);
  G0.add(head);
  var lip = new THREE.Mesh(new THREE.TorusGeometry(4.6, 1.9, 8, 16), gm2);
  lip.position.set(0, 45, 1.5); lip.rotation.x = Math.PI / 2;
  G0.add(lip);
  [-1, 1].forEach(function(s){
    var e = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10), new THREE.MeshBasicMaterial({ color: 0x2a1e06, fog: false }));
    e.position.set(s * 7.4, 37, 6.4);
    G0.add(e);
  });
  // хвіст
  var tail = new THREE.Mesh(new THREE.ConeGeometry(17, 30, 4, 1), gmF);
  tail.position.set(0, -44, 0); tail.rotation.z = Math.PI; tail.scale.set(1, 1, 0.34);
  G0.add(tail);
  // плавці
  [-1, 1].forEach(function(s){
    var f = new THREE.Mesh(new THREE.ConeGeometry(9, 22, 3), gmF);
    f.position.set(s * 22, -2, 0); f.rotation.z = s * 1.15; f.scale.set(1, 1, 0.3);
    G0.add(f);
  });
  var dors = new THREE.Mesh(new THREE.ConeGeometry(8, 26, 3), gmF);
  dors.position.set(0, 12, -14); dors.rotation.x = -0.5; dors.scale.set(1, 1, 0.3);
  G0.add(dors);

  // сяйво: раніше сфери були радіусом 180 і закривали пів екрана
  var halo = new THREE.Mesh(new THREE.SphereGeometry(34, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xe8bf60, transparent: true, opacity: 0.02,
      fog: false, side: THREE.BackSide, depthWrite: false }));
  halo.scale.set(1, 1.25, 1);
  G0.add(halo);


  // горизонтально: вертикальна риба не вміщалась у кадр, було видно лише хвіст
  G0.rotation.set(0.08, 0.34, -Math.PI / 2 + 0.1);
  G0.position.set(-74, 88, -360);
  G0.scale.setScalar(1.25);
  scene.add(G0);
  bigKaras = G0;
  // ліхтар стоїть перед рибою: сонце світить їй у спину, тож видимий бік був у тіні
  var kl = new THREE.PointLight(0xffd88a, 1.9, 240, 1.5);
  kl.position.set(-74, 94, -280);
  scene.add(kl);
})();

/* далекі гори, щоб обрій не був порожній */
(function(){
  var pos = [], idx = [], col = [], k = 0;
  for (var i = 0; i < 40; i++) {
    var a0 = i / 40 * Math.PI * 2, a1 = (i + 1) / 40 * Math.PI * 2;
    var R = 390, hgt = 52 + Math.sin(i * 2.3) * 30 + Math.cos(i * 0.9) * 20;
    var x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
    var x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
    pos.push(x0, -20, z0, x1, -20, z1, (x0 + x1) / 2, hgt, (z0 + z1) / 2);
    idx.push(k, k + 2, k + 1);
    k += 3;
    for (var c = 0; c < 3; c++) col.push(0.30, 0.30, 0.37, 1);
  }
  var nrm = [];
  BABYLON.VertexData.ComputeNormals(pos, idx, nrm);
  var m = new BABYLON.Mesh('mnt', bscene);
  var vd = new BABYLON.VertexData();
  vd.positions = pos; vd.indices = idx; vd.normals = nrm; vd.colors = col;
  vd.applyToMesh(m);
  var mat = new BABYLON.StandardMaterial('mntmat', bscene);
  mat.disableLighting = true;
  mat.emissiveColor = new BABYLON.Color3(0.085, 0.092, 0.118);
  mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  mat.fogEnabled = false;
  mat.backFaceCulling = false;
  m.material = mat;
  m.isPickable = false;
})();

/* тло в сцені постійно; зона лише вмикає або гасить карася */
function setBackdrop(on){ if (bigKaras) bigKaras.visible = on !== false; }

