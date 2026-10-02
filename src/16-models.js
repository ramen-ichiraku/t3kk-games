/* ================= готові моделі =================
   Реквізит — моделі з наборів Kenney (CC0, суспільне надбання): Graveyard
   Kit, Survival Kit, Fantasy Town Kit. Лежать в assets/ поруч із грою.

   Кожен файл вантажиться один раз у вимкнений зразок. Далі з нього роблять
   не копії, а екземпляри (createInstance): вони ділять геометрію й матеріал,
   тож сотня каменюк коштує стільки ж викликів малювання, скільки одна.

   Якщо файлів нема — наприклад, гру відкрили з file:// без сервера — усе
   просто повертає null, і код будівництва малює старий примітив. Гра через
   це не ламається, лише виглядає гірше. */

/* Моделі кожного набору лежать у власній теці: вони тягнуть зовнішню
   текстуру Textures/colormap.png, і в кожного набору вона своя. */
var MODEL_DIR = {
  'gy': ['grave-bevel', 'grave-broken', 'grave-cross', 'grave-round', 'grave-wide', 'grave-debris', 'cross-wood', 'cross-stone', 'crypt-small', 'crypt-a', 'altar', 'bench-broken', 'urn', 'obelisk', 'pillar-large', 'pillar-square', 'column', 'wall-stone', 'wall-broken', 'wall-column', 'brick-wall', 'iron-fence', 'iron-fence-bad', 'iron-post', 'brazier', 'lantern', 'pine', 'pine-crooked', 'pine-dead', 'trunk-long', 'rocks-tall', 'rocks', 'debris', 'debris-wood', 'hay'],
  'sv': ['fence-wood', 'fence-strong', 'campfire', 'campfire-stand', 'tree', 'tree-tall', 'stump', 'log', 'rock-a', 'rock-b', 'rock-c', 'rock-flat', 'grass', 'grass-large', 'grass-patch', 'barrel', 'barrel-open', 'crate', 'chest', 'bucket', 'planks', 'firewood', 'signpost'],
  'tn': ['house-wall', 'house-door', 'house-window', 'house-broken', 'roof', 'roof-gable', 'roof-left', 'roof-right', 'cart', 'stall', 'well-stairs', 'town-lantern']
};

/* Згенеровані деталі персонажів. Лежать окремо: у них нема спільної
   текстури, і правила до них інші — їх ріжемо й робимо гранованими. */
MODEL_DIR['chars'] = ['karas-head', 'karas-body', 'karas-hero'];

/* Генератор 3D навчений на цілих предметах і вперто ліпить цілу істоту:
   на три різні формулювання «голова з обрубком шиї» він тричі видав усю рибу.
   Тому беремо ціле й ріжемо самі — безкоштовно, точно й повторювано.

   keep(x, y, z) дістає координати центра трикутника, зведені до нуля-одиниці
   по габариту меша. flat — зробити гранованим: генератор згладжує нормалі, а
   нам потрібні грані, як у решти світу. */
/* Герой приходить ЦІЛОЮ фігурою в Т-позі, і це принципово: два шматки,
   замовлені нарізно, не складаються в персонажа — між ними нема ні плечей,
   ні талії. Ціла фігура задумана як одне, а на кінцівки ріжемо її тут, по
   суглобах. Усі частини з одного меша, тож пасують одна до одної.

   Межі взяті не на око: гістограма зайнятості меша показала, що руки лежать
   поза x 0.28..0.72 на висоті y 0.58..0.75, голова вище y 0.80, ноги нижче
   y 0.30. Координати — частки габариту фігури. */
/* Межі перекриваються: сусідні частини заходять одна в одну, інакше на
   кожному суглобі зяяла б дірка, коли кінцівка повернеться. Для різаного
   персонажа це звичайний прийом — шов ховається всередині тіла. */
