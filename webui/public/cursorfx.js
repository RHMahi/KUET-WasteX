/* KUET WasteX — developer-style cursor effect
   Subtle VS Code-inspired easter egg: tiny syntax fragments, a small
   particle network near the cursor, and occasional micro electric sparks.
   Single fixed canvas, pointer-events:none, no libraries, no DOM churn.
   Disabled on touch devices and for prefers-reduced-motion. Fully idle-stopped. */
(function () {
  "use strict";
  var mm = window.matchMedia;
  if (!mm) return;
  if (mm("(hover: none)").matches || !mm("(hover: hover)").matches) return;
  if (mm("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  canvas.className = "wx-cursorfx";
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;" +
    "z-index:2147483000;display:block";
  canvas.dataset.state = "idle";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  /* VS Code syntax palette */
  var BLUE = [86, 156, 214];    /* #569CD6 keywords/idents   */
  var CYAN = [156, 220, 254];   /* #9CDCFE variables         */
  var PURPLE = [197, 134, 192]; /* #C586C0 operators         */
  var ORANGE = [206, 145, 120]; /* #CE9178 strings           */
  var GREEN = [106, 153, 85];   /* #6A9955 comments/numbers  */

  var FRAGMENTS = [
    { text: 'printf("Welcome to KUET_WasteX");', color: BLUE },
    { text: "</>", color: PURPLE },
    { text: "{}", color: BLUE },
    { text: "=>", color: PURPLE },
    { text: "01", color: CYAN },
    { text: "0x", color: ORANGE },
    { text: "processWaste()", color: CYAN },
    { text: "collectWaste()", color: BLUE },
    { text: "Hi Cutie", color: ORANGE }
  ];
  var SPARK_COLORS = [
    [156, 220, 254], /* cyan-white spark */
    [139, 92, 246]   /* violet spark */
  ];

  var MAX_FRAGS = 3;
  var MAX_PARTS = 16;
  var MAX_SPARKS = 2;
  var LINK_DIST = 48;
  var LINK_DIST_SQ = LINK_DIST * LINK_DIST;

  var frags = [], parts = [], sparks = [];
  var mx = -9999, my = -9999;
  var lastFrag = 0, lastPart = 0, lastSpark = 0;
  var running = false, rafId = 0, lastT = 0;
  var w = 0, h = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  window.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
    var now = performance.now();
    if (now - lastPart > 90 && parts.length < MAX_PARTS) { lastPart = now; spawnPart(); }
    if (now - lastFrag > 320 && frags.length < MAX_FRAGS) { lastFrag = now; spawnFrag(); }
    if (now - lastSpark > 1500 && Math.random() < 0.35 && sparks.length < MAX_SPARKS) { lastSpark = now; spawnSpark(); }
    if (!running && !document.hidden) start();
  }, { passive: true });

  function rand(min, max) { return min + Math.random() * (max - min); }

  function spawnPart() {
    var a = Math.random() * Math.PI * 2;
    var r = 8 + Math.random() * 34;
    var col = [BLUE, CYAN, PURPLE, ORANGE, GREEN][(Math.random() * 5) | 0];
    parts.push({
      x: mx + Math.cos(a) * r, y: my + Math.sin(a) * r,
      vx: Math.cos(a) * rand(4, 14), vy: Math.sin(a) * rand(4, 14) - 5,
      life: 0, max: rand(0.5, 0.9),
      size: rand(1.1, 2.2), color: col
    });
  }

  function spawnFrag() {
    var f = FRAGMENTS[(Math.random() * FRAGMENTS.length) | 0];
    frags.push({
      x: mx + rand(-46, 46), y: my + rand(-38, 30),
      vx: rand(-3, 3), vy: rand(-7, -2),
      life: 0, max: rand(5, 8),
      text: f.text, color: f.color
    });
  }

  function spawnSpark() {
    var s = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
    sparks.push({
      x: mx, y: my, life: 0, max: rand(0.1, 0.2),
      n: 4 + ((Math.random() * 3) | 0),
      phase: Math.random() * Math.PI * 2, color: s
    });
  }

  function start() {
    if (running) return;
    running = true;
    lastT = performance.now();
    canvas.dataset.state = "running";
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(rafId);
    running = false;
    if (!frags.length && !parts.length && !sparks.length) {
      ctx.clearRect(0, 0, w, h);
      canvas.dataset.state = "idle";
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (frags.length || parts.length || sparks.length) start();
  });

  function tick(t) {
    var dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;
    var i, o;

    for (i = frags.length - 1; i >= 0; i--) {
      o = frags[i];
      o.life += dt;
      if (o.life >= o.max) { frags.splice(i, 1); continue; }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
    }
    for (i = parts.length - 1; i >= 0; i--) {
      o = parts[i];
      o.life += dt;
      if (o.life >= o.max) { parts.splice(i, 1); continue; }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vy += 6 * dt;
      o.vx *= 0.985;
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      o = sparks[i];
      o.life += dt;
      if (o.life >= o.max) sparks.splice(i, 1);
    }

    if (!frags.length && !parts.length && !sparks.length) { stop(); return; }
    draw();
    rafId = requestAnimationFrame(tick);
  }

  function fadeInOut(o) {
    var t = o.life / o.max;
    return Math.min(1, t / 0.18) * (1 - t * t);
  }

  /* fragments: quick fade-in, long readable plateau, slow gentle removal */
  function fragAlpha(o) {
    var t = o.life / o.max;
    var inA = Math.min(1, t / 0.07);
    var out = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
    return inA * out;
  }

  function draw() {
    var i, j, p, q, dx, dy, d2, a;
    ctx.clearRect(0, 0, w, h);

    /* tiny network links */
    ctx.lineWidth = 0.5;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      for (j = i + 1; j < parts.length; j++) {
        q = parts[j];
        dx = p.x - q.x;
        dy = p.y - q.y;
        d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST_SQ) {
          a = (1 - d2 / LINK_DIST_SQ) * 0.12 * Math.min(p.life / p.max < 0.2 ? p.life / p.max / 0.2 : 1, q.life / q.max < 0.2 ? q.life / q.max / 0.2 : 1) * (1 - Math.max(p.life / p.max, q.life / q.max));
          if (a > 0.01) {
            ctx.strokeStyle = "rgba(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + "," + a.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    }

    /* particles */
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      a = fadeInOut(p) * 0.5;
      if (a < 0.02) continue;
      ctx.fillStyle = "rgba(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + "," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    /* occasional micro sparks (thin short spokes, no flash) */
    ctx.lineWidth = 0.7;
    for (i = 0; i < sparks.length; i++) {
      p = sparks[i];
      var k = p.life / p.max;
      a = (1 - k) * 0.5;
      if (a < 0.02) continue;
      var len = 3 + k * 5;
      for (j = 0; j < p.n; j++) {
        var ang = p.phase + (j / p.n) * Math.PI * 2;
        ctx.strokeStyle = "rgba(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(ang) * len * 0.5, p.y + Math.sin(ang) * len * 0.5);
        ctx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
        ctx.stroke();
      }
    }

    /* code fragments (small monospace, subtle) */
    ctx.font = '11px ui-monospace, Consolas, "Cascadia Code", Menlo, monospace';
    ctx.textBaseline = "middle";
    for (i = 0; i < frags.length; i++) {
      p = frags[i];
      a = fragAlpha(p) * 0.6;
      if (a < 0.02) continue;
      ctx.fillStyle = "rgba(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + "," + a.toFixed(3) + ")";
      ctx.fillText(p.text, p.x, p.y);
    }
  }
})();
