export const CSS = `
.tb-root{position:absolute;inset:0;overflow:hidden;background:#05070f;font-family:var(--tb-ui),Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:none}
.tb-root.tb-fake{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:2147483000}
.tb-root>canvas{display:block;width:100%;height:100%}
.tb-hud{position:absolute;inset:0;pointer-events:none}
.tb-hud button{pointer-events:auto;font-family:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.tb-d{font-family:var(--tb-display),var(--tb-ui),Arial Black,sans-serif;font-weight:400;letter-spacing:.02em}
/* ── scoreboard ── */
.tb-score{position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))}
.tb-team-s{position:relative;min-width:92px;height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.tb-team-s small{font-size:10px;font-weight:700;letter-spacing:.22em;opacity:.85;margin-top:2px}
.tb-team-s b{font-family:var(--tb-display);font-size:32px;line-height:1;font-weight:400}
.tb-team-s.blue{background:linear-gradient(180deg,#4aa2ff,#1349c4);clip-path:polygon(14px 0,100% 0,100% 100%,0 100%)}
.tb-team-s.orange{background:linear-gradient(180deg,#ffae4a,#d64e05);clip-path:polygon(0 0,calc(100% - 14px) 0,100% 100%,0 100%)}
.tb-team-s::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.28),transparent 45%);pointer-events:none}
.tb-team-s b.pop{animation:tbScorePop .6s cubic-bezier(.2,1.8,.4,1)}
@keyframes tbScorePop{0%{transform:scale(2.6);filter:brightness(3)}100%{transform:scale(1)}}
.tb-mid{min-width:112px;background:linear-gradient(180deg,#151b2e,#070a14);display:flex;flex-direction:column;align-items:center;justify-content:center;border-top:2px solid rgba(255,255,255,.12);position:relative}
.tb-clock{font-family:var(--tb-display);font-size:26px;line-height:1;font-variant-numeric:tabular-nums}
.tb-clock.low{color:#ff5a5a;animation:tbBlink 1s steps(2) infinite}
@keyframes tbBlink{50%{opacity:.45}}
.tb-ot{font-size:10px;font-weight:700;letter-spacing:.25em;color:#ffcf4a;height:12px}
/* ── messages ── */
.tb-msg{position:absolute;top:76px;left:50%;transform:translateX(-50%) skewX(-12deg);background:linear-gradient(90deg,rgba(10,14,30,.92),rgba(30,40,80,.92));border-left:4px solid #4aa2ff;padding:8px 18px;font-weight:700;font-size:15px;opacity:0;transition:opacity .4s;white-space:nowrap}
.tb-msg span{display:inline-block;transform:skewX(12deg)}
.tb-big{position:absolute;inset:0;display:none;pointer-events:none}
.tb-count{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);font-family:var(--tb-display);font-size:clamp(90px,18vw,200px);line-height:1;text-shadow:0 0 40px rgba(110,180,255,.9),0 8px 0 rgba(0,0,0,.35);animation:tbCount .9s cubic-bezier(.2,1.4,.4,1) both}
.tb-count.go{color:#7dffb0;text-shadow:0 0 50px rgba(80,255,160,.9),0 8px 0 rgba(0,0,0,.35)}
.tb-count::before{content:"";position:absolute;left:50%;top:50%;width:1.6em;height:1.6em;margin:-.8em 0 0 -.8em;border-radius:50%;border:4px solid rgba(140,200,255,.7);animation:tbRing .9s ease-out both}
@keyframes tbCount{0%{transform:translate(-50%,-50%) scale(2.4);opacity:0}25%{opacity:1}100%{transform:translate(-50%,-50%) scale(1)}}
@keyframes tbRing{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.6);opacity:0}}
/* goal banner */
.tb-goalwrap{position:absolute;top:24%;left:0;right:0;height:170px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.tb-goalband{position:absolute;left:-10%;right:-10%;top:28px;bottom:28px;transform:skewY(-4deg);animation:tbBand 3s cubic-bezier(.2,1,.3,1) both}
.tb-goalband.blue{background:linear-gradient(90deg,transparent,rgba(31,111,255,.9) 18%,#4aa2ff 50%,rgba(31,111,255,.9) 82%,transparent)}
.tb-goalband.orange{background:linear-gradient(90deg,transparent,rgba(230,90,10,.9) 18%,#ffa040 50%,rgba(230,90,10,.9) 82%,transparent)}
.tb-goalband::before,.tb-goalband::after{content:"";position:absolute;left:0;right:0;height:4px;background:#fff;opacity:.85}
.tb-goalband::before{top:-10px}.tb-goalband::after{bottom:-10px}
@keyframes tbBand{0%{transform:skewY(-4deg) scaleX(0)}12%{transform:skewY(-4deg) scaleX(1)}85%{opacity:1}100%{transform:skewY(-4deg) scaleX(1);opacity:0}}
.tb-goaltxt{position:relative;text-align:center;animation:tbGoalIn 3s cubic-bezier(.2,1.5,.3,1) both}
.tb-goaltxt b{display:block;font-family:var(--tb-display);font-size:clamp(70px,13vw,150px);line-height:.9;font-style:italic;text-shadow:0 6px 0 rgba(0,0,0,.35),0 0 40px rgba(255,255,255,.6)}
.tb-goaltxt span{display:inline-block;margin-top:6px;background:rgba(0,0,0,.55);padding:5px 14px;font-weight:700;font-size:16px;letter-spacing:.06em;transform:skewX(-12deg)}
@keyframes tbGoalIn{0%{transform:scale(3);opacity:0}10%{transform:scale(1);opacity:1}85%{opacity:1}100%{transform:scale(1.05);opacity:0}}
/* ── boost gauge ── */
.tb-boost{position:absolute;right:20px;bottom:18px;width:138px;height:138px}
.tb-boost svg{width:100%;height:100%}
.tb-boost .bg{fill:none;stroke:rgba(5,8,18,.75);stroke-width:13}
.tb-boost .ticks{fill:none;stroke:rgba(255,255,255,.18);stroke-width:13;stroke-dasharray:2 9.3}
.tb-boost .fg{fill:none;stroke:url(#tbBoostG);stroke-width:13;stroke-linecap:butt;filter:drop-shadow(0 0 6px rgba(255,150,0,.9));transition:stroke-dashoffset .08s}
.tb-boost .disc{fill:rgba(6,9,20,.82);stroke:rgba(255,255,255,.12);stroke-width:1.5}
.tb-boost b{position:absolute;left:0;right:0;top:40px;text-align:center;font-family:var(--tb-display);font-size:40px;line-height:1;text-shadow:0 0 12px rgba(255,170,40,.6)}
.tb-boost small{position:absolute;left:0;right:0;top:84px;text-align:center;font-size:10px;letter-spacing:.3em;font-weight:700;opacity:.7}
.tb-boost.on b{color:#ffd36a;animation:tbShake .08s infinite alternate}
@keyframes tbShake{to{transform:translate(1px,-1px)}}
.tb-speed{position:absolute;right:166px;bottom:28px;text-align:right;font-family:var(--tb-display);font-size:22px;opacity:.8;text-shadow:0 2px 6px #000}
.tb-speed small{display:block;font-family:var(--tb-ui);font-size:10px;letter-spacing:.25em;font-weight:700;opacity:.7}
.tb-speed.ss{color:#9fd8ff;text-shadow:0 0 14px #3aa0ff}
/* ── corner buttons ── */
.tb-ic{position:absolute;top:12px;display:flex;gap:8px}
.tb-ic.l{left:12px}.tb-ic.r{right:12px}
.tb-ic button{height:40px;min-width:40px;padding:0 12px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,rgba(30,38,64,.85),rgba(8,11,24,.85));color:#fff;border-radius:10px;font-weight:700;font-size:13px;backdrop-filter:blur(6px);display:flex;align-items:center;gap:6px}
.tb-ic button svg{width:18px;height:18px}
.tb-ic button.off{opacity:.55}
/* ── menus ── */
.tb-menu{position:absolute;inset:0;display:none;pointer-events:auto;overflow:auto;background:linear-gradient(90deg,rgba(3,5,14,.92) 0%,rgba(3,5,14,.6) 45%,rgba(3,5,14,.05) 75%),radial-gradient(ellipse at 70% 60%,transparent 30%,rgba(0,0,0,.55))}
.tb-menu.center{background:radial-gradient(ellipse at center,rgba(4,7,18,.6),rgba(2,3,9,.92))}
.tb-menu::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.025) 0 2px,transparent 2px 22px);pointer-events:none}
.tb-main-l{position:relative;min-height:100%;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:28px 6vw;max-width:520px}
.tb-logo{font-family:var(--tb-display);font-size:clamp(52px,9vw,96px);line-height:.85;font-style:italic;margin:0;transform:skewX(-6deg);filter:drop-shadow(0 6px 0 rgba(0,0,0,.5)) drop-shadow(0 0 30px rgba(60,140,255,.45))}
.tb-logo .a{background:linear-gradient(180deg,#fff 20%,#7fb8ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.tb-logo .b{background:linear-gradient(180deg,#ffe0b0 10%,#ff7a12 80%);-webkit-background-clip:text;background-clip:text;color:transparent}
.tb-tag{margin:0 0 14px;font-weight:700;letter-spacing:.32em;font-size:12px;opacity:.75;text-transform:uppercase}
.tb-item{position:relative;display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:0;padding:14px 22px;background:linear-gradient(90deg,rgba(255,255,255,.1),rgba(255,255,255,.02));color:#fff;transform:skewX(-12deg);transition:transform .15s,background .15s;border-left:4px solid rgba(255,255,255,.3)}
.tb-item>*{transform:skewX(12deg)}
.tb-item b{font-family:var(--tb-display);font-size:24px;font-weight:400;letter-spacing:.03em}
.tb-item small{display:block;font-size:12px;opacity:.7;font-weight:600;letter-spacing:.04em}
.tb-item i{font-style:normal;font-size:22px;width:34px;text-align:center}
.tb-item:hover,.tb-item:focus-visible{transform:skewX(-12deg) translateX(10px);background:linear-gradient(90deg,rgba(74,162,255,.45),rgba(74,162,255,.05));border-left-color:#4aa2ff;outline:none}
.tb-item.hot{background:linear-gradient(90deg,#1f6fff,rgba(31,111,255,.25));border-left-color:#9fd0ff}
.tb-item.hot2{background:linear-gradient(90deg,#ff6a10,rgba(255,106,16,.25));border-left-color:#ffd0a0}
.tb-item.hot2:hover{background:linear-gradient(90deg,#ff8a30,rgba(255,106,16,.3))}
.tb-name{display:flex;align-items:center;gap:10px;margin:6px 0 2px;font-size:11px;font-weight:700;letter-spacing:.2em;opacity:.95}
.tb-name input,.tb-code{flex:1;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.45);color:#fff;border-radius:8px;padding:10px 12px;font-size:16px;font-weight:700;font-family:inherit;letter-spacing:.03em;pointer-events:auto}
.tb-name input:focus,.tb-code:focus{outline:2px solid #4aa2ff;border-color:transparent}
.tb-panel{position:relative;margin:auto;width:min(560px,94%);background:linear-gradient(180deg,rgba(16,22,44,.95),rgba(6,9,20,.97));border:1px solid rgba(120,170,255,.22);border-radius:6px;padding:20px 22px;box-shadow:0 30px 80px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.08);display:flex;flex-direction:column;gap:12px;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))}
.tb-panel.wide{width:min(700px,94%)}
.tb-menu.center{display:none;align-items:center;justify-content:center;padding:16px}
.tb-ph{display:flex;align-items:center;gap:12px;margin:-4px 0 2px}
.tb-ph h2{margin:0;font-family:var(--tb-display);font-weight:400;font-size:28px;font-style:italic;letter-spacing:.03em}
.tb-ph .tb-back{margin-left:auto}
.tb-lbl{font-size:11px;font-weight:700;letter-spacing:.24em;opacity:.65;margin-bottom:-6px}
.tb-chips{display:flex;gap:8px;flex-wrap:wrap}
.tb-chips button{flex:1;min-width:84px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;padding:11px 8px;font-weight:700;font-size:15px;transform:skewX(-10deg);transition:background .15s}
.tb-chips button>span{display:inline-block;transform:skewX(10deg)}
.tb-chips button.on{background:linear-gradient(180deg,#fff,#cfe2ff);color:#0a1430;border-color:#fff;box-shadow:0 0 18px rgba(120,180,255,.55)}
.tb-chips small{display:block;font-size:10px;font-weight:600;opacity:.7;letter-spacing:.05em}
.tb-go{border:0;padding:15px;background:linear-gradient(90deg,#1f6fff,#46b0ff);color:#fff;font-family:var(--tb-display);font-size:24px;letter-spacing:.06em;transform:skewX(-10deg);box-shadow:0 6px 0 #0a3592,0 0 30px rgba(60,150,255,.5);transition:transform .12s,filter .12s}
.tb-go>span{display:inline-block;transform:skewX(10deg)}
.tb-go:hover{filter:brightness(1.15);transform:skewX(-10deg) translateY(-2px)}
.tb-go.orange{background:linear-gradient(90deg,#ff6a10,#ffa040);box-shadow:0 6px 0 #8a3405,0 0 30px rgba(255,140,40,.5)}
.tb-go[disabled]{filter:grayscale(1) brightness(.6)}
.tb-ghost{border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff;padding:10px 14px;font-weight:700;font-size:14px;border-radius:6px}
.tb-ghost:hover{background:rgba(255,255,255,.08)}
.tb-join{display:flex;gap:8px}.tb-code{text-transform:uppercase;letter-spacing:.35em;text-align:center;font-family:var(--tb-display);font-size:20px}
.tb-hint{margin:0;font-size:13px;opacity:.7;text-align:center}
.tb-codebox{display:flex;align-items:center;justify-content:center;gap:12px}
.tb-codebig{font-family:var(--tb-display);font-size:38px;letter-spacing:.3em;padding:4px 6px 4px 18px;background:linear-gradient(180deg,#fff,#d8e6ff);color:#0a1430;transform:skewX(-10deg);box-shadow:0 0 26px rgba(120,180,255,.5)}
.tb-teams{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tb-team{padding:12px;position:relative;overflow:hidden}
.tb-team.blue{background:linear-gradient(160deg,rgba(31,111,255,.35),rgba(31,111,255,.08));border-top:3px solid #4aa2ff}
.tb-team.orange{background:linear-gradient(160deg,rgba(255,106,16,.32),rgba(255,106,16,.07));border-top:3px solid #ffa040}
.tb-team h3{margin:0 0 8px;font-family:var(--tb-display);font-weight:400;font-size:18px;letter-spacing:.1em}
.tb-team ul{margin:0 0 10px;padding:0;list-style:none}
.tb-team li{display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:6px;background:rgba(0,0,0,.35);font-weight:700;font-size:14px;transform:skewX(-8deg)}
.tb-team li>*{transform:skewX(8deg)}
.tb-team li.bot{opacity:.5}.tb-team li i{font-style:normal;opacity:.7;font-size:12px;margin-left:auto}
.tb-team button{width:100%}
.tb-keys{font-size:13px}.tb-keys summary{cursor:pointer;font-weight:700;letter-spacing:.18em;font-size:11px;opacity:.75;padding:6px 0;list-style:none}
.tb-keys summary::before{content:"▸ "}.tb-keys[open] summary::before{content:"▾ "}
.tb-keys div{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin-top:6px;background:rgba(0,0,0,.35);padding:12px}
.tb-keys b{white-space:nowrap;font-size:12px;background:rgba(255,255,255,.1);padding:2px 7px;border-radius:4px;align-self:start}.tb-keys span{opacity:.85}
/* end screen */
.tb-result{font-family:var(--tb-display);font-size:clamp(46px,8vw,80px);line-height:1;text-align:center;font-style:italic;margin:4px 0 0;animation:tbResult .7s cubic-bezier(.2,1.6,.4,1) both}
@keyframes tbResult{0%{transform:scale(2.4);opacity:0}100%{transform:scale(1);opacity:1}}
.tb-result.win{background:linear-gradient(180deg,#fff,#7dffb0);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 24px rgba(80,255,160,.5))}
.tb-result.lose{background:linear-gradient(180deg,#fff,#ff8080);-webkit-background-clip:text;background-clip:text;color:transparent}
.tb-final{display:flex;justify-content:center;align-items:center;gap:18px;font-family:var(--tb-display);font-size:58px;line-height:1}
.tb-final .blue{color:#6eb0ff;text-shadow:0 0 20px #1f6fff}.tb-final .orange{color:#ffac60;text-shadow:0 0 20px #ff6a10}.tb-final span{opacity:.4;font-size:40px}
.tb-mvp{display:flex;align-items:center;gap:12px;justify-content:center;background:linear-gradient(90deg,transparent,rgba(255,200,60,.25),transparent);padding:8px;font-weight:700}
.tb-mvp b{font-family:var(--tb-display);font-weight:400;color:#ffd36a;letter-spacing:.2em;font-size:13px}
.tb-mvp span{font-size:18px}
.tb-stats{width:100%;border-collapse:separate;border-spacing:0 4px;font-size:14px}
.tb-stats th{opacity:.55;font-size:10px;letter-spacing:.2em;font-weight:700;text-align:center;padding:0 4px}
.tb-stats td{padding:8px 6px;text-align:center;font-weight:700;background:rgba(255,255,255,.05);font-variant-numeric:tabular-nums}
.tb-stats td:first-child{text-align:left;border-left:4px solid}
.tb-stats tr.blue td:first-child{border-color:#4aa2ff}.tb-stats tr.orange td:first-child{border-color:#ffa040}
.tb-stats tr.me td{background:rgba(255,255,255,.12)}
.tb-stats td.pts{color:#ffd36a}
.tb-row{display:flex;gap:10px}.tb-row>*{flex:1}
/* touch */
.tb-joy{position:absolute;left:24px;bottom:24px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.04),rgba(255,255,255,.12));border:2px solid rgba(255,255,255,.22);pointer-events:auto;touch-action:none;box-shadow:inset 0 0 30px rgba(0,0,0,.4)}
.tb-joy i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9fb4d8);box-shadow:0 4px 14px rgba(0,0,0,.5)}
.tb-btns{position:absolute;right:170px;bottom:18px;width:190px;height:150px}
.tb-btns button{position:absolute;width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,.35);background:radial-gradient(circle at 40% 30%,rgba(255,255,255,.18),rgba(10,14,30,.6));color:#fff;font-weight:700;font-size:12px;letter-spacing:.08em;touch-action:none;box-shadow:0 6px 16px rgba(0,0,0,.4)}
.tb-btns .j{right:0;bottom:0;border-color:#7cc0ff}.tb-btns .b{right:94px;bottom:30px;border-color:#ffb020;color:#ffd27a}.tb-btns .r{right:16px;bottom:94px;width:58px;height:58px;font-size:10px}
.tb-btns button.on{transform:scale(.92);background:radial-gradient(circle,rgba(255,255,255,.45),rgba(255,255,255,.12))}
@media (max-width:640px){.tb-team-s{min-width:64px;height:44px}.tb-team-s b{font-size:24px}.tb-mid{min-width:84px}.tb-clock{font-size:19px}.tb-boost{width:104px;height:104px;right:10px}.tb-boost b{top:30px;font-size:30px}.tb-boost small{top:64px}.tb-speed{display:none}.tb-btns{right:110px}.tb-ic button span{display:none}}
@media (max-height:520px){.tb-joy{width:110px;height:110px;left:14px;bottom:12px}.tb-joy i{width:46px;height:46px;margin:-23px 0 0 -23px}.tb-btns{bottom:6px;right:104px;transform:scale(.8);transform-origin:right bottom}.tb-boost{width:96px;height:96px;right:10px;bottom:8px}.tb-boost b{top:27px;font-size:27px}.tb-boost small{top:58px;font-size:8px}.tb-speed{display:none}.tb-team-s{height:40px;min-width:62px}.tb-team-s b{font-size:22px}.tb-team-s small{font-size:8px}.tb-clock{font-size:18px}.tb-mid{min-width:80px}.tb-score{top:6px}.tb-ic{top:6px}.tb-ic button{height:34px;min-width:34px;padding:0 8px}.tb-ic button span{display:none}.tb-main-l{padding:14px 5vw;gap:7px}.tb-logo{font-size:46px}.tb-tag{margin-bottom:4px}.tb-item{padding:9px 16px}.tb-item b{font-size:19px}.tb-panel{padding:14px;gap:8px}.tb-goalwrap{top:12%}}
`;
