/* ================= шар сумісності з Three =================
   Гра написана під Three.js, але рушієм тепер Babylon — заради вбудованих
   зіткнень із довільною геометрією (сходи, поверхи, мури), яких пласка
   саморобна модель не вміє в принципі.

   Замість переписувати три сотні місць створення геометрії, тут зроблено
   тонкий шар: THREE.Mesh повертає справжній меш Babylon, THREE.Group —
   TransformNode, і далі гра працює незмінним кодом. Усе, що отримує цей
   меш — зіткнення, тіні, інстанси — це вже можливості Babylon.

   Babylon ліворукий. Наша формула повороту (yaw -> вектор (sin, cos))
   у ньому збігається, а от намотка трикутників власної геометрії
   протилежна — див. buildTerrainMesh і тло. */

var LOWFX = /(\?|&)fx=low/.test(location.search);
// fx=max — для знімків і замірів: не дає автоякості зрізати шари на повільному
// програмному рендерері, де справжнього часу кадру все одно не дізнатись
var FXMAX = /(\?|&)fx=max/.test(location.search);

var __cv = document.createElement('canvas');
__cv.id = 'cv';
__cv.style.cssText = 'display:block;position:absolute;inset:0;width:100%;height:100%;outline:none';
var engine = new BABYLON.Engine(__cv, !LOWFX, { stencil: false, preserveDrawingBuffer: false, antialias: !LOWFX });
var bscene = new BABYLON.Scene(engine);
bscene.collisionsEnabled = true;
bscene.ambientColor = new BABYLON.Color3(0, 0, 0);
var shadowGen = null;
/* Babylon реагує на світло інакше за Three: один спільний регулятор,
   щоб не правити інтенсивність у кожній лампі окремо */
var GAIN = { point: 4.6, dir: 4.2, hemi: 4.2, amb: 4.0 };

var __n = 0;
function __nn(p){ return p + (++__n); }
function col3(c){
  if (c && c.r !== undefined) return new BABYLON.Color3(c.r, c.g, c.b);
  var h = (typeof c === 'string') ? parseInt(c.replace('#', ''), 16) : (c | 0);
  return new BABYLON.Color3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
}

/* ---- доповнення до векторів і кольорів, яких у Babylon нема ---- */
var V3 = BABYLON.Vector3.prototype, C3 = BABYLON.Color3.prototype;
V3.lerp = function(v, k){ this.x += (v.x - this.x) * k; this.y += (v.y - this.y) * k; this.z += (v.z - this.z) * k; return this; };
V3.copy = function(v){ this.x = v.x; this.y = v.y; this.z = v.z; return this; };
V3.setScalar = function(s){ this.x = this.y = this.z = s; return this; };
V3.distanceTo = function(v){ return BABYLON.Vector3.Distance(this, v); };
V3.toArray = function(){ return [this.x, this.y, this.z]; };
V3.sub = function(v){ this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; };
V3.project = function(cam){
  var e = engine, vp = cam.__b.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight());
  var p = BABYLON.Vector3.Project(this, BABYLON.Matrix.Identity(),
    bscene.getTransformMatrix(), vp);
  this.x = (p.x / e.getRenderWidth()) * 2 - 1;
  this.y = -((p.y / e.getRenderHeight()) * 2 - 1);
  this.z = p.z;
  return this;
};
C3.setHex = function(h){ var c = col3(h); this.r = c.r; this.g = c.g; this.b = c.b; return this; };
C3.getHex = function(){ return (Math.round(this.r * 255) << 16) | (Math.round(this.g * 255) << 8) | Math.round(this.b * 255); };
C3.lerp = function(c, k){ this.r += (c.r - this.r) * k; this.g += (c.g - this.g) * k; this.b += (c.b - this.b) * k; return this; };
C3.getHexString = function(){ return ('000000' + this.getHex().toString(16)).slice(-6); };