function __arm(x, y){ return (x < 0.30 || x > 0.70) && y > 0.50; }
var FIGURE = {
  'karas-hero': {
    pieces: {
      head:   function(x, y){ return y > 0.76; },
      torso:  function(x, y){ return y > 0.27 && y <= 0.81 && !__arm(x, y); },
      armL:   function(x, y){ return __arm(x, y) && x < 0.5 && x > 0.125; },
      foreL:  function(x, y){ return __arm(x, y) && x <= 0.165; },
      armR:   function(x, y){ return __arm(x, y) && x > 0.5 && x < 0.875; },
      foreR:  function(x, y){ return __arm(x, y) && x >= 0.835; },
      thighL: function(x, y){ return y <= 0.32 && y > 0.135 && x < 0.5; },
      shinL:  function(x, y){ return y <= 0.175 && x < 0.5; },
      thighR: function(x, y){ return y <= 0.32 && y > 0.135 && x >= 0.5; },
      shinR:  function(x, y){ return y <= 0.175 && x >= 0.5; }
    },
    /* точки суглобів у тих самих частках габариту */
    anchor: {
      neck: [0.5, 0.795],
      shL: [0.28, 0.665], elL: [0.145, 0.655],
      shR: [0.72, 0.665], elR: [0.855, 0.655],
      hipL: [0.44, 0.30], knL: [0.44, 0.155],
      hipR: [0.56, 0.30], knR: [0.56, 0.155]
    }
  }
};
var MDL_FIG = {};        // id -> { wr, dr, anchor }: ширина й глибина у частках висоти

var FIT = {
  'karas-head': { keep: function(x, y, z){ return y > 0.34 && z > 0.42; },
                  flat: true, norm: true, clone: true },
  'karas-body': { flat: true, norm: true, clone: true }
};

var MODEL_IDS = [];
var MODEL_OF = {};
for (var __d in MODEL_DIR) if (MODEL_DIR.hasOwnProperty(__d))
  for (var __i = 0; __i < MODEL_DIR[__d].length; __i++) {
    MODEL_IDS.push(MODEL_DIR[__d][__i]);
    MODEL_OF[MODEL_DIR[__d][__i]] = __d;
  }

var MDL = {};                 // id -> зразок (вимкнений меш)
var MODELS_READY = false;
var MODELS_OK = 0;

function loadModels(done){
  if (!BABYLON.SceneLoader || !BABYLON.SceneLoader.ImportMeshAsync) { MODELS_READY = true; return done(); }
  var left = MODEL_IDS.length;
  function tick(){ if (--left <= 0) { MODELS_READY = true; done(); } }

  MODEL_IDS.forEach(function(id){
    BABYLON.SceneLoader.ImportMeshAsync('', 'assets/' + MODEL_OF[id] + '/', id + '.glb', bscene).then(function(res){
      var parts = res.meshes.filter(function(m){ return m.getTotalVertices && m.getTotalVertices() > 0; });
      if (!parts.length) { res.meshes.forEach(function(m){ m.dispose(); }); return tick(); }
      // в один меш, щоб потім робити дешеві екземпляри
      var one = parts.length === 1 ? parts[0]
        : BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
      if (!one) { parts.forEach(function(m){ m.dispose(); }); return tick(); }
      if (FIGURE[id]) { splitFigure(id, one); MODELS_OK++; return tick(); }
      var fit = FIT[id];
      if (fit && fit.keep) cutMesh(one, fit.keep);
      if (fit && fit.norm) normMesh(one);
      if (fit && fit.flat) one.convertToFlatShadedMesh();
      one.name = 'mdl:' + id;
      one.setParent(null);
      one.position.set(0, 0, 0);
      one.rotation.set(0, 0, 0);
      one.setEnabled(false);
      one.isPickable = false;
      // glTF приходить із PBR-матеріалом. Перекладати його на StandardMaterial
      // не можна: текстура Kenney — атлас кольорів, і без PBR-ової обробки
      // гамми відтінки з'їжджають (сірий камінь ставав синім). Тому лишаємо
      // PBR і лише пригашуємо: наші лампи мають посилення під Lambert, а PBR
      // ділить світло на пі, через що моделі світилися, як ліхтарі.
      var pm = one.material;
      if (pm && pm.getClassName && pm.getClassName() === 'PBRMaterial') {
        // камінь Kenney холодно-синій і свариться з теплим обрієм — зсуваємо
        // його в бік землі, щоб палітра лишалась вузькою
        if (pm.albedoColor) {
          pm.albedoColor = new BABYLON.Color3(
            Math.min(1, pm.albedoColor.r * 1.10),
            Math.min(1, pm.albedoColor.g * 1.02),
            pm.albedoColor.b * 0.86);
        }
        pm.directIntensity = 0.26;
        pm.environmentIntensity = 0;
        pm.metallic = 0;
        pm.roughness = 1;
        pm.backFaceCulling = true;
      }
      // зразок реєструємо як джерело тіні один раз — екземпляри йдуть із ним
      if (!LOWFX && shadowGen) shadowGen.addShadowCaster(one, false);
      // порожні вузли з glTF прибираємо, інакше вони лишаються в сцені назавжди
      res.meshes.forEach(function(m){ if (m !== one && !m.isDisposed()) m.dispose(); });
      if (res.transformNodes) res.transformNodes.forEach(function(n){ if (n !== one) n.dispose(); });
      MDL[id] = one;
      MODELS_OK++;
      tick();
    }).catch(function(){ tick(); });
  });
}

