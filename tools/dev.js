#!/usr/bin/env node
/*
  Локальний стенд: роздає гру по http, стежить за src/ та assets/, перезбирає
  karas3.html і перезавантажує вкладку.

  По http, а не з файлу, бо браузер не віддає .glb через file:// — без сервера
  всі моделі мовчки не завантажаться й гра покаже саморобні примітиви.

  Запуск:
      node tools/dev.js            http://127.0.0.1:8123
      node tools/dev.js --port 9000

  Зручності:
      /karas3.html?go   — одразу починає гру й повертає тебе туди, де ти був
                          до перезавантаження (позиція живе в sessionStorage)

  Нічого не ставить і не тягне: лише вбудовані модулі node.
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const PORT = (() => { const i = argv.indexOf('--port'); return i >= 0 ? +argv[i + 1] : 8123; })();

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon'
};

/* ---------- клієнт перезавантаження, вшивається лише тут ---------- */
const CLIENT = `
<script>
(function(){
  var DEV = { on: true };
  // позиція переживає перезавантаження, щоб не бігти щоразу з каплиці
  var auto = location.search.indexOf('go') >= 0;
  function save(){
    try {
      var K = window.__K3;
      if (K && K.P) sessionStorage.setItem('dev.pos',
        JSON.stringify({ x: K.P.x, z: K.P.z, yaw: K.P.yaw }));
    } catch (e) {}
  }
  // Писати починаємо ЛИШЕ після відновлення: моделі вантажаться кілька
  // секунд, і автозбереження встигало затерти старе місце точкою появи.
  function startSaving(){
    setInterval(save, 1000);
    window.addEventListener('beforeunload', save);
  }

  // Гру НЕ запускаємо штучним кліком. Після b.click() браузер перестає
  // видавати mousedown і mouseup — лишається самий click, — а гра слухає
  // саме mousedown, тож і удари, і захоплення миші виявлялись мертві.
  // Тому лише повертаємо героя на місце, а «Прокинутися» тисне людина:
  // справжнє натискання до того ж єдине, чим браузер дозволяє захопити мишу.
  if (auto) {
    var t = setInterval(function(){
      if (!(window.__K3 && window.__K3.ready && window.__K3.ready())) return;
      clearInterval(t);
      try {
        var p = JSON.parse(sessionStorage.getItem('dev.pos') || 'null');
        if (p) { window.__K3.tp(p.x, p.z); window.__K3.P.yaw = p.yaw; }
      } catch (e) {}
      startSaving();
      var b = document.getElementById('bGo');
      if (b) b.textContent = 'Прокинутися (стенд поверне тебе на місце)';
    }, 150);
  } else {
    startSaving();
  }

  var box;
  function note(text, bad){
    if (!box) {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;' +
        'font:13px ui-monospace,Consolas,monospace;white-space:pre-wrap;padding:10px 14px;' +
        'max-height:45vh;overflow:auto';
      document.body.appendChild(box);
    }
    box.style.background = bad ? 'rgba(90,16,16,0.96)' : 'rgba(20,24,30,0.9)';
    box.style.color = bad ? '#ffd9d9' : '#cfe';
    box.textContent = text;
    box.hidden = false;
  }
  var es = new EventSource('/__dev');
  es.onmessage = function(e){
    var m = JSON.parse(e.data);
    if (m.t === 'build') note('перезбірка…');
    if (m.t === 'error') note('ПОМИЛКА ЗБІРКИ\\n\\n' + m.text, true);
    if (m.t === 'reload') { save(); location.reload(); }
  };
  es.onerror = function(){ note('стенд відвалився — перевір, чи працює node tools/dev.js', true); };
})();
</script>
`;

/* ---------- збірка ---------- */
let building = false, again = false;
function build(done){
  if (building) { again = true; return; }
  building = true;
  send({ t: 'build' });
  execFile(process.execPath, [path.join(ROOT, 'build.js')], { cwd: ROOT }, (err, out, errOut) => {
    building = false;
    const text = (out || '').trim() + (errOut ? '\n' + errOut.trim() : '');
    if (err) {
      console.log('  ПОМИЛКА ЗБІРКИ:\n' + text);
      send({ t: 'error', text: text || String(err) });
    } else {
      console.log('  ' + text);
      send({ t: 'reload' });
    }
    if (again) { again = false; build(); }
    if (done) done();
  });
}

/* ---------- потік подій ---------- */
const clients = new Set();
function send(msg){
  const line = 'data: ' + JSON.stringify(msg) + '\n\n';
  clients.forEach(res => { try { res.write(line); } catch (e) {} });
}

/* ---------- сервер ---------- */
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/__dev') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!path.resolve(file).startsWith(ROOT)) { res.writeHead(403); return res.end('ні'); }

  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('нема: ' + url); }
    const ext = path.extname(file).toLowerCase();
    let body = data;
    if (ext === '.html') {
      // клієнт перезавантаження живе лише тут і в репозиторій не потрапляє
      const s = data.toString('utf8');
      const i = s.lastIndexOf('</body>');
      body = Buffer.from(i >= 0 ? s.slice(0, i) + CLIENT + s.slice(i) : s + CLIENT, 'utf8');
    }
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store' });
    res.end(body);
  });
});

/* ---------- стеження ---------- */
let timer = null;
function watch(dir){
  if (!fs.existsSync(dir)) return;
  fs.watch(dir, { recursive: true }, (ev, name) => {
    if (!name) return;
    if (/[~]$|\.swp$|^\.|\bkaras3\.html$/.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log('\nзмінилось: ' + name);
      build();
    }, 120);
  });
}

/* Стенд має пережити будь-яку помилку: він потрібен увесь час, поки йде
   робота, і падати через збій у стеженні за файлами чи в розірваному
   з'єднанні він не має права. */
function survive(e){
  console.log('\nстенд спіткнувся, але працює далі: ' + (e && e.message ? e.message : e));
}
process.on('uncaughtException', survive);
process.on('unhandledRejection', survive);
srv.on('error', e => {
  if (e && e.code === 'EADDRINUSE') {
    console.log('порт ' + PORT + ' уже зайнятий — мабуть, стенд уже працює в іншому вікні.');
    process.exit(1);
  }
  console.log('помилка сервера: ' + e.message);
});

srv.listen(PORT, '127.0.0.1', () => {
  const base = 'http://127.0.0.1:' + PORT;
  console.log('стенд працює:');
  console.log('  ' + base + '/karas3.html?go   — Кільце Карася, одразу в грі');
  console.log('  ' + base + '/                 — каталог ігор');
  console.log('стежу за src/ та assets/. Ctrl+C щоб спинити.\n');
  watch(path.join(ROOT, 'src'));
  watch(path.join(ROOT, 'assets'));
  build();
});
