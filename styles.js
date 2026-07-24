/* Global stylesheet for Tempo, injected once by the root component. */

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
.ud * { box-sizing: border-box; }
.ud {
  --ink:#0E1319; --slate:#18202B; --line:#2A3441; --paper:#EDEFF2; --paperline:#C6CDD7;
  --signal:#F5A524; --go:#3ECF8E; --stop:#F2555A; --mute:#8794A5;
  --body:#C0CAD6; --card:#EDEFF2;
  background:var(--ink); color:var(--paper); font-family:'Inter',system-ui,sans-serif;
  min-height:100vh; width:100%; -webkit-font-smoothing:antialiased;
}
.ud.light {
  --ink:#F1F3F6; --slate:#FFFFFF; --line:#D8DEE7; --paper:#16202B; --paperline:#C6CDD7;
  --signal:#D98E00; --go:#1E8E5A; --stop:#D64545; --mute:#5C6B7C;
  --body:#3F4E5F; --card:#FFFFFF;
}
.ud.light .ud-panel, .ud.light .ud-review, .ud.light .ud-opt, .ud.light .ud-syl { box-shadow:0 1px 3px #10182008; }
.ud.light .ud-modal { background:#16202BB8; }
.ud.light .vue-calc { box-shadow:0 6px 18px #10182022; }
@keyframes udfade { from { opacity:0 } to { opacity:1 } }
.ud-wrap { animation:udfade .3s ease; }
.ud-panel { animation:udrise .35s ease; }
.ud-card, .ud-lcard, .ud-sub, .ud-trend, .ud-mrow, .ud-week, .ud-tcard, .ud-config, .ud-nextup, .uni-form { animation:udrise .4s ease both; }
.ud-grid > *:nth-child(2), .ud-lgrid > *:nth-child(2), .ud-subs > *:nth-child(2), .ud-today > *:nth-child(2) { animation-delay:.05s; }
.ud-grid > *:nth-child(3), .ud-lgrid > *:nth-child(3), .ud-subs > *:nth-child(3), .ud-today > *:nth-child(3) { animation-delay:.1s; }
.ud-grid > *:nth-child(4), .ud-lgrid > *:nth-child(4), .ud-subs > *:nth-child(4), .ud-today > *:nth-child(4) { animation-delay:.15s; }
.ud-grid > *:nth-child(5), .ud-lgrid > *:nth-child(5), .ud-subs > *:nth-child(5) { animation-delay:.2s; }
.ud-grid > *:nth-child(6), .ud-lgrid > *:nth-child(6), .ud-subs > *:nth-child(6) { animation-delay:.25s; }
.ud-btn { transition:transform .15s, filter .15s; }
.ud-btn:hover { transform:translateY(-1px); }
.ud-nav button { transition:color .15s, background .15s; }
.ud-opt, .ud-lopt, .ud-day, .uni-morebtn, .gr-chip { transition:border-color .15s, color .15s, background .15s; }
.ud-theme { background:transparent; border:1px solid var(--line); color:var(--mute); border-radius:2px; width:32px; height:28px; display:flex; align-items:center; justify-content:center; }
.ud-theme:hover { color:var(--signal); border-color:var(--signal); }
.ud-theme svg { width:15px; height:15px; }
.ud button { font-family:inherit; cursor:pointer; border:none; }
.ud button:disabled { cursor:default; }
.ud button:focus-visible,.ud input:focus-visible,.ud textarea:focus-visible { outline:2px solid var(--signal); outline-offset:2px; }
.ud .mono { font-family:'JetBrains Mono',ui-monospace,monospace; font-variant-numeric:tabular-nums; }
.ud-wrap { max-width:960px; margin:0 auto; padding:0 20px; }
.ud-top { display:flex; align-items:center; justify-content:space-between; padding:16px 0; border-bottom:1px solid var(--line); gap:14px; flex-wrap:wrap; }
.ud-mark { display:flex; align-items:baseline; gap:9px; }
.ud-mark b { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:19px; letter-spacing:-0.02em; }
.ud-mark span { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--signal); letter-spacing:0.18em; text-transform:uppercase; }
.ud-nav { display:flex; gap:4px; flex-wrap:wrap; }
.ud-nav button { background:transparent; color:var(--mute); font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.09em; text-transform:uppercase; padding:7px 10px; border-radius:2px; position:relative; }
.ud-nav button.on { color:#131A22; background:var(--signal); }
.ud-nav button:hover:not(.on) { color:var(--paper); }
.ud-nav .dot { position:absolute; top:3px; right:3px; width:6px; height:6px; border-radius:50%; background:var(--stop); }
.ud-badge { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--mute); border:1px solid var(--line); padding:5px 9px; border-radius:2px; }
.ud-badge.on { color:var(--go); border-color:var(--go); }
.ud-hero { padding:52px 0 40px; border-bottom:1px solid var(--line); }
.ud-eyebrow { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:var(--signal); margin-bottom:18px; }
.ud-h1 { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:clamp(34px,7vw,62px); line-height:0.97; letter-spacing:-0.035em; margin:0 0 18px; max-width:16ch; }
.ud-h1 em { font-style:normal; color:var(--signal); }
.ud-lede { font-size:15.5px; line-height:1.6; color:var(--body); max-width:58ch; margin:0 0 26px; }
.ud-stats { display:flex; flex-wrap:wrap; gap:30px; }
.ud-stat b { font-family:'JetBrains Mono',monospace; font-size:23px; display:block; letter-spacing:-0.02em; }
.ud-stat span { font-size:10.5px; color:var(--mute); text-transform:uppercase; letter-spacing:0.1em; font-family:'JetBrains Mono',monospace; }
.ud-sec { padding:36px 0 6px; display:flex; align-items:baseline; gap:14px; }
.ud-sec h2 { font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:21px; margin:0; letter-spacing:-0.02em; }
.ud-sec i { flex:1; height:1px; background:var(--line); font-style:normal; }
.ud-sec span { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mute); }
.ud-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(255px,1fr)); gap:12px; padding-top:14px; }
.ud-card { background:var(--slate); border:1px solid var(--line); border-radius:3px; padding:17px; text-align:left; display:flex; flex-direction:column; gap:8px; transition:border-color .15s,transform .15s; width:100%; color:inherit; }
.ud-card:hover:not(:disabled) { border-color:var(--signal); transform:translateY(-2px); }
.ud-card.locked { opacity:0.5; }
.ud-card-top { display:flex; align-items:center; justify-content:space-between; }
.ud-tag { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.14em; color:var(--signal); }
.ud-card h3 { font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:16.5px; margin:0; letter-spacing:-0.015em; }
.ud-card p { font-size:12.5px; line-height:1.5; color:var(--mute); margin:0; }
.ud-best { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--go); }
.ud-lock { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mute); letter-spacing:0.1em; }
.ud-config { border:1px solid var(--line); border-radius:3px; background:var(--slate); padding:16px 18px; margin-top:18px; display:flex; flex-wrap:wrap; gap:22px; align-items:center; }
.ud-config .grp { display:flex; flex-direction:column; gap:7px; }
.ud-config label { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--mute); }
.ud-config .row { display:flex; gap:6px; align-items:center; }
.ud-config .row button { background:transparent; border:1px solid var(--line); color:var(--mute); font-size:12px; padding:7px 12px; border-radius:2px; font-family:'JetBrains Mono',monospace; }
.ud-config .row button.on { border-color:var(--signal); color:var(--signal); }
.ud-config input[type=range] { width:150px; accent-color:var(--signal); }
.ud-config .val { font-family:'JetBrains Mono',monospace; font-size:14px; color:var(--paper); min-width:26px; text-align:center; }
.ud-subs { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; padding-top:12px; }
.ud-sub { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:13px 14px; text-align:left; color:inherit; }
.ud-sub:hover { border-color:var(--signal); }
.ud-sub b { display:block; font-size:14px; font-family:'Bricolage Grotesque',sans-serif; margin-bottom:3px; }
.ud-sub span { font-size:11.5px; color:var(--mute); line-height:1.4; display:block; }
.ud-price { margin:40px 0 52px; border:1px solid var(--line); border-radius:3px; padding:24px; background:var(--slate); display:flex; flex-wrap:wrap; gap:20px; align-items:center; justify-content:space-between; }
.ud-price h3 { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:28px; margin:0 0 6px; letter-spacing:-0.03em; }
.ud-price p { margin:0; color:var(--mute); font-size:13px; max-width:46ch; line-height:1.55; }
.ud-btn { background:var(--signal); color:#0E1319; font-weight:600; font-size:14px; padding:12px 20px; border-radius:3px; }
.ud-btn:hover { filter:brightness(1.08); }
.ud-btn.ghost { background:transparent; color:var(--paper); border:1px solid var(--line); }
.ud-btn.ghost:hover { border-color:var(--signal); filter:none; }
.ud-code { display:flex; gap:8px; margin-top:12px; }
.ud-code input { background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:10px 12px; border-radius:3px; font-family:'JetBrains Mono',monospace; font-size:13px; width:150px; }
.ud-nextup { border:1px solid var(--signal); border-radius:3px; padding:20px; margin-top:20px; background:var(--slate); display:flex; justify-content:space-between; align-items:center; gap:18px; flex-wrap:wrap; }
.ud-nextup h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:21px; margin:6px 0 4px; letter-spacing:-0.02em; }
.ud-nextup p { margin:0; color:var(--mute); font-size:13px; }
.ud-week { border:1px solid var(--line); border-radius:3px; margin-top:12px; overflow:hidden; }
.ud-weekhead { padding:14px 17px; background:var(--slate); display:flex; gap:12px; align-items:center; width:100%; text-align:left; color:inherit; cursor:pointer; border:none; }
.ud-weekhead:hover { background:color-mix(in srgb, var(--signal) 8%, var(--slate)); }
.ud-weekhead b { font-family:'Bricolage Grotesque',sans-serif; font-size:15.5px; flex:1; }
.ud-weekhead .wk { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--signal); letter-spacing:0.14em; text-transform:uppercase; flex:none; }
.ud-weekhead .wk-meta { color:var(--mute); font-size:11px; flex:none; }
.ud-weekhead .wk-chev { color:var(--mute); font-size:12px; flex:none; }
.ud-week.open .ud-weekhead { border-bottom:1px solid var(--line); }
.ud-weekbody .wk-note { margin:0; padding:12px 17px 4px; font-size:12.5px; color:var(--mute); line-height:1.5; }
.ud-day { display:flex; align-items:center; gap:13px; padding:11px 17px; border-top:1px solid var(--line); width:100%; background:transparent; color:inherit; text-align:left; }
.ud-day:hover:not(:disabled) { background:var(--slate); }
.ud-day .n { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mute); width:38px; flex-shrink:0; }
.ud-day .nm { flex:1; font-size:13.5px; }
.ud-day .meta { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--mute); }
.ud-tick { width:16px; height:16px; border-radius:50%; border:1px solid var(--line); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:9px; color:#131A22; }
.ud-tick.done { background:var(--go); border-color:var(--go); }
.ud-trend { border:1px solid var(--line); border-radius:3px; padding:16px; margin-top:12px; background:var(--slate); }
.ud-trend header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
.ud-trend h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:15.5px; margin:0; }
.ud-trend .sum { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mute); }
.ud-spark { display:flex; align-items:flex-end; gap:4px; height:64px; }
.ud-spark div { flex:1; background:var(--signal); border-radius:1px 1px 0 0; min-height:2px; opacity:0.85; }
.ud-spark div.exam { background:var(--go); }
.ud-axis { display:flex; justify-content:space-between; font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mute); margin-top:6px; }
.ud-weak { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
.ud-weak b { font-family:'JetBrains Mono',monospace; font-size:11px; background:var(--ink); border:1px solid var(--stop); color:var(--stop); padding:4px 8px; border-radius:2px; font-weight:400; }
.ud-weak.strong b { border-color:var(--go); color:var(--go); }
.ana-wrap { display:grid; grid-template-columns:1.3fr 1fr; gap:12px; padding-top:14px; }
@media (max-width:720px) { .ana-wrap { grid-template-columns:1fr; } }
.ana-card { padding:16px 18px; }
.ana-h { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--mute); margin:0 0 12px; }
.ana-sub { font-size:12.5px; color:var(--body); margin:0; }
.ana-bars { display:flex; align-items:flex-end; gap:8px; height:130px; }
.ana-bar { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:4px; min-width:0; }
.ana-bar i { width:100%; max-width:34px; border-radius:3px 3px 0 0; background:var(--mute); transition:height .5s cubic-bezier(.2,.8,.3,1); }
.ana-bar i.good { background:var(--go); } .ana-bar i.mid { background:var(--signal); } .ana-bar i.low { background:var(--stop); }
.ana-bar .pct { font-size:10px; color:var(--mute); }
.ana-bar .lbl { font-size:9.5px; color:var(--mute); text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.ud-empty { color:var(--mute); font-size:14px; line-height:1.6; padding:24px 0; max-width:56ch; }
.ud-learn-intro { font-size:14.5px; line-height:1.65; color:var(--body); max-width:64ch; margin:14px 0 4px; }
.ud-lcard { border:1px solid var(--line); border-radius:3px; background:var(--slate); padding:16px 17px; display:flex; flex-direction:column; gap:8px; }
.ud-lcard h4 { font-family:'Bricolage Grotesque',sans-serif; font-size:15px; margin:0; }
.ud-lcard p { font-size:13px; line-height:1.6; color:var(--body); margin:0; flex:1; }
.ud-lcard button { align-self:flex-start; background:transparent; border:1px solid var(--line); color:var(--signal); font-family:'JetBrains Mono',monospace; font-size:11px; padding:6px 11px; border-radius:2px; letter-spacing:0.08em; }
.ud-lcard button:hover { border-color:var(--signal); }
.ud-lgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; padding-top:14px; }
.ud-run { min-height:100vh; display:flex; flex-direction:column; }
.ud-runbar { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--line); gap:13px; }
.ud-clock { font-family:'JetBrains Mono',monospace; font-size:25px; font-weight:700; color:var(--signal); letter-spacing:-0.02em; }
.ud-clock.warn { color:var(--stop); }
.ud-prog { flex:1; height:3px; background:var(--line); border-radius:2px; overflow:hidden; max-width:300px; }
.ud-prog i { display:block; height:100%; background:var(--signal); transition:width .2s; }
.ud-quit { background:transparent; color:var(--mute); font-size:12px; font-family:'JetBrains Mono',monospace; }
.ud-quit:hover { color:var(--stop); }
.ud-examflag { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--stop); border:1px solid var(--stop); padding:4px 7px; border-radius:2px; letter-spacing:0.1em; }
.ud-stage { flex:1; display:flex; align-items:flex-start; justify-content:center; padding:28px 20px 60px; position:relative; }
.q-goover { position:absolute; inset:0; z-index:6; display:flex; align-items:center; justify-content:center; padding:20px;
  backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px); background:var(--ink)55; }