/* ---- спільні властивості для мешів і вузлів ---- */
function decorate(o){
  o.isMesh = !!o.getTotalVertices;
  o.add = function(c){ c.parent = o; return o; };
  o.remove = function(c){ if (c.parent === o) c.parent = null; return o; };
  Object.defineProperty(o, 'scale', { get: function(){ return o.scaling; }, configurable: true });
  Object.defineProperty(o, 'castShadow', {
    set: function(v){ if (v && shadowGen && o.getTotalVertices) shadowGen.addShadowCaster(o, true); },
    get: function(){ return false; }, configurable: true
  });
  // у Babylon видимість зветься інакше, а Three ховає і нащадків
  Object.defineProperty(o, 'visible', {
    get: function(){ return o.isEnabled ? o.isEnabled(false) : true; },
    set: function(v){ if (o.setEnabled) o.setEnabled(!!v); },
    configurable: true
  });
  Object.defineProperty(o, 'receiveShadow', {
    set: function(v){ o.receiveShadows = !!v; }, get: function(){ return o.receiveShadows; }, configurable: true
  });
  o.traverse = function(fn){
    fn(o);
    var kids = o.getChildren ? o.getChildren() : [];
    for (var i = 0; i < kids.length; i++) if (kids[i].traverse) kids[i].traverse(fn); else fn(kids[i]);
  };
  o.getWorldPosition = function(t){
    o.computeWorldMatrix(true);
    var p = o.getAbsolutePosition();
    if (t) { t.x = p.x; t.y = p.y; t.z = p.z; return t; }
    return p.clone();
  };
  if (!o.userData) o.userData = {};
  return o;
}

/* ---- геометрія: описи, які матеріалізує THREE.Mesh ---- */
function geo(k, a){ return { __geo: k, a: a }; }
function buildGeo(g){
  var a = g.a, m;
  switch (g.__geo) {
    case 'box':
      return BABYLON.MeshBuilder.CreateBox(__nn('box'), { width: a[0], height: a[1], depth: a[2] }, bscene);
    case 'sphere': {
      var o = { diameter: a[0] * 2, segments: Math.max(4, Math.round((a[1] || 12) / 2)) };
      if (a[4] !== undefined) o.slice = a[4] / Math.PI;      // напівсфера для лисини
      return BABYLON.MeshBuilder.CreateSphere(__nn('sph'), o, bscene);
    }
    case 'cyl':
      return BABYLON.MeshBuilder.CreateCylinder(__nn('cyl'),
        { diameterTop: a[0] * 2, diameterBottom: a[1] * 2, height: a[2], tessellation: a[3] || 8 }, bscene);
    case 'cone':
      return BABYLON.MeshBuilder.CreateCylinder(__nn('cone'),
        { diameterTop: 0, diameterBottom: a[0] * 2, height: a[1], tessellation: a[2] || 6 }, bscene);
    case 'torus': {
      // у Babylon CreateTorus не вміє дуги, тож неповний тор робимо трубкою по шляху
      var tr = a[0], tt = a[1], ts = a[2] || 12, arc = a[3] === undefined ? Math.PI * 2 : a[3];
      if (arc >= Math.PI * 2 - 1e-3)
        return BABYLON.MeshBuilder.CreateTorus(__nn('tor'),
          { diameter: tr * 2, thickness: tt * 2, tessellation: ts }, bscene);
      var pathPts = [];
      for (var pi = 0; pi <= ts; pi++) {
        var an = arc * pi / ts;
        pathPts.push(new BABYLON.Vector3(Math.cos(an) * tr, Math.sin(an) * tr, 0));
      }
      return BABYLON.MeshBuilder.CreateTube(__nn('tube'),
        { path: pathPts, radius: tt, tessellation: 6, cap: BABYLON.Mesh.CAP_ALL }, bscene);
    }
    case 'poly':
      return BABYLON.MeshBuilder.CreatePolyhedron(__nn('poly'), { type: 2, size: a[0] * 0.62 }, bscene);
    case 'plane':
      return BABYLON.MeshBuilder.CreatePlane(__nn('pl'),
        { width: a[0], height: a[1], sideOrientation: BABYLON.Mesh.DOUBLESIDE }, bscene);
    case 'ring': {
      // пласке кільце в площині XY, як у Three, щоб повороти в коді збіглися
      var ri = a[0], ro = a[1], seg = a[2] || 20;
      var pos = [], idx = [], nrm = [];
      for (var i = 0; i <= seg; i++) {
        var an = i / seg * Math.PI * 2;
        pos.push(Math.cos(an) * ri, Math.sin(an) * ri, 0);
        pos.push(Math.cos(an) * ro, Math.sin(an) * ro, 0);
        nrm.push(0, 0, 1, 0, 0, 1);
      }
      for (var k = 0; k < seg; k++) {
        var b0 = k * 2;
        idx.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2);
      }
      m = new BABYLON.Mesh(__nn('ring'), bscene);
      var vd = new BABYLON.VertexData();
      vd.positions = pos; vd.indices = idx; vd.normals = nrm;
      vd.applyToMesh(m);
      return m;
    }
    case 'buffer':
      return new BABYLON.Mesh(__nn('buf'), bscene);
  }
  return BABYLON.MeshBuilder.CreateBox(__nn('fallback'), { size: 1 }, bscene);
}

