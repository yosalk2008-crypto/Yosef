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
.sb-weap{margin-top:8px;font-size:18px;font-weight:700}.sb-weap span{opacity:.6;font-size:14px}
.sb-mm{position:absolute;left:22px;bottom:22px;width:220px;height:220px;border-radius:50%;border:3px solid rgba(0,0,0,.6);box-shadow:0 4px 18px rgba(0,0,0,.5)}
.sb-mm canvas{width:100%;height:100%;border-radius:50%}
.sb-street{position:absolute;left:258px;bottom:28px;font-size:20px;font-weight:700;font-style:italic;text-shadow:0 2px 6px #000;color:#fff}
.sb-cross{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;display:none;border-radius:50%;border:2px solid rgba(255,255,255,.9);box-shadow:0 0 4px #000}
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
