/* ================= дрібний генератор ================= */
var seed = 1337;
function rnd(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
function rr(a, b){ return a + rnd() * (b - a); }