.q-gocard { background:var(--slate); border:1px solid var(--signal); border-radius:6px; padding:22px 26px; text-align:center; box-shadow:0 14px 40px #0e131966; max-width:320px; }
.q-gocard p { font-size:13px; color:var(--body); line-height:1.55; margin:0 0 14px; }
.ud-panel { background:var(--card); color:#131A22; border-radius:4px; width:100%; max-width:660px; padding:26px; position:relative; overflow:hidden; }
.ud-panel h4 { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:#5A6675; margin:0 0 16px; }
.ud-q { font-family:'JetBrains Mono',monospace; font-size:clamp(26px,5.5vw,40px); font-weight:700; letter-spacing:-0.03em; margin:0 0 20px; }
.ud-qs { font-size:16.5px; font-weight:600; line-height:1.45; margin:0 0 16px; }
.ud-context { font-size:14px; line-height:1.6; color:#333D48; margin:0 0 13px; }
.ud-scenario { font-size:14px; line-height:1.65; color:#232C36; background:#E3E7EC; border-left:3px solid #8794A5; padding:11px 13px; border-radius:0 3px 3px 0; margin:0 0 15px; }
.ud-input { width:100%; background:#fff; border:1px solid var(--paperline); border-radius:3px; padding:13px; font-family:'JetBrains Mono',monospace; font-size:19px; color:#131A22; }
.ud-hint { font-size:12px; color:#5A6675; margin-top:11px; }
.ud-passage { font-size:14.5px; line-height:1.7; color:#232C36; }
.ud-opt { display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:#fff; border:1px solid var(--paperline); border-radius:3px; padding:12px 14px; margin-bottom:7px; font-size:14px; color:#131A22; }
.ud-opt b { font-family:'JetBrains Mono',monospace; font-size:11px; color:#5A6675; background:#EDEFF2; border-radius:2px; min-width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:500; }
.ud-opt:hover:not(:disabled) { border-color:#131A22; }
.ud-opt:hover:not(:disabled) b { background:#131A22; color:#fff; }
.ud-opt.picked { border-color:var(--signal); }
.ud-opt.picked b { background:var(--signal); color:#131A22; }
.ud-answer { display:flex; gap:8px; }
.ud-answer .ud-input { flex:1; }
.ud-submit { background:#131A22; color:#fff; border-radius:3px; padding:12px 20px; font-size:14px; font-weight:600; flex-shrink:0; }
.ud-submit:disabled { background:#B4BCC6; }
.ud-flash { font-family:'JetBrains Mono',monospace; font-size:clamp(30px,7vw,48px); font-weight:700; text-align:center; padding:56px 0; letter-spacing:-0.02em; }
.ud-check { display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-bottom:1px solid var(--paperline); font-size:13.5px; cursor:pointer; }
.ud-check input { margin-top:3px; }
.ud-budget { height:4px; background:var(--paperline); border-radius:2px; overflow:hidden; margin-bottom:18px; }
.ud-budget i { display:block; height:100%; background:#131A22; }
.ud-budget i.low { background:var(--stop); }
.ud-graph { display:flex; align-items:flex-end; gap:10px; height:120px; margin:26px 0 4px; padding:0 4px; }
.ud-graph .bar { flex:1; background:#43506028; border:1px solid #435060; border-bottom-width:3px; border-radius:2px 2px 0 0; position:relative; }
.ud-graph .bar span { position:absolute; top:-19px; left:0; right:0; text-align:center; font-family:'JetBrains Mono',monospace; font-size:11px; color:#333D48; }
.ud-graph-x { display:flex; gap:10px; padding:0 4px; margin-bottom:14px; }
.ud-graph-x span { flex:1; text-align:center; font-family:'JetBrains Mono',monospace; font-size:11px; color:#5A6675; }
@keyframes udshake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
@keyframes udpop { 0%{opacity:0; transform:translateY(6px) scale(.6)} 30%{opacity:1; transform:translateY(-8px) scale(1.1)} 100%{opacity:0; transform:translateY(-30px) scale(.9)} }
@keyframes udgoflash { 0%{opacity:0} 25%{opacity:.28} 100%{opacity:0} }
.ud-panel.correct { animation:udshake .45s ease; }
.ud-goflash { position:absolute; inset:0; background:var(--go); opacity:0; pointer-events:none; border-radius:4px; }
.ud-panel.correct .ud-goflash { animation:udgoflash .65s ease; }
.ud-stars { position:absolute; inset:0; pointer-events:none; }
.ud-stars s { position:absolute; font-size:20px; text-decoration:none; animation:udpop .7s ease forwards; }
.ud-review { border-top:3px solid var(--stop); background:#fff; border-radius:3px; padding:16px; margin-top:14px; }
.ud-review h5 { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.13em; text-transform:uppercase; margin:0 0 8px; color:#5A6675; }
.ud-review .verdict { font-size:15px; font-weight:600; margin:0 0 10px; color:#C0392B; }
.ud-review p { font-size:13.5px; line-height:1.6; margin:0 0 10px; color:#232C36; }
.ud-review .improve { background:#FDF3DC; border-left:3px solid var(--signal); padding:9px 12px; border-radius:0 3px 3px 0; }
.ud-res { padding:36px 0 70px; }
.ud-score { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:clamp(46px,10vw,88px); letter-spacing:-0.045em; line-height:1; margin:0; }
.ud-score small { font-size:0.34em; color:var(--mute); font-weight:500; }
.ud-band { display:inline-flex; align-items:baseline; gap:10px; border:1px solid var(--signal); border-radius:3px; padding:10px 16px; margin-top:18px; }
.ud-band b { font-family:'Bricolage Grotesque',sans-serif; font-size:26px; color:var(--signal); }
.ud-band span { font-size:12px; color:var(--mute); max-width:44ch; }
.ud-strip { margin:26px 0; }
.ud-row { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
.ud-row span { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mute); width:22px; flex-shrink:0; }
.ud-bar { height:14px; border-radius:2px; min-width:3px; }
.ud-row em { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mute); font-style:normal; }
.ud-tip { border-left:2px solid var(--signal); padding:2px 0 2px 15px; margin:22px 0 28px; color:var(--body); font-size:13.5px; line-height:1.65; max-width:64ch; }
.ud-foot { border-top:1px solid var(--line); padding:20px 0 40px; font-size:11px; color:var(--mute); font-family:'JetBrains Mono',monospace; line-height:1.7; }
.ud-mrow { display:flex; align-items:center; gap:12px; border:1px solid var(--line); border-radius:3px; background:var(--slate); padding:12px 15px; margin-top:8px; }
.ud-mrow .sec { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--signal); width:34px; flex-shrink:0; }
.ud-mrow .txt { flex:1; font-size:13px; color:var(--body); line-height:1.4; }
.ud-mrow .ct { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--stop); flex-shrink:0; }
.ud-lesson { max-width:700px; margin:22px auto 60px; background:var(--slate); border:1px solid var(--line); border-radius:4px; padding:26px; }
.ud-lesson .mod { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.15em; text-transform:uppercase; color:var(--signal); margin:0 0 6px; }
.ud-lesson h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:22px; margin:0 0 12px; letter-spacing:-0.02em; }
.ud-lesson .body { font-size:14.5px; line-height:1.7; color:var(--body); margin:0 0 16px; max-width:60ch; }
.ud-lesson .qtext { font-size:16.5px; font-weight:600; line-height:1.45; margin:0 0 14px; }
.ud-dots { display:flex; gap:5px; margin:0 0 18px; flex-wrap:wrap; }
.ud-dots i { width:8px; height:8px; border-radius:50%; background:var(--line); font-style:normal; }
.ud-dots i.done { background:var(--go); }
.ud-dots i.now { background:var(--signal); }
.ud-lopt { display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:12px 14px; margin-bottom:7px; font-size:14px; color:var(--paper); }
.ud-lopt b { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mute); border:1px solid var(--line); border-radius:2px; min-width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:500; }
.ud-lopt:hover:not(:disabled) { border-color:var(--signal); }
.ud-lopt.right { border-color:var(--go); color:var(--go); }
.ud-lopt.right b { border-color:var(--go); color:var(--go); }
.ud-lopt.wrong { border-color:var(--stop); color:var(--stop); }
.ud-lopt.wrong b { border-color:var(--stop); color:var(--stop); }
.ud-lfeed { border-left:3px solid var(--signal); padding:9px 13px; margin:12px 0 4px; font-size:13.5px; color:var(--body); line-height:1.65; background:var(--ink); border-radius:0 3px 3px 0; }
.ud-lnav { display:flex; gap:10px; margin-top:18px; align-items:center; justify-content:space-between; }
.ud-markbtn { background:none; border:none; padding:0; cursor:pointer; }
.ud-modal { position:fixed; inset:0; background:#0E1319D9; display:flex; align-items:center; justify-content:center; z-index:60; padding:20px; }
.ud-modal .box { background:var(--slate); border:1px solid var(--line); border-radius:4px; padding:22px; max-width:360px; width:100%; }
.ud-modal h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:19px; margin:0 0 8px; letter-spacing:-0.02em; }
.ud-modal p { font-size:13.5px; color:var(--mute); line-height:1.6; margin:0 0 18px; }
.ud-modal .row { display:flex; gap:10px; justify-content:flex-end; }
.vue-wrap { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; margin-top:16px; }
.vue-calc { width:238px; background:#3A6EA5; border:2px solid #24476B; border-radius:6px; padding:8px; position:relative; box-shadow:0 6px 18px #00000055; }
.vue-title { display:flex; align-items:center; justify-content:space-between; color:#fff; font-size:12px; font-weight:600; padding:2px 4px 8px; }
.vue-title .win { display:flex; gap:6px; align-items:center; }
.vue-x { background:#C75050; color:#fff; border-radius:2px; width:18px; height:16px; font-size:9px; line-height:16px; text-align:center; }
.vue-eye { background:#24476B; border:1px solid #16334F; color:#fff; border-radius:2px; width:24px; height:16px; display:flex; align-items:center; justify-content:center; padding:0; cursor:pointer; }
.vue-eye svg { width:13px; height:13px; }
.vue-eye:hover { background:#2D5688; }
.vue-disp { background:#F4F8FB; border:2px solid #24476B; border-radius:2px; padding:6px 8px; display:flex; align-items:center; font-size:20px; color:#10233A; margin-bottom:8px; min-height:38px; }
.vue-disp .mflag { font-size:11px; margin-right:auto; width:14px; font-family:'JetBrains Mono',monospace; }
.vue-disp .num { margin-left:auto; overflow:hidden; }
.vue-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
.vue-key { background:#E8EDF3; border:1px solid #9DB2C8; border-bottom-width:3px; border-radius:3px; padding:9px 0; font-family:'JetBrains Mono',monospace; font-size:12.5px; color:#10233A; }
.vue-key:active { transform:translateY(1px); border-bottom-width:2px; }
.vue-key.memk { background:#CFE0F0; font-size:11px; }
.vue-key.eq { grid-column:span 2; background:#2F71B8; color:#fff; border-color:#1E4E82; }
.vue-banner { position:absolute; top:-42px; right:-8px; background:var(--signal); color:#0E1319; font-size:11px; font-weight:600; padding:7px 10px; border-radius:3px; white-space:nowrap; z-index:5; box-shadow:0 4px 10px #00000066; }
.vue-banner:after { content:""; position:absolute; bottom:-6px; right:14px; border:6px solid transparent; border-top-color:var(--signal); border-bottom:0; }
.vue-panel { min-width:220px; max-width:300px; flex:1; background:var(--slate); border:1px solid var(--line); border-radius:3px; padding:13px 15px; }
.vue-panel h5 { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.13em; text-transform:uppercase; color:var(--signal); margin:0 0 10px; }
.vue-row { display:flex; gap:10px; font-size:12.5px; color:var(--body); padding:5px 0; border-bottom:1px solid var(--line); align-items:baseline; }
.vue-row:last-child { border-bottom:0; }
.vue-row b { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--paper); background:var(--ink); border:1px solid var(--line); padding:2px 6px; border-radius:2px; min-width:56px; text-align:center; font-weight:500; flex-shrink:0; }
.ud-ev { background:#F5A52466; padding:0 2px; border-radius:2px; box-shadow:0 0 0 1px #F5A52488; }
.ud-today { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin-top:22px; }
.ud-tcard { background:var(--slate); border:1px solid var(--line); border-radius:3px; padding:14px 15px; text-align:left; color:inherit; display:flex; flex-direction:column; gap:4px; transition:border-color .15s, transform .15s; }
.ud-tcard:hover:not(:disabled) { border-color:var(--signal); transform:translateY(-2px); }
.ud-tcard:disabled { opacity:0.55; }
.ud-tcard .k { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.15em; text-transform:uppercase; color:var(--signal); }
.ud-tcard b { font-family:'Bricolage Grotesque',sans-serif; font-size:16px; letter-spacing:-0.015em; }
.ud-tcard .d { font-size:11.5px; color:var(--mute); line-height:1.4; }
.ud-chip { font-size:10px; color:#131A22; background:var(--signal); border-radius:2px; padding:2px 6px; letter-spacing:0.08em; }
.ud-syl { display:flex; align-items:center; gap:12px; background:#fff; border:1px solid var(--paperline); border-radius:3px; padding:10px 13px; margin-bottom:7px; }
.ud-syl .txt { flex:1; font-size:13.5px; color:#131A22; line-height:1.45; }
.ud-syl .yn { display:flex; gap:5px; flex-shrink:0; }
.ud-syl .yn button { border:1px solid var(--paperline); background:#F4F6F9; color:#131A22; font-family:'JetBrains Mono',monospace; font-size:11.5px; padding:6px 12px; border-radius:2px; }
.ud-syl .yn button.on { background:#1E8E5A; border-color:#1E8E5A; color:#fff; }
.ud-syl .yn button.on.no { background:#C0392B; border-color:#C0392B; }
@keyframes udrise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
/* Respect users who ask for less motion: drop animations and smooth-scroll. */
@media (prefers-reduced-motion: reduce) {
  .ud *, .ud *::before, .ud *::after { animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; scroll-behavior:auto !important; }
}
.ud-gate { position:fixed; inset:0; z-index:80; background:radial-gradient(1200px 600px at 70% -10%, #24304055, transparent), var(--ink); display:flex; align-items:center; justify-content:center; padding:22px; }
.ud-gate-in { max-width:640px; width:100%; text-align:center; animation:udrise .5s ease; }
.ud-gate h2 { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(26px,5vw,38px); letter-spacing:-0.03em; margin:10px 0 8px; }
.ud-gate p { color:var(--mute); font-size:14px; margin:0 0 24px; }
.ud-trackrow { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
.ud-track { background:var(--slate); border:1px solid var(--line); border-radius:5px; padding:26px 20px; color:inherit; display:flex; flex-direction:column; align-items:center; gap:10px; transition:transform .18s, border-color .18s; }
.ud-track:hover { transform:translateY(-4px); border-color:var(--signal); }
.ud-track svg { width:46px; height:46px; color:var(--signal); }
.ud-track b { font-family:'Bricolage Grotesque',sans-serif; font-size:20px; letter-spacing:-0.02em; }
.ud-track span { font-size:12px; color:var(--mute); line-height:1.5; max-width:26ch; }
.ud-opt.sel { border-color:var(--signal); background:var(--signal)18; }
.ud-quit.on { color:var(--signal); border-color:var(--signal); }
.ud-mockfoot { display:flex; gap:8px; align-items:center; padding:12px 20px; border-top:1px solid var(--line); background:var(--slate); flex-wrap:wrap; }
.mock-navbtn { background:transparent; border:1px solid var(--line); color:var(--body); font-family:'JetBrains Mono',monospace; font-size:12px; padding:8px 14px; border-radius:3px; }
.mock-navbtn:hover:not(:disabled) { border-color:var(--signal); color:var(--paper); }
.mock-navbtn:disabled { opacity:.4; }
.mock-navbtn.main { background:var(--signal); color:#131A22; border-color:var(--signal); font-weight:700; }
.nav-dialog { max-width:560px; width:100%; background:var(--slate); border:1px solid var(--line); border-radius:6px; overflow:hidden; animation:udrise .3s ease; }
.nav-head { padding:14px 18px; border-bottom:1px solid var(--line); display:flex; align-items:baseline; gap:10px; }
.nav-head b { font-family:'Bricolage Grotesque',sans-serif; font-size:16px; }
.nav-head span { font-size:11.5px; color:var(--mute); }
.nav-grid { max-height:52vh; overflow-y:auto; }
.nav-row { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:8px; width:100%; text-align:left; padding:10px 18px; background:transparent; border:none; border-bottom:1px solid var(--line); color:var(--body); font-size:13px; }
.nav-row.nav-hd { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mute); position:sticky; top:0; background:var(--slate); }
button.nav-row:hover { background:var(--signal)14; }
.nav-row.cur { background:var(--signal)22; }
.nav-row .ok { color:var(--go); } .nav-row .no { color:var(--stop); } .nav-row .flag { color:var(--signal); }
.nav-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 18px; border-top:1px solid var(--line); font-size:12px; color:var(--mute); }
.ud-reviewgrid { display:flex; flex-wrap:wrap; gap:6px; padding-top:14px; }
.ud-reviewgrid .rv { position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:3px; font-family:'JetBrains Mono',monospace; font-size:12px; text-decoration:none; border:1px solid var(--line); }
.ud-reviewgrid .rv.ok { background:var(--go)22; color:var(--go); border-color:var(--go); }
.ud-reviewgrid .rv.no { background:var(--stop)22; color:var(--stop); border-color:var(--stop); }
.ud-reviewgrid .rv.skip { background:var(--ink); color:var(--mute); }
.ud-reviewgrid .rv .fl { position:absolute; top:-6px; right:-4px; font-size:9px; color:var(--signal); font-style:normal; }
.ud-charttoggle { display:inline-flex; gap:2px; border:1px solid var(--line); border-radius:3px; overflow:hidden; }
.ud-charttoggle button { background:transparent; color:var(--mute); font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; padding:4px 9px; }
.ud-charttoggle button.on { background:var(--signal); color:#131A22; }
.ud-mode { display:flex; gap:6px; align-items:center; }
.ud-mode span { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--mute); margin-right:6px; }
.ud-mode button { background:transparent; border:1px solid var(--line); color:var(--mute); font-size:12px; padding:7px 12px; border-radius:2px; font-family:'JetBrains Mono',monospace; }
.ud-mode button.on { border-color:var(--signal); color:var(--signal); }
.iv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; padding-top:14px; }
.iv-card { background:var(--slate); border:1px solid var(--line); border-radius:3px; padding:16px 17px; animation:udrise .4s ease both; }
.iv-card h4 { font-family:'Bricolage Grotesque',sans-serif; font-size:15.5px; margin:0 0 6px; }
.iv-card .what { font-size:12.5px; color:var(--mute); line-height:1.55; margin:0 0 10px; }
.iv-q { border-top:1px solid var(--line); }
.iv-q button.q { width:100%; text-align:left; background:transparent; color:var(--paper); font-size:13.5px; padding:10px 2px; display:flex; justify-content:space-between; gap:10px; line-height:1.45; }
.iv-q button.q:hover { color:var(--signal); }
.iv-q .chev { color:var(--mute); transition:transform .25s; flex-shrink:0; }
.iv-q.open .chev { transform:rotate(90deg); color:var(--signal); }
.iv-a { max-height:0; overflow:hidden; transition:max-height .35s ease; }
.iv-q.open .iv-a { max-height:400px; }
.iv-a p { font-size:13px; color:var(--body); line-height:1.65; margin:0 0 10px; padding:0 2px; }
.iv-practice { border:1px solid var(--signal); border-radius:4px; background:var(--slate); padding:22px; margin-top:18px; animation:udrise .4s ease; }
.iv-practice .qbig { font-family:'Bricolage Grotesque',sans-serif; font-size:clamp(19px,3.5vw,26px); line-height:1.3; letter-spacing:-0.02em; margin:8px 0 16px; }
.iv-clock { font-family:'JetBrains Mono',monospace; font-size:34px; font-weight:700; color:var(--signal); }
.iv-clock.answer { color:var(--go); }
@keyframes ivpulse { 0%,100% { opacity:1 } 50% { opacity:.45 } }
.iv-phase { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.15em; text-transform:uppercase; color:var(--mute); animation:ivpulse 2s infinite; }
.uni-form { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; border:1px solid var(--line); border-radius:3px; background:var(--slate); padding:18px; margin-top:16px; }
.uni-form label { display:flex; flex-direction:column; gap:6px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mute); }
.uni-form input, .uni-form select { background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:10px; border-radius:3px; font-size:14px; font-family:'Inter',sans-serif; }
.uni-row { border:1px solid var(--line); border-radius:3px; background:var(--slate); padding:15px 17px; margin-top:10px; animation:udrise .35s ease both; }
.uni-row header { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
.uni-row h4 { font-family:'Bricolage Grotesque',sans-serif; font-size:16px; margin:0; flex:1; }
.uni-chip { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; padding:4px 8px; border-radius:2px; border:1px solid; }
.uni-chip.strong { color:var(--go); border-color:var(--go); }
.uni-chip.range { color:var(--signal); border-color:var(--signal); }
.uni-chip.aspire { color:#7FB3F0; border-color:#7FB3F0; }
.uni-chip.out { color:var(--mute); border-color:var(--line); }
.uni-chip.block { color:var(--stop); border-color:var(--stop); }
.uni-row .why { font-size:12.5px; color:var(--body); line-height:1.6; margin:8px 0 0; }
.uni-pi { display:flex; align-items:center; gap:8px; margin-top:9px; }
.uni-pi i { height:6px; border-radius:3px; background:var(--signal); display:block; }
.uni-pi span { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--mute); }
.gr-wrap { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.gr-chip { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; width:32px; height:32px; border-radius:3px; border:1px solid var(--line); background:var(--ink); color:var(--paper); }
.gr-chip:hover { border-color:var(--stop); color:var(--stop); }
.gr-chip.g9 { color:var(--go); border-color:var(--go); }
.gr-chip.g8 { color:var(--signal); border-color:var(--signal); }
.gr-add { display:flex; gap:4px; margin-left:8px; }
.gr-add button { font-family:'JetBrains Mono',monospace; font-size:11px; background:transparent; border:1px dashed var(--line); color:var(--mute); border-radius:3px; padding:6px 8px; }
.gr-add button:hover { color:var(--signal); border-color:var(--signal); }
.uni-mono { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:13px; width:34px; height:34px; border-radius:50%; border:1.5px solid; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.uni-morebtn { margin-top:10px; background:transparent; border:1px solid var(--line); color:var(--signal); font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.1em; padding:7px 12px; border-radius:2px; }
.uni-morebtn:hover { border-color:var(--signal); }
.uni-more { border-top:1px solid var(--line); margin-top:12px; padding-top:12px; animation:udrise .3s ease; }
.uni-more p { font-size:13px; color:var(--body); line-height:1.65; margin:0 0 10px; }
.uni-more b { color:var(--paper); }
.uni-budget { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:13px 15px; margin-top:4px; }
.uni-budget .bh { font-size:12px; color:var(--mute); margin:0 0 10px; }
.uni-budget .brow { display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:10px; }
.uni-budget label { display:flex; flex-direction:column; gap:5px; font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mute); }
.uni-budget input { background:var(--slate); border:1px solid var(--line); color:var(--paper); padding:8px; border-radius:3px; font-size:13px; width:100%; }
.uni-budget .bt { font-size:13px; color:var(--body); margin:12px 0 0; }
.wp-scaffold { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; margin:0 0 14px; }
.wp-scaffold div { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:9px 11px; }
.wp-scaffold b { display:block; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; color:var(--signal); margin-bottom:3px; }
.wp-scaffold span { font-size:11.5px; color:var(--mute); line-height:1.45; }
.wp-box { min-height:150px; font-size:14px; line-height:1.6; font-family:'Inter',sans-serif; background:var(--ink); color:var(--paper); border-color:var(--line); }
.wp-result { border-top:1px solid var(--line); margin-top:16px; padding-top:14px; animation:udrise .3s ease; }
.wp-result .band { display:flex; align-items:baseline; gap:12px; margin:0 0 12px; }
.wp-result .band b { font-family:'Bricolage Grotesque',sans-serif; font-size:24px; letter-spacing:-0.02em; }
.wp-result .band b.excellent { color:var(--go); } .wp-result .band b.strong { color:#7FE0B0; }
.wp-result .band b.medium { color:var(--signal); } .wp-result .band b.weak { color:var(--stop); }
.wp-result .band span { color:var(--mute); font-size:11px; }
.wp-crit { display:flex; gap:10px; padding:8px 0; border-bottom:1px solid var(--line); }
.wp-crit .dot { width:10px; height:10px; border-radius:50%; margin-top:5px; flex-shrink:0; }
.wp-crit .dot.s2 { background:var(--go); } .wp-crit .dot.s1 { background:var(--signal); } .wp-crit .dot.s0 { background:var(--stop); }
.wp-crit b { font-size:12.5px; } .wp-crit p { font-size:12.5px; color:var(--body); line-height:1.55; margin:3px 0 0; }
.wp-note { font-size:11.5px; color:var(--mute); line-height:1.6; margin:12px 0 0; }
.wp-reveal { position:relative; border-top:1px solid var(--line); margin-top:16px; padding-top:16px; animation:udrise .45s ease both; }
.wp-close { position:absolute; top:10px; right:0; width:30px; height:30px; border:1px solid var(--line); border-radius:3px; background:var(--slate); color:var(--mute); font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; }
.wp-close:hover { color:var(--stop); border-color:var(--stop); }
.wp-revealgrid { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
@media (max-width:720px) { .wp-revealgrid { grid-template-columns:1fr; } }
.wp-revealright { background:var(--slate); border:1px solid var(--line); border-radius:4px; padding:16px; animation:udrise .5s ease .1s both; }
.wp-score10 { display:flex; align-items:baseline; gap:12px; margin:0 0 12px; }
.wp-score10 b { font-family:'Bricolage Grotesque',sans-serif; font-size:40px; letter-spacing:-0.03em; }
.wp-score10 b em { font-style:normal; font-size:20px; color:var(--mute); }
.wp-score10 b.excellent { color:var(--go); } .wp-score10 b.strong { color:#7FE0B0; }
.wp-score10 b.medium { color:var(--signal); } .wp-score10 b.weak { color:var(--stop); }
.wp-score10 span { color:var(--mute); font-size:12px; text-transform:uppercase; letter-spacing:0.1em; }
.wp-range { display:flex; gap:10px; margin-bottom:12px; }
.wp-range > div { flex:1; border:1px solid var(--line); border-radius:3px; padding:8px 10px; text-align:center; }
.wp-range span { display:block; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--mute); margin-bottom:3px; }
.wp-range b { font-size:17px; }
.wp-casetext { font-size:12.5px; color:var(--body); line-height:1.55; margin:0 0 8px; }
.wp-casetext b { color:var(--paper); }
.wp-samples { border-top:1px solid var(--line); margin-top:16px; padding-top:14px; animation:udrise .3s ease; }
.wp-samples > div { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:12px 14px; margin-bottom:10px; }
.wp-samples p { font-size:13px; color:var(--body); line-height:1.65; margin:6px 0 0; }
.cd-strip { display:flex; align-items:center; gap:18px; border:1px solid var(--line); border-left:3px solid var(--signal); border-radius:3px; background:var(--slate); padding:15px 18px; margin-top:20px; flex-wrap:wrap; animation:udrise .4s ease both; }
.cd-strip.urgent { border-left-color:var(--stop); } .cd-strip.close { border-left-color:var(--signal); }
.cd-strip.far { border-left-color:var(--go); } .cd-strip.past { border-left-color:var(--mute); }
.cd-strip p { flex:1; margin:0; font-size:13px; color:var(--body); line-height:1.55; min-width:220px; }
.cd-num { display:flex; flex-direction:column; align-items:flex-start; }
.cd-num b { font-family:'JetBrains Mono',monospace; font-size:34px; line-height:1; letter-spacing:-0.03em; }
.cd-num span { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--mute); margin-top:4px; }
.cd-strip.set > div:first-child { display:flex; flex-direction:column; gap:3px; flex:1; }
.cd-strip .k { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); }
.cd-strip.set b { font-family:'Bricolage Grotesque',sans-serif; font-size:17px; letter-spacing:-0.02em; }
.cd-strip .d { font-size:12px; color:var(--mute); }
.cd-in { display:flex; gap:8px; align-items:center; }
.cd-in input { background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:9px 11px; border-radius:3px; font-size:13px; font-family:'JetBrains Mono',monospace; }
.vr-diag { border:1px solid var(--line); border-left:3px solid var(--signal); border-radius:3px; background:var(--slate); padding:18px 20px; margin:22px 0; animation:udrise .4s ease both; }
.vr-diag.time { border-left-color:var(--signal); } .vr-diag.acc { border-left-color:var(--stop); }
.vr-diag.both { border-left-color:var(--stop); } .vr-diag.good { border-left-color:var(--go); }
.vr-diag .k { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); }
.vr-diag h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:19px; margin:6px 0 8px; letter-spacing:-0.02em; }
.vr-diag p { font-size:13.5px; color:var(--body); line-height:1.65; margin:0 0 10px; }
.vr-diag ul { margin:0 0 14px; padding-left:18px; }
.vr-diag li { font-size:13px; color:var(--body); line-height:1.6; margin-bottom:6px; }
.iv-warn { display:flex; gap:12px; align-items:flex-start; border:1px solid var(--signal); background:#F5A5241a; border-radius:3px; padding:13px 15px; margin-top:16px; animation:udrise .4s ease both; }
.iv-warn .ic { font-family:'JetBrains Mono',monospace; font-weight:700; color:#131A22; background:var(--signal); width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; }
.iv-warn p { margin:0; font-size:12.5px; line-height:1.6; color:var(--body); flex:1; }
.iv-warn b { color:var(--signal); }
.iv-warn button { background:transparent; color:var(--mute); font-size:14px; padding:0 4px; flex-shrink:0; }
.iv-warn button:hover { color:var(--signal); }
.iv-unipick { border:1px solid var(--line); border-radius:3px; background:var(--slate); padding:16px 18px; margin-top:16px; animation:udrise .4s ease both; }
.iv-unipick label { display:flex; flex-direction:column; gap:7px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mute); }
.iv-unipick select { background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:10px; border-radius:3px; font-size:14px; font-family:'Inter',sans-serif; max-width:420px; }
.iv-unibox { border-top:1px solid var(--line); margin-top:14px; padding-top:13px; animation:udrise .3s ease; }
.iv-unibox .fmt { font-size:12.5px; color:var(--body); line-height:1.6; margin:0 0 9px; }
.iv-unibox .fmt b { color:var(--paper); }
.iv-unibox .chips { display:flex; flex-wrap:wrap; gap:6px; }
.iv-unibox .chips span { font-family:'JetBrains Mono',monospace; font-size:10.5px; border:1px solid var(--signal); color:var(--signal); padding:4px 8px; border-radius:2px; }
.iv-uniq { display:flex; gap:10px; align-items:baseline; border-top:1px solid var(--line); padding:9px 0; font-size:13px; color:var(--body); line-height:1.5; }
.iv-uniq span { flex:1; }
.wp-tools { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.wp-mic { display:flex; align-items:center; gap:8px; background:transparent; border:1px solid var(--line); color:var(--body); font-size:12.5px; padding:9px 13px; border-radius:3px; transition:border-color .15s, color .15s; }
.wp-mic:hover:not(:disabled) { border-color:var(--signal); color:var(--signal); }
.wp-mic:disabled { opacity:.5; }
.wp-mic svg { width:15px; height:15px; }
.wp-mic.on { border-color:var(--stop); color:var(--stop); }
@keyframes wplive { 0%,100% { opacity:1 } 50% { opacity:.3 } }
.wp-live { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--stop); animation:wplive 1.2s infinite; }
.wp-head { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
.wp-src { display:flex; flex-direction:column; gap:7px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mute); flex:1; min-width:220px; }
.wp-src select { background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:10px; border-radius:3px; font-size:14px; font-family:'Inter',sans-serif; max-width:420px; }
.wp-count { font-size:11px; color:var(--mute); }
.auth-card { max-width:420px; width:100%; background:var(--slate); border:1px solid var(--line); border-radius:5px; padding:28px; animation:udrise .45s ease; }
.auth-card h2 { font-family:'Bricolage Grotesque',sans-serif; font-size:26px; letter-spacing:-0.03em; margin:8px 0 6px; text-align:center; }
.auth-card .sub { color:var(--mute); font-size:13px; line-height:1.55; margin:0 0 20px; text-align:center; }
.auth-f { display:flex; flex-direction:column; gap:6px; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:var(--mute); margin-bottom:14px; }
.auth-f input { background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:12px; border-radius:3px; font-size:14px; font-family:'Inter',sans-serif; width:100%; }
.auth-f input:focus { border-color:var(--signal); outline:none; }
.pwwrap { position:relative; display:block; }
.pweye { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:transparent; color:var(--mute); font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; padding:4px 6px; }
.pweye:hover { color:var(--signal); }
.pwbar { display:flex; align-items:center; gap:10px; margin:-6px 0 14px; }
.pwbar i { height:4px; border-radius:2px; background:var(--stop); transition:width .25s, background .25s; display:block; min-width:8px; }
.pwbar i.s3 { background:var(--signal); } .pwbar i.s4 { background:var(--go); }
.pwbar span { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--mute); }
.ud-btn.full { width:100%; text-align:center; }
.auth-err { color:var(--stop); font-size:12.5px; margin:0 0 12px; }
.auth-sent { background:var(--ink); border:1px solid var(--go); border-radius:3px; padding:13px 15px; font-size:13px; color:var(--body); line-height:1.6; margin-bottom:14px; }
.auth-alt { display:flex; flex-direction:column; gap:8px; align-items:center; margin-top:14px; }
.auth-alt button { background:transparent; color:var(--mute); font-size:12.5px; }
.auth-alt button:hover { color:var(--signal); }
.auth-foot { border-top:1px solid var(--line); margin-top:20px; padding-top:14px; text-align:center; }
.auth-foot p { font-size:11px; color:var(--mute); line-height:1.55; margin:8px 0 0; }
.bill-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; padding-top:16px; }
.bill-card { background:var(--slate); border:1px solid var(--line); border-radius:4px; padding:22px; display:flex; flex-direction:column; animation:udrise .4s ease both; }
.bill-card.feature { border-color:var(--signal); }
.bill-card .tag { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--mute); }
.bill-card .tag.on { color:var(--signal); }
.bill-card .price { margin:10px 0 2px; display:flex; align-items:baseline; gap:8px; }
.bill-card .price b { font-family:'Bricolage Grotesque',sans-serif; font-size:42px; letter-spacing:-0.04em; }
.bill-card .price em { font-style:normal; color:var(--mute); font-size:13px; }
.bill-card .sub { color:var(--mute); font-size:12.5px; margin:0 0 16px; }
.bill-card ul { list-style:none; padding:0; margin:0 0 18px; flex:1; }
.bill-card li { font-size:13px; color:var(--body); line-height:1.5; padding:7px 0 7px 22px; position:relative; border-bottom:1px solid var(--line); }
.bill-card li:before { content:"✓"; position:absolute; left:0; color:var(--go); font-size:12px; }
.bill-code { display:flex; gap:8px; margin-top:12px; }
.bill-code input { flex:1; background:var(--ink); border:1px solid var(--line); color:var(--paper); padding:10px; border-radius:3px; font-family:'JetBrains Mono',monospace; font-size:13px; min-width:0; }
.bill-live { display:flex; gap:14px; align-items:flex-start; border:1px solid var(--go); border-radius:4px; background:var(--slate); padding:20px; margin-top:16px; animation:udrise .4s ease; }
.bill-live .tick { width:30px; height:30px; border-radius:50%; background:var(--go); color:#0E1319; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
.bill-live h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:19px; margin:2px 0 6px; }
.bill-live p { font-size:13px; color:var(--body); line-height:1.6; margin:0; }
.bill-faq { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; margin-top:26px; }
.bill-faq div { background:var(--slate); border:1px solid var(--line); border-radius:3px; padding:15px 17px; animation:udrise .4s ease both; }
.bill-faq b { font-size:13.5px; display:block; margin-bottom:6px; }
.bill-faq p { font-size:12.5px; color:var(--body); line-height:1.6; margin:0; }
.vx { min-height:100vh; background:#fff; color:#111; display:flex; flex-direction:column; font-family:Arial,Helvetica,sans-serif; }
.vx-top { background:#1F5FA9; color:#fff; padding:7px 12px; display:flex; align-items:center; justify-content:space-between; font-size:15px; }
.vx-top .cnt { font-size:12px; }
.vx-bar { background:#4C8DD1; color:#fff; padding:5px 12px; display:flex; align-items:center; gap:16px; font-size:12.5px; }
.vx-bar .vx-spacer { flex:1; }
.vx-tool { background:transparent; color:#fff; font-size:12.5px; display:flex; align-items:center; gap:5px; padding:3px 4px; text-decoration:underline; }
.vx-tool:disabled { opacity:.55; text-decoration:none; }
.vx-tool.on { background:#F5A524; color:#111; border-radius:2px; text-decoration:none; }
.vx-tool .ic { text-decoration:none; }
.vx-scheme { background:#1F5FA9; padding:4px 10px; font-size:12px; }
.vx-body { flex:1; display:flex; align-items:stretch; position:relative; }
.vx-left { flex:1; padding:16px 18px; border-right:3px solid #1F5FA9; min-width:0; }
.vx-right { width:46%; padding:16px 18px; min-width:0; }
.vx-left .stem { font-size:13.5px; line-height:1.5; color:#111; margin:0 0 12px; }
.vx-left .ask { font-size:13.5px; line-height:1.5; margin:14px 0 0; }
.vx-left .ask b { font-weight:700; }
.vx-svg { width:100%; max-width:330px; margin:10px 0; }
.vx-calcwrap { margin-top:14px; }
.opt-stem { font-size:13.5px; line-height:1.5; margin:0 0 16px; color:#111; }
.vx-opt { display:flex; align-items:flex-start; gap:9px; padding:7px 6px; font-size:13.5px; cursor:pointer; border-radius:2px; line-height:1.45; }
.vx-opt:hover { background:#EEF4FB; }
.vx-opt.sel { background:#DDE9F6; }
.vx-opt.right { background:#DFF3E6; }
.vx-opt input { margin-top:3px; }
.vx-opt b { font-weight:400; min-width:18px; }
.vx-syl { display:flex; gap:10px; align-items:center; border-bottom:1px solid #DDD; padding:9px 0; font-size:13px; }
.vx-syl span:first-child { flex:1; }
.vx-syl .yn { display:flex; gap:5px; }
.vx-syl .yn button { border:1px solid #9DB2C8; background:#F4F6F9; color:#111; font-size:11.5px; padding:5px 11px; border-radius:2px; }
.vx-syl .yn button.on { background:#1E8E5A; border-color:#1E8E5A; color:#fff; }
.vx-syl .yn button.on.no { background:#C0392B; border-color:#C0392B; }
.vx-why { border-top:2px solid #1F5FA9; margin-top:18px; padding-top:12px; }
.vx-why h5 { font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#1F5FA9; margin:0 0 8px; }
.vx-why p { font-size:12.5px; line-height:1.55; color:#222; margin:0 0 9px; }
.vx-why .imp { background:#FDF3DC; border-left:3px solid #F5A524; padding:8px 11px; }
.vx-foot { background:#1F5FA9; color:#fff; padding:7px 12px; display:flex; align-items:center; gap:12px; }
.vx-foot .vx-spacer { flex:1; }
.vx-nav { background:#4C8DD1; color:#fff; border:1px solid #7FB0DD; font-size:12.5px; padding:6px 14px; border-radius:2px; }
.vx-nav:disabled { opacity:.45; }
.vx-nav.main { background:#fff; color:#1F5FA9; font-weight:700; }
.vx-clock { font-size:14px; font-weight:700; }
.vx-hint { font-size:10.5px; opacity:.85; }
@media (max-width:760px) { .vx-body { flex-direction:column; } .vx-right { width:100%; border-top:3px solid #1F5FA9; } .vx-left { border-right:none; } .vx-hint { display:none; } }
.lk-wrap { position:relative; }
.lk-blur { filter:blur(4.5px); opacity:.5; pointer-events:none; user-select:none; }
.lk-over { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.lk-pill { background:var(--slate); border:1px solid var(--signal); border-radius:3px; padding:9px 14px; display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--body); box-shadow:0 4px 14px #0e131955; }
.lk-pill b { color:var(--signal); font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.1em; }
.lk-pill button { background:var(--signal); color:#131A22; font-size:12px; font-weight:600; padding:6px 11px; border-radius:3px; }
.qs-tab { margin:4px 0 16px; }
.qs-tab .cap { font-size:12.5px; font-weight:600; margin:0 0 8px; color:#131A22; }
.qs-tab table { border-collapse:collapse; width:100%; font-size:12.5px; }
.qs-tab th, .qs-tab td { border:1px solid #9DB2C8; padding:6px 9px; text-align:right; color:#131A22; }
.qs-tab thead th { background:#DDE9F6; text-align:center; font-weight:600; }
.qs-tab tbody th { background:#EEF2F7; text-align:left; font-weight:600; }
.qs-tab.vx .cap { color:#111; }
.uf-head { display:flex; gap:12px; align-items:center; margin-bottom:14px; }
.uf-head h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:20px; margin:0 0 4px; letter-spacing:-0.02em; }
.uf-style { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; padding:3px 8px; border-radius:2px; border:1px solid; }
.uf-style.mmi { color:var(--signal); border-color:var(--signal); }
.uf-style.panel { color:#7FB3F0; border-color:#7FB3F0; }
.uf-style.both { color:var(--go); border-color:var(--go); }
.uf-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:10px; }
.uf-grid > div { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:11px 13px; }
.uf-grid b { display:block; font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--signal); margin-bottom:5px; }
.uf-grid p { font-size:12.5px; color:var(--body); line-height:1.6; margin:0; }
.uf-grid ul { margin:0; padding-left:15px; }
.uf-grid li { font-size:12.5px; color:var(--body); line-height:1.55; margin-bottom:4px; }
.iv-uniq.curve { border-left:2px solid var(--stop); padding-left:10px; }
.wd { width:100%; max-width:430px; background:#fff; border:1px solid #9DB2C8; border-radius:3px; padding:10px; margin:4px 0 12px; display:block; }
.wp-timer { display:flex; align-items:center; gap:12px; margin:0 0 14px; }
.tclock { font-size:26px; font-weight:700; color:var(--signal); }
.tclock.write { color:var(--go); }
.tlab { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--mute); }
.tdone { font-size:12.5px; color:var(--go); }
.wp-hl { border-top:1px solid var(--line); margin-top:14px; padding-top:13px; }
.hh { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); margin:0 0 9px; }
.hkey { display:flex; gap:8px; margin-bottom:10px; }
.hkey span { font-size:10.5px; font-family:'JetBrains Mono',monospace; padding:3px 8px; border-radius:2px; }
.hkey .green { background:#3ECF8E22; color:var(--go); border:1px solid var(--go); }
.hkey .amber { background:#F5A52422; color:var(--signal); border:1px solid var(--signal); }
.hkey .red { background:#F2555A22; color:var(--stop); border:1px solid var(--stop); }
.hline { border-left:3px solid; padding:8px 0 8px 11px; margin-bottom:8px; }
.hline.green { border-color:var(--go); background:#3ECF8E0f; }
.hline.amber { border-color:var(--signal); background:#F5A5240f; }
.hline.red { border-color:var(--stop); background:#F2555A0f; }
.hline .txt { font-size:13px; line-height:1.55; margin:0 0 5px; color:var(--paper); }
.hline .note { font-size:12px; line-height:1.5; margin:0; color:var(--body); }
.wp-model { background:var(--ink); border:1px solid var(--signal); border-radius:3px; padding:14px 16px; margin-top:14px; }
.wp-model ol { margin:0 0 10px; padding-left:18px; }
.wp-model li { font-size:12.5px; color:var(--body); line-height:1.6; margin-bottom:5px; }
.wp-model .mn { font-size:12.5px; color:var(--body); line-height:1.6; margin:0; }
.wp-boxwrap { position:relative; border-radius:4px; transition:box-shadow .4s; }
@keyframes wpglow { 0%,100% { box-shadow:0 0 0 2px var(--go), 0 0 16px #3ECF8E55; } 50% { box-shadow:0 0 0 2px var(--go), 0 0 30px #3ECF8E99; } }
.wp-boxwrap.glow { animation:wpglow 1.6s infinite; border-radius:4px; }
.wp-think { position:absolute; inset:0; background:var(--ink); opacity:.97; backdrop-filter:blur(3px); border:1px solid var(--signal); border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; z-index:3; }
.wp-think b { font-size:44px; color:var(--signal); line-height:1; }
.wp-think span { font-size:13px; color:var(--body); }
.tbarwrap { flex:1; height:4px; background:var(--line); border-radius:2px; overflow:hidden; min-width:60px; }
.tbarwrap i { display:block; height:100%; background:var(--signal); transition:width 1s linear; }
.tbarwrap i.near { background:var(--go); }
.tclock.near { color:var(--go); }
.wp-result .band b em { font-style:normal; font-size:15px; color:var(--mute); }
.ps-budget { display:flex; align-items:center; gap:12px; margin:14px 0 6px; }
.ps-budget .bar { flex:1; height:6px; background:var(--line); border-radius:3px; overflow:hidden; }
.ps-budget .bar i { display:block; height:100%; background:var(--go); transition:width .3s; }
.ps-budget.over .bar i { background:var(--stop); }
.ps-budget span { font-size:11px; color:var(--mute); }
.ps-budget.over span { color:var(--stop); }
.ps-sec { border:1px solid var(--line); border-radius:4px; background:var(--slate); padding:18px 20px; margin-top:14px; animation:udrise .4s ease both; }
.ps-sec h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:18px; margin:0 0 8px; letter-spacing:-0.02em; }
.ps-sec .g { font-size:12.5px; color:var(--body); line-height:1.6; margin:0 0 8px; }
.ps-sec .g b { color:var(--signal); }
.ps-sec .g.trap b { color:var(--stop); }
.ps-tabs { display:flex; gap:6px; flex-wrap:wrap; margin:16px 0 6px; }
.ps-tabs button { background:transparent; border:1px solid var(--line); color:var(--mute); font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.06em; padding:9px 14px; border-radius:2px; transition:all .15s; }
.ps-tabs button:hover { color:var(--signal); }
.ps-tabs button.on { background:var(--signal); border-color:var(--signal); color:#131A22; }
.ps-drafts { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin:14px 0 4px; }
.dchip { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:2px; overflow:hidden; }
.dchip button { background:transparent; color:var(--mute); font-size:12px; padding:7px 11px; font-family:'JetBrains Mono',monospace; }
.dchip.on { border-color:var(--signal); }
.dchip.on button { color:var(--signal); }
.dchip b { color:var(--mute); font-size:10px; padding:0 8px 0 2px; cursor:pointer; }
.dchip b:hover { color:var(--stop); }
.dadd { background:transparent; border:1px dashed var(--line); color:var(--signal); font-size:16px; width:32px; height:32px; border-radius:2px; line-height:1; }
.dadd:hover { border-color:var(--signal); }
.ps-budget { display:flex; align-items:center; gap:12px; margin:12px 0 6px; }
.ps-budget .bar { flex:1; height:6px; background:var(--line); border-radius:3px; overflow:hidden; }
.ps-budget .bar i { display:block; height:100%; background:var(--go); transition:width .3s; }
.ps-budget.over .bar i { background:var(--stop); }
.ps-budget span { font-size:11px; color:var(--mute); }
.ps-budget.over span { color:var(--stop); }
.ps-sec { border:1px solid var(--line); border-radius:4px; background:var(--slate); margin-top:10px; overflow:hidden; animation:udrise .35s ease both; }
.ps-head { width:100%; display:flex; align-items:center; gap:12px; background:transparent; padding:14px 16px; text-align:left; }
.ps-head .num { width:24px; height:24px; border-radius:50%; background:var(--signal); color:#131A22; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; flex-shrink:0; }
.ps-head .ttl { flex:1; font-family:'Bricolage Grotesque',sans-serif; font-size:15.5px; color:var(--paper); letter-spacing:-0.01em; }
.ps-head .cc { font-size:10.5px; color:var(--mute); }
.ps-head .chev { color:var(--mute); transition:transform .25s; }
.ps-head .chev.open { transform:rotate(90deg); color:var(--signal); }
.ps-body { border-top:1px solid var(--line); padding:16px; animation:udfade .3s ease; }
.ps-body .aim { font-size:13px; color:var(--body); line-height:1.6; margin:0 0 12px; }
.ps-steps { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; margin-bottom:12px; }
.ps-steps > div { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:10px 12px; }
.ps-steps b { display:block; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.1em; color:var(--signal); margin-bottom:4px; text-transform:uppercase; }
.ps-steps span { font-size:12px; color:var(--body); line-height:1.5; }
.ps-frame { font-size:12px; color:var(--mute); line-height:1.6; margin:0 0 14px; }
.ps-frame b { color:var(--signal); }
.ps-split { display:grid; grid-template-columns:1fr; gap:12px; }
@media (min-width:900px) { .ps-split.has { grid-template-columns:1.6fr 1fr; } }
.ps-tips { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:12px 14px; animation:udrise .3s ease; }
.ps-tips .th { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); margin:0 0 9px; }
.ps-tips .tip { border-left:3px solid; padding:6px 0 6px 10px; margin-bottom:9px; }
.ps-tips .tip.good { border-color:var(--go); }
.ps-tips .tip.warn { border-color:var(--signal); }
.ps-tips .tip.bad { border-color:var(--stop); }
.ps-tips .tip b { display:block; font-size:12.5px; margin-bottom:3px; }
.ps-tips .tip span { font-size:12px; color:var(--body); line-height:1.5; }
.ps-frames { display:flex; gap:6px; flex-wrap:wrap; margin:14px 0 12px; }
.ps-frames button { background:transparent; border:1px solid var(--line); color:var(--mute); font-family:'JetBrains Mono',monospace; font-size:11px; padding:8px 13px; border-radius:2px; }
.ps-frames button.on { border-color:var(--signal); color:var(--signal); }
.ps-frameview { border:1px solid var(--line); border-radius:4px; background:var(--slate); padding:16px; animation:udfade .3s ease; }
.ps-frameview .best { font-size:12.5px; color:var(--body); margin:0 0 12px; }
.ps-routed { margin-top:16px; }
.rsec { border:1px solid var(--line); border-radius:4px; background:var(--slate); padding:15px 17px; margin-bottom:10px; animation:udrise .35s ease both; }
.rsec h4 { display:flex; align-items:center; gap:9px; font-family:'Bricolage Grotesque',sans-serif; font-size:15px; margin:0 0 10px; }
.rsec .num { width:22px; height:22px; border-radius:50%; background:var(--signal); color:#131A22; display:flex; align-items:center; justify-content:center; font-size:11px; font-family:'JetBrains Mono',monospace; font-weight:700; }
.rsec .empty { font-size:12.5px; color:var(--mute); margin:0; }
.ritem { border-left:3px solid var(--go); padding:7px 0 7px 11px; margin-bottom:8px; }
.ritem .l { font-size:13px; color:var(--paper); margin:0 0 3px; }
.ritem .w { font-size:12px; color:var(--body); line-height:1.5; margin:0; }
.ps-gen { margin-top:16px; }
.gscore { display:flex; align-items:baseline; gap:12px; margin-bottom:14px; }
.gscore b { font-family:'Bricolage Grotesque',sans-serif; font-size:40px; letter-spacing:-0.03em; }
.gscore b.good { color:var(--go); } .gscore b.warn { color:var(--signal); } .gscore b.bad { color:var(--stop); }
.gscore b em { font-style:normal; font-size:15px; color:var(--mute); }
.gscore span { font-size:13px; color:var(--body); }
.gflag { border-left:3px solid; background:var(--slate); border-radius:0 3px 3px 0; padding:10px 13px; margin-bottom:8px; animation:udrise .3s ease both; }
.gflag.good { border-color:var(--go); } .gflag.warn { border-color:var(--signal); } .gflag.bad { border-color:var(--stop); }
.gflag .gh { display:flex; justify-content:space-between; gap:10px; margin-bottom:4px; }
.gflag .gh b { font-size:13px; }
.gflag .gh span { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--mute); }
.gflag p { font-size:12.5px; color:var(--body); line-height:1.55; margin:0; }
.region-bar { display:flex; gap:8px; margin:14px 0 4px; flex-wrap:wrap; }
.region-bar button { display:flex; align-items:center; gap:9px; background:transparent; border:1px solid var(--line); color:var(--mute); font-size:13px; padding:9px 14px; border-radius:3px; transition:all .18s; }
.region-bar button:hover { border-color:var(--signal); color:var(--paper); }
.region-bar button.on { border-color:var(--signal); color:var(--signal); background:#F5A5240f; }
.region-bar .flag { width:26px; height:13px; border-radius:1px; flex-shrink:0; }
.au-bands { border:1px solid var(--line); border-radius:4px; background:var(--slate); padding:16px 18px; margin-top:14px; }
.au-bands .bh { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); margin:0 0 10px; }
.aband { border-top:1px solid var(--line); padding:9px 0; display:grid; grid-template-columns:auto auto 1fr; gap:8px 12px; align-items:baseline; }
.aband b { font-size:12px; color:var(--paper); }
.aband .sc { font-size:11px; color:var(--mute); }
.aband .st { font-size:11.5px; color:var(--signal); }
.aband p { grid-column:1 / -1; font-size:12.5px; color:var(--body); line-height:1.55; margin:0; }
.ps-preview { border:1px solid var(--line); border-radius:4px; background:var(--card); padding:26px 28px; margin-top:14px; animation:udrise .4s ease; }
.pv-head { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid var(--paperline); padding-bottom:10px; margin-bottom:18px; font-size:11px; color:#5A6675; }
.pv-sec { margin-bottom:22px; }
.pv-sec h4 { display:flex; align-items:center; gap:9px; font-family:'Bricolage Grotesque',sans-serif; font-size:15px; color:#131A22; margin:0 0 10px; }
.pv-sec .num { width:21px; height:21px; border-radius:50%; background:#131A22; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-family:'JetBrains Mono',monospace; }
.pv-sec p { font-size:14px; line-height:1.75; color:#1E2733; margin:0 0 11px; }
.pv-sec .empty { color:#8A94A0; font-style:italic; font-size:13px; }
.tour-wrap { position:fixed; inset:0; z-index:90; background:#0E131999; backdrop-filter:blur(3px); display:flex; align-items:flex-end; justify-content:center; padding:22px; }
@keyframes tourin { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:none; } }
.tour-card { max-width:440px; width:100%; background:var(--slate); border:1px solid var(--signal); border-radius:6px; padding:24px; animation:tourin .35s cubic-bezier(.2,.8,.3,1); box-shadow:0 18px 50px #0e131988; }
.tour-card .step { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); }
.tour-card h3 { font-family:'Bricolage Grotesque',sans-serif; font-size:21px; letter-spacing:-0.02em; margin:8px 0 8px; }
.tour-card p { font-size:13.5px; color:var(--body); line-height:1.65; margin:0 0 16px; }
.tour-dots { display:flex; gap:6px; margin-bottom:16px; }
.tour-dots i { width:22px; height:3px; border-radius:2px; background:var(--line); transition:background .3s; }
.tour-dots i.on { background:var(--signal); }
.tour-btns { display:flex; gap:9px; align-items:center; justify-content:flex-end; }
@keyframes rhintin { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
.rhint { display:flex; align-items:flex-start; gap:9px; background:#F5A5241a; border:1px solid var(--signal); border-radius:3px; padding:8px 11px; margin-top:6px; animation:rhintin .3s ease; }
.rhint .arrow { color:var(--signal); font-size:14px; line-height:1.2; flex-shrink:0; }
.rhint p { flex:1; font-size:12px; color:var(--body); line-height:1.5; margin:0; }
.rhint p b { color:var(--signal); }
.rhint button { background:transparent; color:var(--mute); font-size:12px; padding:0 3px; flex-shrink:0; }
.rhint button:hover { color:var(--signal); }
.ps-hintbar { display:flex; gap:8px; margin-top:20px; padding-top:14px; border-top:1px solid var(--line); }
.ps-hintbar button { background:transparent; border:1px solid var(--line); color:var(--mute); font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:0.08em; padding:7px 12px; border-radius:2px; }
.ps-hintbar button:hover { color:var(--signal); border-color:var(--signal); }
.intl-box { border:1px solid var(--line); border-radius:4px; background:var(--slate); padding:16px 18px; margin-top:14px; animation:udrise .4s ease both; }
.intl-box .ih { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); margin:0 0 12px; }
.intl-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:9px; }
.intl-grid > div { background:var(--ink); border:1px solid var(--line); border-radius:3px; padding:10px 12px; }
.intl-grid b { display:block; font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:var(--signal); margin-bottom:5px; }
.intl-grid p { font-size:12.5px; color:var(--body); line-height:1.55; margin:0; }
.intl-notes { margin:12px 0 0; padding-left:17px; }
.intl-notes li { font-size:12.5px; color:var(--body); line-height:1.6; margin-bottom:6px; }
.intl-warn { font-size:11.5px; color:var(--mute); line-height:1.6; margin:12px 0 0; border-top:1px solid var(--line); padding-top:10px; }
.facts-box { border:1px solid var(--line); border-radius:4px; background:var(--slate); margin-top:20px; overflow:hidden; animation:udrise .4s ease both; }
.facts-head { width:100%; display:flex; align-items:center; gap:12px; background:transparent; padding:14px 16px; text-align:left; }
.facts-head .k { font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--signal); flex-shrink:0; }
.facts-head .t { flex:1; font-family:'Bricolage Grotesque',sans-serif; font-size:15px; color:var(--paper); }
.facts-head .chev { color:var(--mute); transition:transform .25s; }
.facts-head .chev.open { transform:rotate(90deg); color:var(--signal); }
.facts-body { border-top:1px solid var(--line); padding:6px 16px 14px; animation:udfade .3s ease; }
.frow { display:grid; grid-template-columns:170px 1fr; gap:12px; padding:9px 0; border-bottom:1px solid var(--line); }
.frow b { font-size:12.5px; color:var(--signal); }
.frow span { font-size:12.5px; color:var(--body); line-height:1.55; }
@media (max-width:640px) { .frow { grid-template-columns:1fr; gap:3px; } }
.fnote { font-size:11.5px; color:var(--mute); margin:11px 0 0; }
@media (prefers-reduced-motion: reduce) { .ud * { animation:none !important; transition:none !important; } }
@media (max-width:620px) {
  .ud-panel { padding:19px; }
  .ud-price,.ud-nextup { flex-direction:column; align-items:flex-start; }
  .ud-nav button { padding:6px 7px; font-size:10px; }
  .ud-config { gap:14px; }
}

/* Results: accuracy-by-type bars, weakest-type callout, answer review */
.res-bars { display:flex; flex-direction:column; gap:9px; margin-top:6px; }
.res-bar { display:grid; grid-template-columns:132px 1fr 46px; align-items:center; gap:12px; }
.res-bar .rb-l { font-size:12.5px; color:var(--body); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.res-bar .rb-track { height:12px; border-radius:6px; background:color-mix(in srgb, var(--mute) 22%, transparent); overflow:hidden; }
.res-bar .rb-track i { display:block; height:100%; border-radius:6px; }
.res-bar .rb-n { font-size:12.5px; text-align:right; color:var(--body); }
.res-weak { margin-top:20px; border:1px solid var(--line); border-left:3px solid var(--signal); border-radius:8px; padding:16px 18px; background:var(--card); }
.res-weak .k { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--signal); }
.res-weak h3 { font-size:16px; margin:8px 0 6px; color:var(--ink); }
.res-weak p { font-size:13.5px; color:var(--body); line-height:1.6; margin:0 0 12px; }
.res-review { margin-top:18px; display:flex; flex-direction:column; gap:10px; }
.rev-item { border:1px solid var(--line); border-left:3px solid var(--stop); border-radius:8px; padding:13px 15px; background:var(--card); }
.rev-item.ok { border-left-color:var(--go); }
.rev-q { font-size:14px; margin:0 0 6px; color:var(--ink); }
.rev-a { font-size:13px; display:flex; gap:16px; flex-wrap:wrap; margin:0 0 6px; }
.rev-a .you { color:var(--stop); }
.rev-a .corr { color:var(--go); }
.rev-w { font-size:13px; color:var(--body); line-height:1.6; margin:0; }
.rev-syl p { font-size:12.5px; color:var(--body); line-height:1.5; margin:4px 0; }

/* Progress: overlapping score-over-time line chart */
.score-chart { width:100%; height:auto; display:block; margin-top:6px; }
.score-chart .sc-axis { font-family:'JetBrains Mono',monospace; font-size:9px; fill:var(--mute); }
.sc-legend { display:flex; gap:18px; flex-wrap:wrap; margin-bottom:8px; font-size:12.5px; color:var(--body); }
.sc-legend .k { display:inline-flex; align-items:center; gap:7px; }
.sc-legend .k i { width:15px; height:3px; border-radius:2px; }
.sc-legend .k b { color:var(--ink); }

/* Progress: activity-streak heatmap */
.streak-head { display:flex; gap:28px; flex-wrap:wrap; margin-bottom:16px; }
.streak-stat { display:flex; flex-direction:column; }
.streak-stat b { font-family:'JetBrains Mono',monospace; font-size:24px; font-weight:700; color:var(--ink); line-height:1; display:flex; align-items:center; gap:6px; }
.streak-stat span { font-size:11.5px; color:var(--mute); margin-top:5px; }
.streak-stat .fl { font-size:17px; }
.cal { display:flex; gap:3px; overflow-x:auto; padding-bottom:6px; }
.cal-col { display:flex; flex-direction:column; gap:3px; }
.cal-cell { width:13px; height:13px; border-radius:3px; flex:none; }
.cal-cell.l0, .cal-legend .l0 { background:color-mix(in srgb, var(--mute) 16%, transparent); }
.cal-cell.l1, .cal-legend .l1 { background:color-mix(in srgb, var(--signal) 38%, transparent); }
.cal-cell.l2, .cal-legend .l2 { background:color-mix(in srgb, var(--signal) 66%, transparent); }
.cal-cell.l3, .cal-legend .l3 { background:var(--signal); }
.cal-cell.lf { background:transparent; }
.cal-legend { display:flex; align-items:center; gap:5px; margin-top:9px; font-size:10.5px; color:var(--mute); }
.cal-legend i { width:12px; height:12px; border-radius:3px; }

/* Home: hero beside the countdown and streak */
.ud-herorow { display:grid; grid-template-columns:1.35fr 1fr; gap:22px; align-items:start; }
.ud-herostreak { display:flex; flex-direction:column; gap:14px; }
@media (max-width: 860px) { .ud-herorow { grid-template-columns:1fr; } }

/* ---- Left icon sidebar navigation ---- */
.ud-hasside { padding-left:214px; }
.ud-side { position:fixed; left:0; top:0; bottom:0; width:214px; background:var(--slate); border-right:1px solid var(--line); display:flex; flex-direction:column; padding:16px 12px; z-index:30; overflow-y:auto; }
.ud-side .ud-markbtn { background:transparent; padding:6px 8px 14px; margin-bottom:4px; border-bottom:1px solid var(--line); text-align:left; }
.ud-side .ud-mark { display:flex; align-items:baseline; gap:8px; }
.ud-side-nav { display:flex; flex-direction:column; gap:2px; margin-top:12px; flex:1; }
.ud-side-nav button { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:transparent; color:var(--body); font-family:'Inter',system-ui,sans-serif; font-size:13.5px; font-weight:500; padding:9px 11px; border-radius:8px; position:relative; transition:background .15s, color .15s; }
.ud-side-nav button svg { width:18px; height:18px; flex:none; color:var(--mute); transition:color .15s; }
.ud-side-nav button:hover { background:color-mix(in srgb, var(--signal) 10%, transparent); color:var(--paper); }
.ud-side-nav button:hover svg { color:var(--signal); }
.ud-side-nav button.on { background:color-mix(in srgb, var(--signal) 16%, transparent); color:var(--paper); font-weight:600; }
.ud-side-nav button.on svg { color:var(--signal); }
.ud-side-nav button.on::before { content:""; position:absolute; left:-12px; top:8px; bottom:8px; width:3px; border-radius:0 3px 3px 0; background:var(--signal); }
.ud-side-nav .dot { position:absolute; right:10px; top:50%; transform:translateY(-50%); width:7px; height:7px; border-radius:50%; background:var(--stop); }
.ud-side-foot { border-top:1px solid var(--line); padding-top:12px; margin-top:10px; display:flex; align-items:center; gap:8px; }
.ud-side-foot .ud-badge { flex:1; text-align:center; padding:7px 6px; }
@media (max-width:820px) {
  .ud-hasside { padding-left:60px; }
  .ud-side { width:60px; padding:14px 8px; align-items:center; }
  .ud-side .lbl, .ud-side .ud-mark span.txt, .ud-side-foot .ud-badge .txt { display:none; }
  .ud-side .ud-mark b { font-size:15px; }
  .ud-side-nav button { justify-content:center; gap:0; padding:11px 0; }
  .ud-side-nav button.on::before { left:-8px; }
  .ud-side-nav .dot { right:6px; top:6px; transform:none; }
  .ud-side-foot { flex-direction:column; }
}

/* ---- Learn overview: subtest cards then technique detail ---- */
.learn-grid { display:grid; grid-template-columns:1fr; gap:12px; margin:20px 0 34px; }
.learn-card { display:flex; align-items:center; gap:18px; text-align:left; width:100%; padding:20px 22px; background:var(--card); border:1px solid var(--line); border-radius:5px; cursor:pointer; transition:border-color .15s, transform .12s, box-shadow .15s; }
.learn-card:hover { border-color:var(--signal); transform:translateY(-2px); box-shadow:0 6px 22px -14px rgba(0,0,0,.5); }
.learn-ico { flex:none; width:56px; height:56px; border-radius:50%; display:grid; place-items:center; background:color-mix(in srgb, var(--signal) 14%, transparent); color:var(--signal); }
.learn-ico svg { width:30px; height:30px; }
.learn-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:7px; }
.learn-title { font-family:var(--display); font-weight:700; font-size:18px; color:var(--paper); letter-spacing:-.01em; }
.learn-blurb { font-size:13px; line-height:1.55; color:var(--body); }
.learn-bar { display:block; height:5px; border-radius:3px; background:var(--paperline); overflow:hidden; margin-top:3px; }
.learn-bar i { display:block; height:100%; background:var(--signal); border-radius:3px; transition:width .4s; }
.learn-meta { display:flex; justify-content:space-between; font-family:var(--mono); font-size:11px; letter-spacing:.03em; text-transform:uppercase; color:var(--mute); }
.learn-back { display:inline-flex; align-items:center; gap:6px; margin:26px 0 16px; padding:7px 12px; background:none; border:1px solid var(--line); border-radius:4px; color:var(--body); font-size:12.5px; cursor:pointer; transition:border-color .15s, color .15s; }
.learn-back:hover { border-color:var(--signal); color:var(--paper); }
.learn-detailhead { display:flex; align-items:center; gap:16px; margin-bottom:6px; }
.learn-detailhead h2 { margin:0; }
.learn-count { font-family:var(--mono); font-size:11px; letter-spacing:.03em; text-transform:uppercase; color:var(--mute); }
@media (min-width:640px) { .learn-grid { grid-template-columns:repeat(3,1fr); } .learn-card { flex-direction:column; align-items:flex-start; text-align:left; } }

/* Learn detail: numbered technique cards */
.learn-tech { display:grid; grid-template-columns:1fr; gap:10px; margin:18px 0 0; }
.tech-card { display:flex; gap:14px; padding:16px 18px; background:var(--card); border:1px solid var(--line); border-left:3px solid var(--signal); border-radius:4px; }
.tech-card.tech-note { border-left-color:var(--line); background:transparent; }
.tech-num { flex:none; font-family:var(--mono); font-size:13px; font-weight:600; color:var(--signal); line-height:1.4; min-width:20px; }
.tech-note .tech-num { color:var(--mute); }
.tech-body { flex:1; min-width:0; }
.tech-body h4 { margin:0 0 5px; font-family:var(--display); font-size:15.5px; font-weight:700; color:var(--paper); letter-spacing:-.01em; }
.tech-body p { margin:0; font-size:13.5px; line-height:1.62; color:var(--body); }
.tech-drill { margin-top:11px; padding:6px 12px; background:none; border:1px solid var(--line); border-radius:4px; color:var(--signal); font-family:var(--mono); font-size:11px; letter-spacing:.04em; text-transform:uppercase; cursor:pointer; transition:border-color .15s, background .15s; }
.tech-drill:hover:not(:disabled) { border-color:var(--signal); background:color-mix(in srgb, var(--signal) 10%, transparent); }
.tech-drill:disabled { color:var(--mute); cursor:not-allowed; }
@media (min-width:720px) { .learn-tech { grid-template-columns:1fr 1fr; } }

/* A-level custom entry and subject-fit banner */
.al-entry { display:flex; flex-direction:column; gap:8px; margin-top:7px; }
.al-row { display:flex; gap:8px; align-items:center; }
.al-subj { flex:1; min-width:0; }
.al-grade { width:74px; flex:none; }
.al-drop { flex:none; width:34px; height:34px; border:1px solid var(--line); background:var(--card); color:var(--mute); border-radius:4px; font-size:17px; line-height:1; cursor:pointer; transition:color .15s, border-color .15s; }
.al-drop:hover:not(:disabled) { color:var(--stop); border-color:var(--stop); }
.al-drop:disabled { opacity:.4; cursor:not-allowed; }
.al-add { align-self:flex-start; padding:6px 12px; background:none; border:1px dashed var(--line); border-radius:4px; color:var(--body); font-size:12.5px; cursor:pointer; transition:border-color .15s, color .15s; }
.al-add:hover { border-color:var(--signal); color:var(--paper); }
.fit-banner { margin:16px 0 4px; padding:13px 16px; border-radius:5px; font-size:13px; line-height:1.6; border:1px solid var(--line); }
.fit-banner b { color:var(--paper); }
.fit-go { border-left:3px solid var(--go); background:color-mix(in srgb, var(--go) 8%, transparent); }
.fit-warn { border-left:3px solid var(--signal); background:color-mix(in srgb, var(--signal) 9%, transparent); }
.fit-stop { border-left:3px solid var(--stop); background:color-mix(in srgb, var(--stop) 9%, transparent); }
.uni-subjflag { margin:6px 0 0; padding:8px 11px; font-size:12.5px; line-height:1.55; color:var(--paper); background:color-mix(in srgb, var(--stop) 10%, transparent); border-left:3px solid var(--stop); border-radius:4px; }

/* Launch-sale struck price, untimed badge, keyboard hint */
.price .was, .bill-card .price .was { font-family:'JetBrains Mono',monospace; font-size:15px; color:var(--mute); text-decoration:line-through; margin-left:10px; -webkit-text-decoration:line-through; }
.ud-examflag.calm { color:var(--mute); border-color:var(--line); }
.ud-hint.kbd { margin-top:12px; font-size:11.5px; color:var(--mute); font-style:italic; }

/* Official-mocks panel in the mock centre */
.mock-official { margin-top:26px; border:1px solid var(--line); border-radius:5px; padding:20px; background:var(--slate); }
.mock-official .mo-head h3 { margin:0 0 6px; font-family:'Bricolage Grotesque',sans-serif; font-size:17px; letter-spacing:-0.01em; }
.mock-official .mo-head p { margin:0; font-size:13px; line-height:1.6; color:var(--body); }
.mo-links { display:grid; grid-template-columns:1fr; gap:10px; margin:16px 0 12px; }
.mo-link { display:block; padding:13px 15px; border:1px solid var(--line); border-radius:4px; background:var(--card); text-decoration:none; color:inherit; transition:border-color .15s, transform .12s; }
.mo-link:hover { border-color:var(--signal); transform:translateY(-1px); }
.mo-link b { display:block; font-size:13.5px; color:var(--signal); margin-bottom:3px; }
.mo-link span { display:block; font-size:12.5px; color:var(--body); line-height:1.5; }
.mo-foot { margin:0; font-size:11px; color:var(--mute); line-height:1.5; }
@media (min-width:640px) { .mo-links { grid-template-columns:1fr 1fr; } }

/* Custom plan builder and checklist */
.plan-build { border:1px solid var(--line); border-radius:5px; padding:18px; background:var(--slate); margin-top:14px; }
.plan-build h3 { margin:0 0 12px; font-family:'Bricolage Grotesque',sans-serif; font-size:15.5px; }
.pb-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.pb-row select { flex:1; min-width:190px; }
.pb-timed { display:flex; align-items:center; gap:7px; font-size:13px; color:var(--body); white-space:nowrap; }
.pb-timed input { width:auto; }
.cust-list { border:1px solid var(--line); border-radius:5px; margin-top:16px; overflow:hidden; }
.cust-row { display:flex; align-items:stretch; border-top:1px solid var(--line); }
.cust-row:first-child { border-top:none; }
.cust-start { flex:1; min-width:0; display:flex; align-items:center; gap:13px; padding:12px 15px; background:transparent; color:inherit; text-align:left; border:none; cursor:pointer; }
.cust-start:hover:not(:disabled) { background:color-mix(in srgb, var(--signal) 7%, transparent); }
.cust-start:disabled { opacity:.55; cursor:not-allowed; }
.cust-start .n { color:var(--mute); font-size:11px; width:20px; flex:none; }
.cust-start .nm { flex:1; font-size:13.5px; }
.cust-start .meta { font-family:'JetBrains Mono',monospace; font-size:10.5px; color:var(--mute); flex:none; }
.cust-del { flex:none; width:46px; border:none; border-left:1px solid var(--line); background:transparent; color:var(--mute); font-size:18px; line-height:1; cursor:pointer; transition:color .15s, background .15s; }
.cust-del:hover { color:var(--stop); background:color-mix(in srgb, var(--stop) 9%, transparent); }
`;