/* Лишає тільки ті трикутники, центр яких проходить перевірку, і ущільнює
   вершини. Без ущільнення габарит меша лишався б від цілої риби, і весь
   подальший масштаб поплив би. */
function cutMesh(m, keep){
  var pos = m.getVerticesData('position'), idx = m.getIndices();
  if (!pos || !idx) return m;
  var nrm = m.getVerticesData('normal'), uv = m.getVerticesData('uv');
  var bb = m.getBoundingInfo().boundingBox, mn = bb.minimum, mx = bb.maximum;
  var dx = (mx.x - mn.x) || 1, dy = (mx.y - mn.y) || 1, dz = (mx.z - mn.z) || 1;
  var map = new Int32Array(pos.length / 3);
  for (var z0 = 0; z0 < map.length; z0++) map[z0] = -1;
  var np = [], nn = [], nu = [], ni = [];
  function push(v){
    if (map[v] >= 0) return map[v];
    var o = np.length / 3;
    np.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    if (nrm) nn.push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]);
    if (uv) nu.push(uv[v * 2], uv[v * 2 + 1]);
    map[v] = o;
    return o;
  }
  for (var i = 0; i < idx.length; i += 3) {
    var a0 = idx[i], b0 = idx[i + 1], c0 = idx[i + 2];
    var cx = (pos[a0 * 3] + pos[b0 * 3] + pos[c0 * 3]) / 3;
    var cy = (pos[a0 * 3 + 1] + pos[b0 * 3 + 1] + pos[c0 * 3 + 1]) / 3;
    var cz = (pos[a0 * 3 + 2] + pos[b0 * 3 + 2] + pos[c0 * 3 + 2]) / 3;
    if (!keep((cx - mn.x) / dx, (cy - mn.y) / dy, (cz - mn.z) / dz)) continue;
    ni.push(push(a0), push(b0), push(c0));
  }
  if (!ni.length) return m;
  var vd = new BABYLON.VertexData();
  vd.positions = np; vd.indices = ni;
  if (nrm) vd.normals = nn;
  if (uv) vd.uvs = nu;
  vd.applyToMesh(m);
  return m;
}

/* Зводить меш до одиничного габариту з центром у нулі — тоді масштаб у
   виклику model() означає розмір у метрах, і він не поповзе, якщо деталь
   колись перегенерувати. */
