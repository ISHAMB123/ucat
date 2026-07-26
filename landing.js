(function () {
  var clips = ["/give/give1.mp4", "/give/give2.mp4", "/give/give3.mp4", "/give/give4.mp4"];
  var box = document.getElementById("vbox"), v = document.getElementById("vv");
  var opener = document.getElementById("doorOpen"), dots = document.getElementById("vdots");
  if (!box || !opener) return;
  var i = 0;
  dots.innerHTML = clips.map(function () { return "<i></i>"; }).join("");
  function load(play) {
    v.src = clips[i];
    var d = dots.children; for (var k = 0; k < d.length; k++) d[k].className = k === i ? "on" : "";
    if (play) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }
  function open(n) { i = n; box.classList.add("on"); box.setAttribute("aria-hidden", "false"); load(true); }
  function close() { box.classList.remove("on"); box.setAttribute("aria-hidden", "true"); v.pause(); v.removeAttribute("src"); v.load(); }
  function step(dir) { i = (i + dir + clips.length) % clips.length; load(true); }
  opener.addEventListener("click", function () { open(0); });
  document.getElementById("vx").addEventListener("click", close);
  document.getElementById("vprev").addEventListener("click", function () { step(-1); });
  document.getElementById("vnext").addEventListener("click", function () { step(1); });
  v.addEventListener("ended", function () { step(1); });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  document.addEventListener("keydown", function (e) {
    if (!box.classList.contains("on")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  });
})();


/* try-a-question demo (isolated so nothing else can stop it running) */
(function () {
  var demo = document.getElementById("demo");
  if (!demo) return;
  var Q = [
    {
      p: "When the Camborne pumping engine was restored in 1979, the volunteers expected the boiler to be the costliest part of the job. In the event the boiler needed only minor repairs, and it was the cracked flywheel, recast off-site to an old pattern, that swallowed most of the budget. The engine runs on open days now, though always at a reduced steam pressure.",
      s: "The volunteers expected the flywheel to be the most expensive part of the restoration.",
      a: "false",
      why: "The passage says they expected the boiler to cost the most; the flywheel is what actually did. When a statement swaps in something the passage named differently, it is contradicted by the text, so it is False rather than merely unsupported."
    },
    {
      p: "When the Camborne pumping engine was restored in 1979, the volunteers expected the boiler to be the costliest part of the job. In the event the boiler needed only minor repairs, and it was the cracked flywheel, recast off-site to an old pattern, that swallowed most of the budget. The engine runs on open days now, though always at a reduced steam pressure.",
      s: "The flywheel cracked because it had been cast to an old pattern.",
      a: "cant",
      why: "The passage tells you the flywheel was cracked and that it was recast to an old pattern, but it never links the two. Two facts sitting side by side do not make one the cause of the other, however neat the story sounds. That single trap is where most Verbal Reasoning marks are lost."
    }
  ];
  var passage = document.getElementById("dPassage"), stmt = document.getElementById("dStmt"),
      why = document.getElementById("dWhy"), verdict = document.getElementById("dVerdict"),
      whyText = document.getElementById("dWhyText"), prog = document.getElementById("dProg"),
      score = document.getElementById("dScore"), next = document.getElementById("dNext"),
      body = document.getElementById("dBody");
  var opts = Array.prototype.slice.call(demo.querySelectorAll(".opt"));
  var i = 0, correct = 0, answered = false;
  function render() {
    var q = Q[i];
    passage.textContent = q.p; stmt.textContent = q.s;
    prog.textContent = (i + 1) + " / " + Q.length;
    why.className = "why"; whyText.textContent = ""; verdict.textContent = ""; verdict.className = "verdict";
    score.textContent = "Pick True, False or Can't tell.";
    answered = false; next.style.display = "none";
    opts.forEach(function (b) { b.disabled = false; b.className = "opt"; });
  }
  function answer(b) {
    if (answered) return;
    answered = true;
    var q = Q[i], chosen = b.getAttribute("data-v"), ok = chosen === q.a;
    if (ok) correct++;
    opts.forEach(function (o) {
      o.disabled = true;
      if (o.getAttribute("data-v") === q.a) o.classList.add("correct");
      else if (o === b) o.classList.add("wrong");
    });
    verdict.textContent = ok ? "Correct" : "Not quite";
    verdict.className = "verdict " + (ok ? "ok" : "no");
    whyText.textContent = q.why;
    why.classList.add("show");
    score.textContent = "";
    next.textContent = i < Q.length - 1 ? "Next question" : "See the result";
    next.style.display = "";
  }
  function done() {
    var perfect = correct === Q.length;
    body.innerHTML = '<div class="d-done"><div class="big">' + correct + " / " + Q.length + "</div>" +
      "<p>" + (perfect
        ? "Spotless. That can’t-tell trap catches most people first time."
        : "Now you’ve felt the trap. Inside Tempo every wrong answer is explained like this, and comes back until it stops beating you.") +
      '</p><a class="btn btn-primary" href="/app/">Start free</a></div>';
  }
  function advance() { if (i < Q.length - 1) { i++; render(); } else done(); }
  opts.forEach(function (b) { b.addEventListener("click", function () { answer(b); }); });
  next.addEventListener("click", advance);
  render();
})();


/* launch-sale countdown (isolated) */
(function () {
  var el = document.getElementById("saleCount");
  if (!el) return;
  var end = new Date("2026-08-31T23:59:59+01:00").getTime();
  var t;
  function tick() {
    var diff = end - Date.now();
    if (diff <= 0) { el.innerHTML = "Launch sale has ended · now £39"; if (t) clearInterval(t); return; }
    var d = Math.floor(diff / 86400000),
        h = Math.floor(diff / 3600000) % 24,
        m = Math.floor(diff / 60000) % 60,
        s = Math.floor(diff / 1000) % 60;
    el.innerHTML = "<b>£25</b> until 31 August · <span class=\"cd\">" + d + "d " + h + "h " + m + "m " + s + "s</span> left";
  }
  tick();
  t = setInterval(tick, 1000);
})();
