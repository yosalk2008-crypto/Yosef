export const CSS = `
.tb-root{position:absolute;inset:0;overflow:hidden;background:#05070f;font-family:Arial,Helvetica,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:none}
.tb-root>canvas{display:block;width:100%;height:100%}
.tb-hud{position:absolute;inset:0;pointer-events:none}
.tb-hud button{pointer-events:auto;font-family:inherit;cursor:pointer;touch-action:manipulation}
.tb-score{position:absolute;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;border-radius:10px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.5);font-weight:900}
.tb-score b{min-width:54px;text-align:center;font-size:30px;line-height:46px;padding:0 10px;font-style:italic}
.tb-sb{background:linear-gradient(180deg,#3a8cff,#1650c9)}.tb-so{background:linear-gradient(180deg,#ff9a3a,#d9560a)}
.tb-clock{background:rgba(8,10,20,.88);font-size:24px;line-height:46px;padding:0 18px;letter-spacing:.04em;font-variant-numeric:tabular-nums}
.tb-msg{position:absolute;top:72px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);padding:7px 16px;border-radius:8px;font-weight:700;font-size:15px;opacity:0;transition:opacity .4s;white-space:nowrap}
.tb-big{position:absolute;top:28%;left:0;right:0;text-align:center;display:none}
.tb-goal{font-size:clamp(70px,14vw,170px);font-weight:900;font-style:italic;letter-spacing:.04em;animation:tbPop .5s cubic-bezier(.2,1.6,.4,1)}
.tb-goal.blue{color:#7cb6ff;text-shadow:0 0 30px #1f6fff,0 6px 0 #0a2a6a}.tb-goal.orange{color:#ffbf7a;text-shadow:0 0 30px #ff6a10,0 6px 0 #6a2a05}
.tb-big small{display:block;font-size:22px;font-weight:800;margin-top:4px;text-shadow:0 2px 8px #000}
.tb-count{font-size:clamp(80px,16vw,180px);font-weight:900;font-style:italic;text-shadow:0 0 30px rgba(120,180,255,.9),0 6px 0 rgba(0,0,0,.4);animation:tbPop .4s ease-out}
.tb-count.go{color:#7dffa8}
@keyframes tbPop{from{transform:scale(2.2);opacity:0}to{transform:scale(1);opacity:1}}
.tb-boost{position:absolute;right:22px;bottom:22px;width:118px;height:118px}
.tb-boost svg{width:100%;height:100%;transform:rotate(-90deg)}
.tb-boost circle{fill:none;stroke-width:11}.tb-bg{stroke:rgba(0,0,0,.55)}.tb-fg{stroke:#ffb020;stroke-dasharray:264;stroke-dashoffset:264;filter:drop-shadow(0 0 6px #ff9a00);transition:stroke-dashoffset .1s}
.tb-boost b{position:absolute;inset:0;display:grid;place-items:center;font-size:36px;font-weight:900;font-style:italic;text-shadow:0 2px 6px #000}
.tb-cam,.tb-pause{position:absolute;top:14px;border:1px solid rgba(255,255,255,.25);background:rgba(8,10,20,.7);color:#fff;border-radius:8px;font-weight:800;font-size:13px;padding:8px 12px}
.tb-cam{right:14px}.tb-cam.off{opacity:.6}.tb-pause{left:14px}
.tb-menu{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(5,8,20,.35),rgba(3,4,10,.8));pointer-events:auto;padding:14px;overflow:auto}
.tb-card{width:min(420px,100%);background:linear-gradient(180deg,rgba(18,24,48,.92),rgba(8,10,22,.95));border:1px solid rgba(120,160,255,.25);border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:10px;max-height:100%;overflow:auto}
.tb-card.wide{width:min(620px,100%)}
.tb-title{margin:0;text-align:center;font-size:clamp(44px,9vw,64px);font-weight:900;font-style:italic;letter-spacing:.02em;background:linear-gradient(180deg,#fff,#9cc6ff);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #0b2a6b)}
.tb-title span{background:linear-gradient(180deg,#ffd29a,#ff7a12);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #6a2a05)}
.tb-sub{margin:-6px 0 6px;text-align:center;opacity:.75;font-weight:700;font-size:14px}
.tb-card h2{margin:0 0 4px;font-size:26px;font-weight:900;font-style:italic;text-align:center}
.tb-card h2.win{color:#7dffa8}.tb-card h2.lose{color:#ff8a8a}
.tb-card button{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:11px 14px;font-weight:800;font-size:15px}
.tb-card button:hover{background:rgba(255,255,255,.16)}
.tb-card button.tb-main{border:0;background:linear-gradient(90deg,#1f6fff,#3aa0ff);font-size:18px;padding:14px;font-style:italic;box-shadow:0 6px 0 #0b3a9e}
.tb-card button.tb-main.alt{background:linear-gradient(90deg,#ff6a10,#ffa040);box-shadow:0 6px 0 #8a3405}
.tb-card button[disabled]{opacity:.5}
.tb-seg{display:flex;gap:6px}.tb-seg button{flex:1;padding:9px 6px}.tb-seg button.on{background:#fff;color:#0a1430}
.tb-name{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;opacity:.9}
.tb-name input,.tb-code{border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;border-radius:8px;padding:10px;font-size:16px;font-weight:700;pointer-events:auto}
.tb-join{display:flex;gap:8px}.tb-code{flex:1;text-transform:uppercase;letter-spacing:.2em;text-align:center}
.tb-hint{margin:0;font-size:13px;opacity:.7;text-align:center}
.tb-codebig{font-family:monospace;letter-spacing:.2em;background:#fff;color:#0a1430;border-radius:6px;padding:0 8px;font-style:normal}
.tb-teams{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tb-team{border-radius:10px;padding:10px}.tb-team.blue{background:rgba(31,111,255,.22);border:1px solid rgba(90,160,255,.5)}.tb-team.orange{background:rgba(255,106,16,.2);border:1px solid rgba(255,160,90,.5)}
.tb-team h3{margin:0 0 6px;font-size:16px;font-style:italic}.tb-team ul{margin:0 0 8px;padding:0;list-style:none;font-weight:700;font-size:14px}.tb-team li{padding:3px 0}.tb-team li.bot{opacity:.55}.tb-team button{width:100%;padding:7px}
.tb-final{display:flex;justify-content:center;align-items:center;gap:14px;font-size:54px;font-weight:900;font-style:italic}
.tb-final .blue{color:#6eaaff}.tb-final .orange{color:#ffa860}
.tb-stats{width:100%;border-collapse:collapse;font-size:14px}.tb-stats th{opacity:.6;font-size:12px;text-align:center}.tb-stats td{padding:6px;text-align:center;font-weight:700}.tb-stats td:first-child{text-align:left}
.tb-stats tr.blue td:first-child{color:#8ec2ff}.tb-stats tr.orange td:first-child{color:#ffbe85}
.tb-keys{font-size:13px}.tb-keys summary{cursor:pointer;font-weight:800;opacity:.85;padding:4px 0}.tb-keys div{display:grid;grid-template-columns:auto 1fr;gap:5px 10px;margin-top:6px}.tb-keys b{white-space:nowrap}.tb-keys span{opacity:.8}
.tb-joy{position:absolute;left:24px;bottom:24px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.25);pointer-events:auto;touch-action:none}
.tb-joy i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(255,255,255,.55)}
.tb-btns{position:absolute;right:150px;bottom:18px;display:grid;grid-template-columns:repeat(2,74px);gap:10px}
.tb-btns button{height:62px;border-radius:14px;border:2px solid rgba(255,255,255,.3);background:rgba(10,14,30,.55);color:#fff;font-weight:900;font-size:13px;touch-action:none}
.tb-btns button.on{background:rgba(255,255,255,.35)}.tb-btns .b{border-color:#ffb020;color:#ffd27a}.tb-btns .j{border-color:#7cb6ff}.tb-btns .g{border-color:#7dffa8}
@media (max-width:640px){.tb-score b{font-size:22px;line-height:38px;min-width:42px}.tb-clock{font-size:18px;line-height:38px;padding:0 10px}.tb-boost{width:92px;height:92px;right:12px;bottom:auto;top:62px}.tb-boost b{font-size:26px}.tb-btns{right:12px}}
@media (max-height:520px){.tb-joy{width:104px;height:104px;left:14px;bottom:12px}.tb-joy i{width:44px;height:44px;margin:-22px 0 0 -22px}.tb-btns{bottom:10px;right:104px;grid-template-columns:repeat(2,64px);gap:7px}.tb-btns button{height:46px;font-size:12px}.tb-boost{width:84px;height:84px;right:10px;bottom:10px;top:auto}.tb-boost b{font-size:24px}.tb-score b{font-size:20px;line-height:34px;min-width:40px}.tb-clock{font-size:17px;line-height:34px}.tb-cam,.tb-pause{top:8px;padding:6px 9px;font-size:12px}.tb-score{top:8px}.tb-card{padding:14px;gap:7px}.tb-title{font-size:40px}.tb-card button.tb-main{padding:10px;font-size:16px}}
`;