function normMesh(m){
  var pos = m.getVerticesData('position');
  if (!pos) return m;
  m.refreshBoundingInfo();
  var bb = m.getBoundingInfo().boundingBox, mn = bb.minimum, mx = bb.maximum;
  var k = 1 / Math.max(mx.x - mn.x, mx.y - mn.y, mx.z - mn.z, 0.0001);
  var cx = (mn.x + mx.x) / 2, cy = (mn.y + mx.y) / 2, cz = (mn.z + mx.z) / 2;
  for (var i = 0; i < pos.length; i += 3) {
    pos[i] = (pos[i] - cx) * k;
    pos[i + 1] = (pos[i + 1] - cy) * k;
    pos[i + 2] = (pos[i + 2] - cz) * k;
  }
  m.setVerticesData('position', pos);
  m.refreshBoundingInfo();
  return m;
}

/* Ріже цілу фігуру на частини по суглобах і зводить усі їх в один простір:
   висота дорівнює одиниці, ступні на нулі, центр по X і Z. Частини лишаються
   на своїх місцях одна відносно одної — саме тому фігура й замовлялась цілою. */
function splitFigure(id, one){
  var F = FIGURE[id];
  var bb = one.getBoundingInfo().boundingBox, mn = bb.minimum, mx = bb.maximum;
  var H = (mx.y - mn.y) || 1;
  var cx = (mn.x + mx.x) / 2, cz = (mn.z + mx.z) / 2;
  MDL_FIG[id] = { wr: (mx.x - mn.x) / H, dr: (mx.z - mn.z) / H, anchor: F.anchor, h: H };

  // clone() у Babylon ДІЛИТЬ геометрію, а не копіює: різали б уже відрізане
  // і від фігури лишалось би казна-що. Тому кожній частині — власні вершини.
  var src = BABYLON.VertexData.ExtractFromMesh(one);
  for (var k in F.pieces) {
    if (!F.pieces.hasOwnProperty(k)) continue;
    var p = new BABYLON.Mesh(id + ':' + k, bscene);
    var vd0 = new BABYLON.VertexData();
    vd0.positions = src.positions.slice();
    vd0.indices = src.indices.slice();
    if (src.normals) vd0.normals = src.normals.slice();
    if (src.uvs) vd0.uvs = src.uvs.slice();
    vd0.applyToMesh(p);
    p.material = one.material;
    cutMesh(p, F.pieces[k]);                 // габарит копії ще від цілої фігури — так і треба
    var pos = p.getVerticesData('position');
    if (!pos || !pos.length) { p.dispose(); continue; }
    for (var i = 0; i < pos.length; i += 3) {
      pos[i] = (pos[i] - cx) / H;
      pos[i + 1] = (pos[i + 1] - mn.y) / H;
      pos[i + 2] = (pos[i + 2] - cz) / H;
    }
    p.setVerticesData('position', pos);
    p.refreshBoundingInfo();
    p.convertToFlatShadedMesh();
    p.name = 'mdl:' + id + ':' + k;
    p.setEnabled(false);
    p.isPickable = false;
    MDL[id + ':' + k] = p;
  }
  one.dispose();
}

function hasModel(id){ return !!MDL[id]; }

/* Обведення на реквізиті: саме контур дає тій стилістиці, що в Wind Waker чи
   Okami, її впізнаваність, і він же відділяє предмет від предмета в кадрі.
   Дрібниці пропускаємо — трава, галька, тріски: їх сотні, а силуету в них
   нема. Заміряно: 552 обведені меші кадр не подорожчали. */
var NO_OUTLINE = {
  'grass': 1, 'grass-large': 1, 'grass-patch': 1, 'debris': 1, 'debris-wood': 1,
  'firewood': 1, 'bucket': 1, 'planks': 1,
  'rock-a': 1, 'rock-b': 1, 'rock-c': 1, 'rock-flat': 1, 'rocks': 1
};

