import { CSS as TB } from "../turboball/ui";

export const CSS = TB + `
.tk .tb-logo{filter:drop-shadow(0 6px 0 rgba(0,0,0,.5)) drop-shadow(0 0 30px rgba(255,60,130,.45))}
.tk .tb-logo .a{background:linear-gradient(180deg,#fff 20%,#ffb3d0)}
.tk .tb-logo .b{background:linear-gradient(180deg,#fff2a8 10%,#ff8a00 70%,#ff3d7f)}
.tk .tb-logo .a,.tk .tb-logo .b{-webkit-background-clip:text;background-clip:text;color:transparent}
.tk .tb-item.hot{background:linear-gradient(90deg,#ff3d7f,rgba(255,61,127,.25));border-left-color:#ffc0d8}
.tk .tb-item.hot2{background:linear-gradient(90deg,#ff8a00,rgba(255,138,0,.25));border-left-color:#ffe0a0}
.tk .tb-item.hot3{background:linear-gradient(90deg,#1f6fff,rgba(31,111,255,.25));border-left-color:#9fd0ff}
.tk .tb-item:hover{background:linear-gradient(90deg,rgba(255,61,127,.5),rgba(255,61,127,.05));border-left-color:#ff9cc2}
.tk .tb-go{background:linear-gradient(90deg,#ff3d7f,#ff8a00);box-shadow:0 6px 0 #8a1f3f,0 0 30px rgba(255,80,120,.5)}
.tk .tb-go.orange{background:linear-gradient(90deg,#1f6fff,#46b0ff);box-shadow:0 6px 0 #0a3592,0 0 30px rgba(60,150,255,.5)}
/* driver picker */
.tk-drivers{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.tk-drivers button{position:relative;border:2px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.25));color:#fff;padding:8px 4px 6px;border-radius:8px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform .12s}
.tk-drivers button i{width:34px;height:34px;border-radius:50%;box-shadow:inset 0 -6px 0 rgba(0,0,0,.25),0 0 0 3px rgba(255,255,255,.15);position:relative;overflow:hidden}
.tk-drivers button i::after{content:"";position:absolute;left:5px;right:5px;top:11px;height:10px;border-radius:6px;background:rgba(10,15,28,.85)}
.tk-drivers button span{font-family:var(--tb-display);font-size:14px;font-weight:400}
.tk-drivers button small{font-size:9px;opacity:.65;letter-spacing:.06em}
.tk-drivers button.on{border-color:#fff;transform:translateY(-2px);box-shadow:0 0 18px rgba(255,255,255,.35);background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(0,0,0,.2))}
.tk-tracks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tk-tracks button{border:2px solid rgba(255,255,255,.14);border-radius:8px;padding:0;overflow:hidden;color:#fff;font-weight:700;background:#111;display:flex;flex-direction:column;text-align:left}
.tk-tracks button b{display:block;height:46px;background-size:cover}
.tk-tracks button span{padding:6px 8px;font-family:var(--tb-display);font-weight:400;font-size:14px}
.tk-tracks button.on{border-color:#fff;box-shadow:0 0 18px rgba(255,255,255,.35)}
.tk-tracks .beach b{background:linear-gradient(160deg,#3d9bff,#a9dcff 50%,#e9cf94 52%,#1aa8d8)}
.tk-tracks .city b{background:linear-gradient(160deg,#05040f,#4a1a6a 55%,#00e5ff 57%,#ff2bd6 60%,#121424 63%)}
.tk-tracks .volcano b{background:linear-gradient(160deg,#1a0605,#e2531a 50%,#ff6a10 54%,#2a1d1a 58%)}
/* hud */
.tk-itemslot{position:absolute;left:16px;top:14px;width:96px;height:96px;border-radius:20px;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.22),rgba(10,12,28,.8));border:4px solid #fff;box-shadow:0 0 0 3px rgba(0,0,0,.4),0 0 24px rgba(255,120,200,.45);display:flex;align-items:center;justify-content:center;font-size:50px;line-height:1}
.tk-itemslot.roll{animation:tkRoll .12s infinite alternate}
.tk-itemslot.small{font-size:24px;letter-spacing:-4px}
@keyframes tkRoll{to{transform:scale(1.06) rotate(3deg)}}
.tk-itemslot em{position:absolute;right:-8px;bottom:-8px;background:#ff3d7f;border-radius:10px;padding:2px 7px;font-style:normal;font-family:var(--tb-display);font-size:16px}
.tk-lap{position:absolute;right:16px;top:14px;text-align:right;text-shadow:0 3px 0 rgba(0,0,0,.5),0 0 12px rgba(0,0,0,.6)}
.tk-lap b{font-family:var(--tb-display);font-size:30px;font-weight:400;font-style:italic;display:block;line-height:1}
.tk-lap small{font-size:11px;letter-spacing:.25em;font-weight:700;opacity:.8}
.tk-lap span{display:block;font-family:var(--tb-display);font-size:18px;opacity:.9;font-variant-numeric:tabular-nums;margin-top:4px}
.tk-pos{position:absolute;right:18px;bottom:14px;font-family:var(--tb-display);font-style:italic;line-height:.8;text-align:right}
.tk-pos b{font-size:96px;font-weight:400;background:linear-gradient(180deg,#fff 15%,#ffd23f 55%,#ff8a00);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 5px 0 rgba(0,0,0,.55))}
.tk-pos b.mid{background:linear-gradient(180deg,#fff 15%,#9fd8ff 60%,#1f6fff);-webkit-background-clip:text;background-clip:text}
.tk-pos b.low{background:linear-gradient(180deg,#fff 15%,#ffb3c4 60%,#e63946);-webkit-background-clip:text;background-clip:text}
.tk-pos b.pop{animation:tbScorePop .5s cubic-bezier(.2,1.8,.4,1)}
.tk-pos small{font-size:30px;opacity:.85;text-shadow:0 3px 0 rgba(0,0,0,.5)}
.tk-spd{position:absolute;right:20px;bottom:118px;font-family:var(--tb-display);font-size:18px;opacity:.75;text-shadow:0 2px 6px #000}
.tk-map{position:absolute;left:14px;bottom:14px;width:170px;height:170px;opacity:.92;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}
.tk-map path{fill:none;stroke:rgba(255,255,255,.85);stroke-width:7;stroke-linejoin:round}
.tk-map path.in{stroke:rgba(20,22,40,.85);stroke-width:4}
.tk-map path.sc{stroke:#ffd23f;stroke-width:3;stroke-dasharray:5 4;opacity:.9}
.tk-map circle{stroke:#000;stroke-width:1.5}
.tk-map circle.me{stroke:#fff;stroke-width:3}
.tk-banner{position:absolute;top:26%;left:0;right:0;text-align:center;pointer-events:none}
.tk-banner b{display:inline-block;font-family:var(--tb-display);font-weight:400;font-style:italic;font-size:clamp(46px,9vw,100px);line-height:1;background:linear-gradient(180deg,#fff 20%,#ffd23f 60%,#ff3d7f);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 0 rgba(0,0,0,.5));animation:tbGoalIn 2.6s cubic-bezier(.2,1.5,.3,1) both}
.tk-banner b.fin{animation:tbResult .7s cubic-bezier(.2,1.6,.4,1) both}
.tk-banner span{display:block;margin-top:8px;font-weight:700;font-size:18px;letter-spacing:.08em;text-shadow:0 2px 6px #000}
.tk-wrong{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);font-family:var(--tb-display);font-size:34px;color:#ff5a5a;background:rgba(0,0,0,.6);padding:8px 20px;display:none;animation:tbBlink .8s steps(2) infinite}
.tk-fx{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;background:repeating-conic-gradient(from 0deg at 50% 55%,rgba(255,255,255,.0) 0deg 4deg,rgba(255,255,255,.16) 4deg 4.6deg);-webkit-mask:radial-gradient(ellipse at 50% 55%,transparent 32%,#000 75%);mask:radial-gradient(ellipse at 50% 55%,transparent 32%,#000 75%)}
.tk-res td.tm{font-family:var(--tb-display);font-weight:400}
.tk-res td:first-child{border-left:4px solid var(--c)}
.tk-res td.p{width:34px;font-family:var(--tb-display);font-weight:400;font-size:18px}
.tk-res tr.p1 td.p{color:#ffd23f}.tk-res tr.p2 td.p{color:#dfe6f0}.tk-res tr.p3 td.p{color:#e3a06a}
.tk-place{font-family:var(--tb-display);font-style:italic;text-align:center;font-size:clamp(60px,10vw,96px);line-height:1;margin:0;background:linear-gradient(180deg,#fff 15%,#ffd23f 55%,#ff8a00);-webkit-background-clip:text;background-clip:text;color:transparent;animation:tbResult .7s cubic-bezier(.2,1.6,.4,1) both}
/* touch */
.tk-steer{position:absolute;left:0;bottom:0;width:46%;height:62%;pointer-events:auto;touch-action:none}
.tk-steer i{position:absolute;left:24px;bottom:28px;width:170px;height:70px;border-radius:40px;background:linear-gradient(90deg,rgba(255,255,255,.14),rgba(255,255,255,.04),rgba(255,255,255,.14));border:2px solid rgba(255,255,255,.22)}
.tk-steer i::after{content:"";position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9fb4d8);box-shadow:0 4px 14px rgba(0,0,0,.5);transform:translateX(var(--x,0px))}
.tk-btns{position:absolute;right:130px;bottom:16px;width:220px;height:170px}
.tk-btns button{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.35);background:radial-gradient(circle at 40% 30%,rgba(255,255,255,.18),rgba(10,14,30,.6));color:#fff;font-weight:700;font-size:12px;letter-spacing:.06em;touch-action:none;box-shadow:0 6px 16px rgba(0,0,0,.4)}
.tk-btns .d{right:0;bottom:0;width:96px;height:96px;border-color:#ff8ab8}
.tk-btns .i{right:104px;bottom:34px;width:78px;height:78px;border-color:#ffd23f;color:#ffe48a}
.tk-btns .b{right:24px;bottom:108px;width:56px;height:56px;font-size:10px}
.tk-btns button.on{transform:scale(.92);background:radial-gradient(circle,rgba(255,255,255,.45),rgba(255,255,255,.12))}
@media (max-width:640px){.tk-itemslot{width:70px;height:70px;font-size:36px;border-radius:14px}.tk-pos b{font-size:64px}.tk-pos small{font-size:20px}.tk-map{width:120px;height:120px}.tk-lap b{font-size:22px}.tk-spd{display:none}.tk-drivers{grid-template-columns:repeat(4,1fr)}.tk-btns{right:96px}}
@media (max-height:520px){.tk-itemslot{width:64px;height:64px;font-size:32px;top:8px;left:10px;border-width:3px}.tk-pos b{font-size:50px}.tk-pos{bottom:auto;right:auto;left:14px;top:80px;text-align:left}.tk-pos small{font-size:16px}.tk-map{width:92px;height:92px;left:auto;right:12px;top:92px;bottom:auto}.tk-lap{top:6px;right:62px}.tk-lap b{font-size:20px}.tk-lap span{font-size:14px}.tk-spd{display:none}.tk-btns{transform:scale(.8);transform-origin:right bottom;right:86px;bottom:4px}.tk-steer i{left:14px;bottom:14px}.tk-drivers button{padding:4px}.tk-drivers button i{width:24px;height:24px}.tk-drivers button i::after{top:7px;height:7px}.tk-tracks button b{height:28px}}
`;
