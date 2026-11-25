export const CSS = `
.sb-root{position:relative;width:100%;height:100%;overflow:hidden;background:#120a1c;color:#fff;font-family:"Helvetica Neue",Arial,sans-serif;user-select:none;-webkit-user-select:none}
.sb-gl{position:absolute;inset:0;display:block;cursor:crosshair}
.sb-load{position:absolute;inset:0;z-index:40;transition:opacity .8s}
.sb-load.done{opacity:0;pointer-events:none}
.sb-load canvas{position:absolute;inset:0;width:100%;height:100%}
.sb-lbox{position:absolute;left:50%;bottom:7%;transform:translateX(-50%);width:min(420px,80%);text-align:center}
.sb-bar{height:5px;background:rgba(255,255,255,.18);border-radius:3px;overflow:hidden}
.sb-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff3b8b,#ffb347);transition:width .3s}
.sb-ltxt{margin-top:10px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.85);text-shadow:0 1px 4px #000}
.sb-hud{position:absolute;inset:0;pointer-events:none;z-index:10}
.sb-tr{position:absolute;right:22px;top:18px;text-align:right;text-shadow:0 2px 6px rgba(0,0,0,.8)}
.sb-money{font-size:30px;font-weight:800;color:#7dffa0;letter-spacing:.02em;font-family:"Arial Black",Arial,sans-serif}
.sb-stars{font-size:26px;letter-spacing:2px;color:rgba(255,255,255,.22);margin-top:2px}
.sb-stars i{font-style:normal}.sb-stars i.on{color:#fff}.sb-stars i.dim{color:rgba(255,255,255,.45)}
.sb-bars{width:190px;height:9px;margin:8px 0 0 auto;background:rgba(0,0,0,.45);position:relative;border:1px solid rgba(255,255,255,.25)}
.sb-bars i{position:absolute;left:0;top:0;height:100%}.sb-bars .hp{background:#5bd27a}.sb-bars .ar{background:#4aa8ff;height:3px;top:auto;bottom:0}
.sb-weap{margin-top:8px;font-size:18px;font-weight:700;white-space:nowrap}.sb-weap span{opacity:.6;font-size:14px}
.sb-mm{position:absolute;left:22px;bottom:22px;width:220px;height:220px;border-radius:50%;border:3px solid rgba(0,0,0,.6);box-shadow:0 4px 18px rgba(0,0,0,.5)}
.sb-mm canvas{width:100%;height:100%;border-radius:50%}
.sb-street{position:absolute;left:258px;bottom:28px;font-size:20px;font-weight:700;font-style:italic;text-shadow:0 2px 6px #000;color:#fff}
.sb-cross{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;display:none;border-radius:50%;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 4px #000}
.sb-cross:after{content:"";position:absolute;left:50%;top:50%;width:3px;height:3px;margin:-1.5px 0 0 -1.5px;border-radius:50%;background:#fff}
.sb-cross.aim{width:10px;height:10px;margin:-5px 0 0 -5px;border-color:#ff5c7a}
.sb-prompt{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);font-size:17px;font-weight:700;padding:6px 14px;background:rgba(0,0,0,.55);border-radius:4px}
.sb-prompt:empty{display:none}
.sb-toasts{position:absolute;left:22px;top:18px;font-size:15px;font-weight:700;text-shadow:0 2px 5px #000;line-height:1.7}
.sb-toasts div{background:rgba(0,0,0,.5);padding:2px 10px;border-radius:3px;margin-bottom:4px;display:table}
.sb-banner{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(0,0,0,.45),transparent 60%)}
.sb-banner b{font-size:clamp(40px,8vw,84px);font-family:"Arial Black",Arial,sans-serif;letter-spacing:.04em;text-shadow:0 4px 18px #000}
.sb-banner span{font-size:18px;margin-top:6px;text-shadow:0 2px 6px #000}
.sb-hint{position:absolute;right:22px;bottom:24px;font-size:13px;opacity:.75;text-shadow:0 1px 4px #000}
.sb-ov{position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(40,10,60,.55),rgba(10,4,20,.85));padding:16px}
.sb-card{max-width:620px;width:100%;background:rgba(14,8,24,.88);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:26px 28px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
.sb-title{font-family:"Arial Black",Arial,sans-serif;font-size:clamp(40px,7vw,64px);font-style:italic;line-height:.95;letter-spacing:-.01em;background:linear-gradient(180deg,#ffd36e 0%,#ff7a59 45%,#ff2f8e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.5))}
.sb-title small{display:block;font-size:.26em;font-style:normal;letter-spacing:.5em;margin-top:8px;color:#9ff1ff;-webkit-text-fill-color:#9ff1ff}
.sb-card p{color:#d8d2e6;line-height:1.55;font-size:14.5px}
.sb-keys{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:13.5px;margin:14px 0 18px;color:#eee}
.sb-keys b{color:#ffcf6e;white-space:nowrap}
.sb-btn{pointer-events:auto;border:0;border-radius:6px;background:linear-gradient(90deg,#ff2f8e,#ff8a3d);color:#fff;font:800 17px "Arial Black",Arial,sans-serif;letter-spacing:.08em;padding:13px 28px;cursor:pointer;text-transform:uppercase;box-shadow:0 6px 20px rgba(255,47,142,.35)}
.sb-btn:hover{filter:brightness(1.1)}
.sb-small{font-size:11.5px!important;opacity:.6;margin-bottom:0}
.sb-warn{color:#ffcf6e!important}
.sb-root,.sb-gl{touch-action:none;-webkit-touch-callout:none}
.sb-root.sb-fake{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:2147483000}
.sb-root:fullscreen{width:100vw;height:100vh}
.sb-tl{position:absolute;left:14px;top:14px;display:flex;gap:8px;pointer-events:auto}
.sb-ib{width:44px;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.35);background:rgba(10,6,20,.55);color:#fff;font-size:20px;font-weight:800;cursor:pointer;backdrop-filter:blur(4px)}
.sb-ib:hover{background:rgba(255,47,142,.6)}
.sb-touch .sb-toasts{left:50%;transform:translateX(-50%);top:12px;text-align:center}
.sb-touch .sb-toasts div{margin:0 auto 4px}
.sb-touch .sb-mm{left:14px;right:auto;bottom:auto;top:66px;width:104px;height:104px}
.sb-touch .sb-street{left:126px;top:72px;bottom:auto;font-size:13px}
.sb-touch .sb-hint{display:none}
.sb-touch .sb-prompt{bottom:auto;top:62%;font-size:15px}
.sb-touch .sb-tr{top:10px;right:14px}.sb-touch .sb-money{font-size:22px}.sb-touch .sb-stars{font-size:20px}.sb-touch .sb-bars{width:130px}.sb-touch .sb-weap{font-size:14px}
.sb-joyzone{position:absolute;left:0;bottom:0;width:46%;height:72%;pointer-events:auto;touch-action:none}
.sb-joy{position:absolute;left:28px;bottom:28px;width:140px;height:140px;border-radius:50%;border:2px solid rgba(255,255,255,.45);background:radial-gradient(circle,rgba(255,255,255,.12),rgba(10,6,20,.35));transition:opacity .2s;opacity:.75}
.sb-joy.on{opacity:1;bottom:auto}
.sb-joy i{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#d9d4e8 55%,#9a92b5);box-shadow:0 4px 14px rgba(0,0,0,.5)}
.sb-b{position:absolute;pointer-events:auto;touch-action:none;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:rgba(10,6,20,.5);color:#fff;font:800 14px Arial,sans-serif;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.sb-b.on{background:rgba(255,47,142,.75);border-color:#fff;transform:scale(.94)}
.sb-jump{right:26px;bottom:28px;width:96px;height:96px;font-size:15px;letter-spacing:.06em}
.sb-shoot{right:136px;bottom:40px;width:78px;height:78px;font-size:30px;background:rgba(200,20,50,.45)}
.sb-enter{right:40px;bottom:140px;width:64px;height:64px;font-size:26px}
.sb-enter.hot{background:rgba(40,200,255,.5);border-color:#fff}
.sb-wsw{right:118px;bottom:132px;width:52px;height:52px;font-size:22px}
.sb-coin{display:inline-block;width:.8em;height:.8em;margin-right:.3em;border-radius:50%;vertical-align:-.04em;background:radial-gradient(circle at 35% 30%,#fff6b0,#ffcc33 45%,#c58a00);box-shadow:inset 0 0 0 2px rgba(150,90,0,.6)}
.sb-money{color:#ffd24a!important}
.sb-hot{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto}
.sb-hot button{position:relative;width:74px;height:74px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:rgba(18,14,28,.68);color:#fff;font:700 11px Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none}
.sb-hot button i{font-style:normal;font-size:28px;line-height:1}
.sb-hot button small{position:absolute;left:6px;top:4px;font-size:11px;opacity:.7}
.sb-hot button.on{border-color:#fff;background:rgba(80,160,255,.55);box-shadow:0 0 0 2px rgba(80,160,255,.6),0 4px 14px rgba(0,0,0,.5)}
.sb-gun{display:inline-block;width:34px;height:22px;background:linear-gradient(#d9dde3,#d9dde3) 0 0/30px 8px no-repeat,linear-gradient(#d9dde3,#d9dde3) 8px 6px/8px 15px no-repeat;transform:skewX(-8deg)}
.sb-gun.smg{background:linear-gradient(#d9dde3,#d9dde3) 0 2px/34px 8px no-repeat,linear-gradient(#d9dde3,#d9dde3) 8px 8px/7px 13px no-repeat,linear-gradient(#d9dde3,#d9dde3) 18px 8px/6px 11px no-repeat}
.sb-acts{position:absolute;inset:0;pointer-events:none}
.sb-act{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;white-space:nowrap;border:2px solid #fff;border-radius:999px;background:rgba(20,120,255,.85);color:#fff;font:800 15px Arial,sans-serif;padding:9px 16px;box-shadow:0 4px 16px rgba(0,0,0,.45);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;animation:sbpop .18s ease-out}
.sb-act.first{background:rgba(255,47,142,.9)}
.sb-act.off{background:rgba(40,40,50,.8);border-color:rgba(255,255,255,.4);font-weight:700}
@keyframes sbpop{from{transform:translate(-50%,-50%) scale(.6);opacity:0}}
.sb-shop{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,3,12,.6);pointer-events:auto;padding:12px;z-index:5}
.sb-shopcard{width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;background:rgba(14,10,24,.96);border:1px solid rgba(255,255,255,.18);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden}
.sb-shophead{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(90deg,rgba(56,230,255,.18),transparent)}
.sb-shophead>div{flex:1}.sb-shophead b{display:block;font:900 20px "Arial Black",Arial,sans-serif;letter-spacing:.04em}.sb-shophead small{opacity:.7;font-size:12px}
.sb-gold{font:800 20px Arial,sans-serif;color:#ffd24a}
.sb-shophead button{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font-size:18px;cursor:pointer}
.sb-shoplist{overflow:auto;padding:4px 18px 10px}
.sb-tier{margin:14px 0 6px;font:800 12px Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#38e6ff}
.sb-carrow{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.sb-sw{width:34px;height:20px;border-radius:5px;flex:none;box-shadow:inset 0 -6px 8px rgba(0,0,0,.35)}
.sb-cn{flex:1;min-width:0}.sb-cn b{display:block;font-size:15px}.sb-cn small{opacity:.65;font-size:12px}
.sb-carrow button{flex:none;border:0;border-radius:8px;padding:9px 14px;font:800 14px Arial,sans-serif;background:linear-gradient(90deg,#ff2f8e,#ff8a3d);color:#fff;cursor:pointer;touch-action:manipulation}
.sb-carrow button[disabled]{background:rgba(255,255,255,.12);color:rgba(255,255,255,.45);cursor:not-allowed}
.sb-carrow button.own{background:rgba(56,230,255,.3)}
.sb-shopcard .sb-small{padding:0 18px 12px;margin:6px 0 0}
.sb-touch .sb-hot{bottom:10px}.sb-touch .sb-hot button{width:58px;height:58px}.sb-touch .sb-hot button i{font-size:22px}.sb-touch .sb-hot button b{display:none}
.sb-goal{display:none;position:absolute;left:50%;top:14px;transform:translateX(-50%);max-width:min(560px,70%);text-align:center;background:rgba(40,10,60,.72);border:1px solid rgba(214,150,255,.55);border-radius:10px;padding:8px 16px;font:700 15px Arial,sans-serif;text-shadow:0 1px 3px #000}
.sb-goal b{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#e0a8ff;margin-bottom:2px}
.sb-touch .sb-goal{top:auto;bottom:84px;font-size:13px;padding:6px 12px}
.sb-meter{height:6px;margin-top:6px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden}.sb-meter i{display:block;height:100%;background:linear-gradient(90deg,#b46bff,#ff2f8e)}
.sb-shoplist p{color:#d8d2e6;font-size:14px;line-height:1.5}
.sb-rot{display:none}
@media (orientation:portrait){.sb-touch .sb-rot{display:block;position:absolute;left:50%;top:64px;transform:translateX(-50%);background:rgba(255,47,142,.85);padding:6px 14px;border-radius:20px;font-weight:800;font-size:13px;white-space:nowrap}}
@media (max-width:700px){.sb-mm{width:130px;height:130px;left:12px;bottom:12px}.sb-street{left:150px;bottom:16px;font-size:15px}.sb-money{font-size:22px}.sb-tr{right:12px;top:10px}}
`;