/* ---- матеріали ---- */
function makeMat(o, basic){
  o = o || {};
  var m = new BABYLON.StandardMaterial(__nn('mat'), bscene);
  m.specularColor = new BABYLON.Color3(0.015, 0.015, 0.015);
  m.diffuseColor = o.color !== undefined ? col3(o.color) : new BABYLON.Color3(1, 1, 1);
  m.emissiveColor = o.emissive !== undefined ? col3(o.emissive) : new BABYLON.Color3(0, 0, 0);
  if (basic) { m.disableLighting = true; m.emissiveColor = o.color !== undefined ? col3(o.color) : new BABYLON.Color3(1, 1, 1); m.diffuseColor = new BABYLON.Color3(0, 0, 0); }
  if (o.transparent || o.opacity !== undefined) m.alpha = o.opacity === undefined ? 1 : o.opacity;
  if (o.side === 2) m.backFaceCulling = false;
  else if (o.side === 1) m.sideOrientation = BABYLON.Material.ClockWiseSideOrientation;
  if (o.fog === false) m.fogEnabled = false;
  if (o.depthWrite === false) m.disableDepthWrite = true;
  m.__vcol = !!o.vertexColors;
  Object.defineProperty(m, 'emissive', { get: function(){ return m.emissiveColor; }, configurable: true });
  Object.defineProperty(m, 'color', { get: function(){ return m.diffuseColor; }, configurable: true });
  Object.defineProperty(m, 'opacity', { get: function(){ return m.alpha; }, set: function(v){ m.alpha = v; }, configurable: true });
  Object.defineProperty(m, 'transparent', { get: function(){ return m.alpha < 1; }, set: function(){}, configurable: true });
  m.clone0 = m.clone;
  m.clone = function(){ return decorateMat(reshareTex(m, m.clone0(__nn('mat')))); };
  return m;
}
/* Babylon клонує разом із матеріалом і його текстури, а копія DynamicTexture
   виходить порожньою й ніколи не стає готовою — StandardMaterial через це
   вважає меш неготовим і взагалі його не малює. Герой і вороги клонують
   матеріали заради спалаху від удару, тож повертаємо спільні текстури назад. */
var TEX_SLOTS = ['diffuseTexture', 'bumpTexture', 'emissiveTexture', 'specularTexture',
                 'ambientTexture', 'opacityTexture', 'reflectionTexture'];
function reshareTex(src, dst){
  for (var i = 0; i < TEX_SLOTS.length; i++) {
    var k = TEX_SLOTS[i];
    if (src[k] && dst[k] !== src[k]) { if (dst[k]) dst[k].dispose(); dst[k] = src[k]; }
  }
  return dst;
}

function decorateMat(m){
  Object.defineProperty(m, 'emissive', { get: function(){ return m.emissiveColor; }, configurable: true });
  Object.defineProperty(m, 'opacity', { get: function(){ return m.alpha; }, set: function(v){ m.alpha = v; }, configurable: true });
  Object.defineProperty(m, 'transparent', { get: function(){ return m.alpha < 1; }, set: function(){}, configurable: true });
  if (!m.userData) m.userData = {};
  m.clone0 = m.clone0 || m.clone;
  m.clone = function(){ return decorateMat(reshareTex(m, m.clone0(__nn('mat')))); };
  return m;
}

/* ---- інстанси ---- */
function InstancedShim(g, mat, count){
  var mesh = buildGeo(g);
  mesh.material = mat;
  var buf = new Float32Array(count * 16);
  mesh.count = count;
  mesh.setMatrixAt = function(i, m4){ m4.__m.copyToArray(buf, i * 16); };
  mesh.instanceMatrix = { needsUpdate: false };
  Object.defineProperty(mesh.instanceMatrix, 'needsUpdate', {
    set: function(v){ if (v) mesh.thinInstanceSetBuffer('matrix', buf, 16); },
    get: function(){ return false; }
  });
  return decorate(mesh);
}

