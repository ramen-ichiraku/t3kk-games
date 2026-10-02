/* ================= налаштування ================= */
var RIM = 130, EDGE = 140;               // де починається круча і де стіна
var GRAV = 24, PR = 0.44;                // тяжіння і радіус гравця
var WALK = 3.6, RUN = 6.4;

var CHAPEL = { x: 0, z: 86 };
var GX = 26;                             // вісь ущелини
var CAVE   = { x: GX, z: -70 };
var ARENA  = { x: GX, z: -104, r: 18 };  // зала боса
var MASSIF = { x: GX, z: -96, r: 48 };
var GORGE  = { z0: -60, z1: -86 };       // прохід крізь масив
var RIVER_Z = -6;                        // сухе русло
var BRIDGE = null;
var FIRES = [
  { x: -5, z: 70, name: 'Вогнище біля каплиці' },
  { x: 22, z: -52, name: 'Вогнище перед ущелиною' }
];
var FIRE = FIRES[0];
var ROAD = [[0,80],[3,56],[-4,34],[6,14],[4,-6],[2,-24],[12,-40],[20,-52],[26,-62]];

/* ================= рушій ================= */
var renderer = new THREE.WebGLRenderer({ antialias: !LOWFX, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(LOWFX ? 1 : 1.75, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = !LOWFX;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.insertBefore(renderer.domElement, document.getElementById('fade'));
engine.resize();

var scene = new THREE.Scene();
// Палітра навмисно вузька: холодна тінь, теплий обрій, і більше нічого.
// Градієнтний стиль живе з контрасту двох температур, а не з кількості барв.
var SKY = 0x2b3350, FOGC = 0x4b4a60;
scene.background = new THREE.Color(SKY);
// туман починається близько й тягнеться далеко: це повітряна перспектива,
// вона розділяє плани й дає відчуття простору задарма
scene.fog = new THREE.Fog(FOGC, 34, 200);

var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

var hemi = new THREE.HemisphereLight(0x7183b4, 0x4a3a2c, 0.78);
scene.add(hemi);
var sun = new THREE.DirectionalLight(0xffc07a, 1.25);
sun.position.set(-40, 54, -70);
if (!LOWFX) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  var sc = sun.shadow.camera;
  sc.near = 1; sc.far = 130; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34;
  sun.shadow.bias = -0.0012;
}
scene.add(sun);
scene.add(sun.target);
var amb = new THREE.AmbientLight(0x3a4068, 0.30);
scene.add(amb);

/* ---- пост-обробка: найбільший стрибок у вигляді за найменші зусилля ---- */
(function(){
  var cam = camera.__b;
  var pipe = new BABYLON.DefaultRenderingPipeline('look', true, bscene, [cam]);
  pipe.samples = LOWFX ? 1 : 4;
  pipe.fxaaEnabled = !LOWFX;
  pipe.bloomEnabled = true;
  // поріг високий навмисно: світитись має золотий Карась і вогонь,
  // а не кожен персонаж у кадрі
  pipe.bloomThreshold = 0.82;
  pipe.bloomWeight = 0.42;
  pipe.bloomKernel = 48;
  pipe.bloomScale = 0.5;
  pipe.imageProcessingEnabled = true;
  var ip = pipe.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.18;
  ip.contrast = 1.16;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 1.05;
  ip.vignetteStretch = 0.4;
  ip.vignetteColor = new BABYLON.Color4(0.02, 0.02, 0.04, 1);
  ip.vignetteCameraFov = 1.1;
  if (!LOWFX) {
    pipe.sharpenEnabled = true;
    pipe.sharpen.edgeAmount = 0.12;
    // SSAO тут не потрібен: у пласкому стилі він лише брудить стики,
    // а коштував майже десяту частину кадру
  }
})();

