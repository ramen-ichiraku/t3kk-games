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

function hasModel(id){ return !!MDL[id]; }

/* Екземпляр моделі як вузол, із яким працює решта коду (position/rotation/scale).
   opt.s — масштаб, opt.shadow — чи кидає тінь. Повертає null, якщо моделі нема. */
var __mdlN = 0;
function model(id, opt){
  var t = MDL[id];
  if (!t) return null;
  var o = opt || {};
  var inst = t.createInstance('i' + (++__mdlN) + ':' + id);
  inst.isPickable = false;
  var s = o.s === undefined ? 1 : o.s;
  inst.scaling.set(s, s, s);
  inst.receiveShadows = !LOWFX && o.shadow !== false;
  return decorate(inst);
}

/* Випадкова модель зі списку — для розсипів каміння й трави */
function modelAny(ids, opt){
  var live = [];
  for (var i = 0; i < ids.length; i++) if (MDL[ids[i]]) live.push(ids[i]);
  if (!live.length) return null;
  return model(live[Math.floor(rnd() * live.length)], opt);
}

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
  return m;
}