/** Original loading-screen art: Miami sunset, ocean, art-deco skyline and palms, painted procedurally. */
export function paintLoading(c: HTMLCanvasElement) {
  const g = c.getContext("2d")!;
  const W = c.width, H = c.height, hz = H * 0.62;
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, "#1b0b3a"); sky.addColorStop(0.35, "#5a1a6e"); sky.addColorStop(0.68, "#e0407a"); sky.addColorStop(0.9, "#ff9a5a"); sky.addColorStop(1, "#ffd08a");
  g.fillStyle = sky; g.fillRect(0, 0, W, hz);
  // stars
  g.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 120; i++) { const x = (i * 9301 + 49297) % 233280 / 233280 * W, y = ((i * 7919) % 1000) / 1000 * hz * 0.45; g.fillRect(x, y, 1.5, 1.5); }
  // sun
  const sx = W * 0.5, sy = hz - H * 0.02, sr = Math.min(W, H) * 0.2;
  const sun = g.createLinearGradient(0, sy - sr, 0, sy + sr);
  sun.addColorStop(0, "#fff1a8"); sun.addColorStop(0.5, "#ffb35c"); sun.addColorStop(1, "#ff4f8a");
  g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.clip();
  g.fillStyle = sun; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 8; i++) { const y = sy - sr * 0.05 + i * sr * 0.13; g.fillRect(sx - sr, y, sr * 2, 2 + i * 1.6); }
  g.restore();
  g.globalCompositeOperation = "source-over";
  // skyline silhouettes (art-deco hotels with neon edges)
  const base = hz;
  let x = 0, k = 0;
  while (x < W) {
    const w = W * (0.035 + ((k * 37) % 10) / 400), h = H * (0.05 + ((k * 53) % 13) / 90) * (Math.abs(x - sx) < sr * 1.1 ? 0.55 : 1);
    g.fillStyle = "#24103a"; g.fillRect(x, base - h, w - 3, h);
    g.fillRect(x + w * 0.3, base - h - h * 0.12, w * 0.35, h * 0.12);
    g.strokeStyle = ["#ff3b9a", "#38e6ff", "#b46bff", "#ffb21f"][k % 4]; g.lineWidth = Math.max(1, W / 900); g.globalAlpha = 0.85;
    g.beginPath(); g.moveTo(x + 2, base - h + 4); g.lineTo(x + w - 5, base - h + 4); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = "rgba(255,214,150,0.55)";
    for (let wy = base - h + 12; wy < base - 6; wy += 9) for (let wx = x + 5; wx < x + w - 8; wx += 8) if (((wx * 13 + wy * 7) | 0) % 5 === 0) g.fillRect(wx, wy, 3, 4);
    x += w; k++;
  }
  // ocean with sun reflection
  const sea = g.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, "#5a2a6e"); sea.addColorStop(0.4, "#2a1748"); sea.addColorStop(1, "#0c0a1e");
  g.fillStyle = sea; g.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 26; i++) { const y = hz + 4 + i * i * (H - hz) / 700, w = sr * (1.4 - i / 26) * (0.6 + ((i * 17) % 7) / 10); g.fillStyle = `rgba(255,${170 - i * 3},${110 + i},${0.55 - i / 60})`; g.fillRect(sx - w / 2, y, w, 2 + i / 5); }
  // palms
  const palm = (px: number, ph: number, lean: number) => {
    g.strokeStyle = "#0b0614"; g.fillStyle = "#0b0614"; g.lineCap = "round";
    g.lineWidth = Math.max(6, W / 160);
    const tx = px + lean, ty = H - ph;
    g.beginPath(); g.moveTo(px, H); g.quadraticCurveTo(px + lean * 0.2, H - ph * 0.5, tx, ty); g.stroke();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.42, L = ph * (0.32 + (i % 3) * 0.04);
      g.lineWidth = Math.max(3, W / 300);
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - L * 0.15, tx + Math.cos(a) * L, ty + Math.sin(a) * L + L * 0.35); g.stroke();
    }
  };
  palm(W * 0.06, H * 0.78, W * 0.05); palm(W * 0.15, H * 0.6, -W * 0.02); palm(W * 0.9, H * 0.82, -W * 0.06); palm(W * 0.97, H * 0.55, -W * 0.01);
  // title
  const fs = Math.min(W * 0.13, H * 0.2);
  g.textAlign = "center";
  g.font = `italic 900 ${fs}px "Arial Black", Arial, sans-serif`;
  const tg = g.createLinearGradient(0, H * 0.18, 0, H * 0.18 + fs);
  tg.addColorStop(0, "#ffe27a"); tg.addColorStop(0.5, "#ff7a59"); tg.addColorStop(1, "#ff2f8e");
  g.lineWidth = fs * 0.07; g.strokeStyle = "rgba(20,6,30,0.9)"; g.lineJoin = "round";
  g.strokeText("SOUTH BEACH", W / 2, H * 0.18 + fs * 0.8);
  g.fillStyle = tg; g.fillText("SOUTH BEACH", W / 2, H * 0.18 + fs * 0.8);
  g.font = `700 ${fs * 0.16}px Arial, sans-serif`;
  g.fillStyle = "#9ff1ff";
  g.fillText("M I A M I   ·   F L O R I D A", W / 2, H * 0.18 + fs * 1.12);
}