/* Екземпляр моделі як вузол, із яким працює решта коду (position/rotation/scale).
   opt.s — масштаб, opt.shadow — чи кидає тінь. Повертає null, якщо моделі нема. */
var __mdlN = 0;
function model(id, opt){
  var t = MDL[id];
  if (!t) return null;
  var o = opt || {};
  var fit = FIT[id] || (id.indexOf(':') > 0 ? { clone: true } : null);
  // Екземпляр не може мати власного матеріалу — усі ділять матеріал зразка.
  // Персонажам потрібні різні кольори, тож для них робимо копію. Їх мало.
  var inst = (fit && fit.clone)
    ? t.clone('c' + (++__mdlN) + ':' + id)
    : t.createInstance('i' + (++__mdlN) + ':' + id);
  if (fit && fit.clone) inst.setEnabled(true);
  inst.isPickable = false;
  inst.__mid = id;                 // щоб потім знати, з чого робити тіло
  var s = o.s === undefined ? 1 : o.s;
  inst.scaling.set(s, s, s);
  inst.receiveShadows = !LOWFX && o.shadow !== false;
  if (!LOWFX && !NO_OUTLINE[id] && o.outline !== false) {
    inst.renderOutline = true;
    inst.outlineWidth = 0.05;
    inst.outlineColor = new BABYLON.Color3(0.04, 0.035, 0.05);
  }
  return decorate(inst);
}

/* Випадкова модель зі списку — для розсипів каміння й трави */
function modelAny(ids, opt){
  var live = [];
  for (var i = 0; i < ids.length; i++) if (MDL[ids[i]]) live.push(ids[i]);
  if (!live.length) return null;
  return model(live[Math.floor(rnd() * live.length)], opt);
}

/* Дрібниці, крізь які треба ходити вільно: трава, тріски, кістки під ногами.
   Решта реквізиту має бути твердою. */
var NO_SOLID = {
  'grass': 1, 'grass-large': 1, 'grass-patch': 1, 'debris': 1, 'debris-wood': 1,
  'firewood': 1, 'planks': 1, 'rock-flat': 1, 'grave-debris': 1
};

/* Робить поставлену модель твердою: радіус береться з її ж габариту, тож
   зіткнення збігається з тим, що намальовано. Доти кожен надгробок, склеп,
   паркан і бочка були прозорі — їх просто не існувало для гравця. */
function solidify(id, m, x, z){
  if (NO_SOLID[id]) return;
  var t = MDL[id];
  if (!t) return;
  var e = t.getBoundingInfo().boundingBox.extendSize;
  var sc = m.scaling ? m.scaling.x : 1;
  // радіус трохи менший за намальоване: впритул до краю краще пройти,
  // ніж застрягти в щілині між двома тілами
  var r = Math.max(e.x, e.z) * sc * 0.82;
  if (r < 0.26) return;                       // зовсім дрібне не чіпаємо
  addWall(x, z, r, hAt(x, z) + e.y * 2 * sc + 0.3);
}

/* Те саме для моделі, поставленої вручну: ідентифікатор лежить на самому вузлі. */
function solidifyNode(m, x, z){ if (m && m.__mid) solidify(m.__mid, m, x, z); }

/* Ставить модель на землю в точці (x,z). Повертає вузол або null. */
function placeModel(root, id, x, z, o){
  var m = model(id, o);
  if (!m) return null;
  o = o || {};
  m.position.set(x, hAt(x, z) + (o.y || 0), z);
  m.rotation.y = o.yaw === undefined ? rnd() * 6.283 : o.yaw;
  if (o.tilt) { m.rotation.x = o.tilt; m.rotation.z = o.tilt2 || 0; }
  if (o.sy !== undefined) m.scaling.y = m.scaling.y * o.sy;
  root.add(m);
  if (o.solid !== false) solidify(id, m, x, z);
  return m;
}