/* ---- фасад ---- */
var THREE = {
  PCFSoftShadowMap: 1, sRGBEncoding: 1, ACESFilmicToneMapping: 1,
  FrontSide: 0, BackSide: 1, DoubleSide: 2,

  Vector2: function(x, y){ return new BABYLON.Vector2(x || 0, y || 0); },
  Vector3: function(x, y, z){ return new BABYLON.Vector3(x || 0, y || 0, z || 0); },
  Color: function(c){ return col3(c); },
  Euler: function(){ var e = { x: 0, y: 0, z: 0 }; e.set = function(a, b, c){ e.x = a; e.y = b; e.z = c; return e; }; return e; },
  Quaternion: function(){
    var q = { __q: BABYLON.Quaternion.Identity() };
    q.setFromEuler = function(e){ q.__q = BABYLON.Quaternion.FromEulerAngles(e.x, e.y, e.z); return q; };
    return q;
  },
  Matrix4: function(){
    var o = { __m: BABYLON.Matrix.Identity() };
    o.makeScale = function(x, y, z){ o.__m = BABYLON.Matrix.Scaling(x, y, z); return o; };
    o.compose = function(p, q, s){
      o.__m = BABYLON.Matrix.Compose(new BABYLON.Vector3(s.x, s.y, s.z), q.__q, new BABYLON.Vector3(p.x, p.y, p.z));
      return o;
    };
    return o;
  },

  BoxGeometry: function(w, h, d){ return geo('box', [w, h, d]); },
  SphereGeometry: function(r, ws, hs, ps, pl, ts, tl){ return geo('sphere', [r, ws, hs, ts, tl]); },
  CylinderGeometry: function(rt, rb, h, rs){ return geo('cyl', [rt, rb, h, rs]); },
  ConeGeometry: function(r, h, rs){ return geo('cone', [r, h, rs]); },
  TorusGeometry: function(r, t, rs, ts, arc){ return geo('torus', [r, t, ts, arc]); },
  DodecahedronGeometry: function(r){ return geo('poly', [r]); },
  PlaneGeometry: function(w, h, ws, hs){ return geo('plane', [w, h, ws, hs]); },
  RingGeometry: function(ri, ro, s){ return geo('ring', [ri, ro, s]); },
  BufferGeometry: function(){ return geo('buffer', []); },
  Float32BufferAttribute: function(arr, n){ return { array: arr, itemSize: n }; },

  MeshLambertMaterial: function(o){ return makeMat(o, false); },
  MeshBasicMaterial: function(o){ return makeMat(o, true); },

  Group: function(){ return decorate(new BABYLON.TransformNode(__nn('grp'), bscene)); },
  Mesh: function(g, mat){
    var m = buildGeo(g);
    if (mat) { m.material = mat; if (mat.__vcol) m.useVertexColors = true; }
    return decorate(m);
  },
  InstancedMesh: function(g, mat, count){ return InstancedShim(g, mat, count); },

  PointLight: function(c, i, dist){
    var L = new BABYLON.PointLight(__nn('pl'), BABYLON.Vector3.Zero(), bscene);
    L.diffuse = col3(c); L.specular = new BABYLON.Color3(0, 0, 0);
    L.intensity = (i === undefined ? 1 : i) * GAIN.point;
    if (dist) L.range = dist;
    return decorate(L);
  },
  DirectionalLight: function(c, i){
    var L = new BABYLON.DirectionalLight(__nn('dl'), new BABYLON.Vector3(0.4, -1, 0.4), bscene);
    L.diffuse = col3(c); L.specular = new BABYLON.Color3(0, 0, 0);
    L.intensity = (i === undefined ? 1 : i) * GAIN.dir;
    L.target = { position: new BABYLON.Vector3(0, 0, 0), updateMatrixWorld: function(){
      L.direction = L.target.position.subtract(L.position).normalize();
    } };
    L.shadow = { mapSize: { set: function(){} }, camera: {}, bias: 0 };
    Object.defineProperty(L, 'castShadow', {
      set: function(v){ if (v && !shadowGen) {
        // кадр тіні тримаємо малим і прив'язаним до гравця: автопідбір
        // розтягував його на всі 340 одиниць карти, і текстури не вистачало —
        // уся сцена вкривалась самозатіненням і ставала майже чорною
        L.autoUpdateExtends = false;
        L.orthoLeft = -30; L.orthoRight = 30; L.orthoTop = 30; L.orthoBottom = -30;
        L.shadowMinZ = 1; L.shadowMaxZ = 160;
        shadowGen = new BABYLON.ShadowGenerator(LOWFX ? 512 : 2048, L);
        shadowGen.usePercentageCloserFiltering = true;
        shadowGen.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
        shadowGen.bias = 0.008;
        shadowGen.normalBias = 0.02;
        shadowGen.darkness = 0.38;
      } },
      get: function(){ return !!shadowGen; }, configurable: true
    });
    return L;
  },
  HemisphereLight: function(sky, ground, i){
    var L = new BABYLON.HemisphericLight(__nn('hl'), new BABYLON.Vector3(0.2, 1, 0.1), bscene);
    L.diffuse = col3(sky); L.groundColor = col3(ground); L.specular = new BABYLON.Color3(0, 0, 0);
    L.intensity = (i === undefined ? 1 : i) * GAIN.hemi;
    return L;
  },
  AmbientLight: function(c, i){
    var L = new BABYLON.HemisphericLight(__nn('al'), new BABYLON.Vector3(0, 1, 0), bscene);
    L.diffuse = col3(c); L.groundColor = col3(c); L.specular = new BABYLON.Color3(0, 0, 0);
    L.intensity = (i === undefined ? 1 : i) * GAIN.amb;
    return L;
  },

  Fog: function(c, near, far){
    bscene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    bscene.fogColor = col3(c);
    bscene.fogStart = near; bscene.fogEnd = far;
    var f = {};
    Object.defineProperty(f, 'color', { get: function(){ return bscene.fogColor; } });
    Object.defineProperty(f, 'near', { get: function(){ return bscene.fogStart; }, set: function(v){ bscene.fogStart = v; } });
    Object.defineProperty(f, 'far', { get: function(){ return bscene.fogEnd; }, set: function(v){ bscene.fogEnd = v; } });
    return f;
  },

  Scene: function(){
    var s = { __b: bscene, children: [] };
    var bg = new BABYLON.Color3(0.06, 0.07, 0.1);
    bscene.clearColor = new BABYLON.Color4(bg.r, bg.g, bg.b, 1);
    var bgProxy = col3(0x10131a);
    bgProxy.setHex = function(h){ var c = col3(h); bscene.clearColor = new BABYLON.Color4(c.r, c.g, c.b, 1); return bgProxy; };
    s.background = bgProxy;
    s.fog = null;
    s.add = function(o){ if (o && o.parent === undefined) {} return s; };
    s.remove = function(o){ if (o && o.setEnabled) o.setEnabled(false); return s; };
    s.traverse = function(fn){ bscene.meshes.forEach(fn); };
    return s;
  },

  PerspectiveCamera: function(fovDeg, aspect, near, far){
    var c = new BABYLON.UniversalCamera(__nn('cam'), new BABYLON.Vector3(0, 5, 10), bscene);
    c.fov = fovDeg * Math.PI / 180;
    c.minZ = near; c.maxZ = far;
    c.inputs.clear();
    bscene.activeCamera = c;
    var o = { __b: c };
    o.position = c.position;
    o.lookAt = function(x, y, z){ c.setTarget(new BABYLON.Vector3(x, y, z)); };
    o.updateProjectionMatrix = function(){};
    o.updateMatrixWorld = function(){};
    Object.defineProperty(o, 'aspect', { get: function(){ return 1; }, set: function(){}, configurable: true });
    Object.defineProperty(o, 'far', { get: function(){ return c.maxZ; }, configurable: true });
    return o;
  },

  WebGLRenderer: function(){
    var r = {
      domElement: __cv,
      shadowMap: { enabled: false, type: 1 },
      outputEncoding: 1, toneMapping: 1,
      setPixelRatio: function(v){ engine.setHardwareScalingLevel(1 / Math.max(0.5, v)); },
      setSize: function(){ engine.resize(); },
      render: function(){ bscene.render(); }
    };
    Object.defineProperty(r, 'toneMappingExposure', {
      set: function(v){
        var ip = bscene.imageProcessingConfiguration;
        ip.toneMappingEnabled = true;
        ip.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        ip.exposure = v;
      },
      get: function(){ return bscene.imageProcessingConfiguration.exposure; }, configurable: true
    });
    return r;
  }
};
