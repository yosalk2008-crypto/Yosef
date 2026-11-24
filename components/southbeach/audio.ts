// Procedural sound through one master bus: HighPass 35 Hz -> Compressor -> Gain -> soft clipper.
export class Sound {
  ctx: AudioContext | null = null;
  bus!: AudioNode;
  noise!: AudioBuffer;
  eng?: { o: OscillatorNode; o2: OscillatorNode; lp: BiquadFilterNode; g: GainNode };
  sir?: GainNode;
  scr?: GainNode;
  amb?: GainNode;
  unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended" && !document.hidden) void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 35;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
    const g = c.createGain(); g.gain.value = 0.6;
    const clip = c.createWaveShaper(); const cv = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; cv[i] = Math.tanh(1.5 * x) / Math.tanh(1.5); }
    clip.curve = cv;
    hp.connect(comp); comp.connect(g); g.connect(clip); clip.connect(c.destination);
    this.bus = hp;
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const o = c.createOscillator(); o.type = "sawtooth";
    const o2 = c.createOscillator(); o2.type = "square";
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
    const eg = c.createGain(); eg.gain.value = 0; const h = c.createGain(); h.gain.value = 0.4;
    o.connect(lp); o2.connect(h); h.connect(lp); lp.connect(eg); eg.connect(hp); o.start(); o2.start();
    this.eng = { o, o2, lp, g: eg };
    const so = c.createOscillator(); so.type = "triangle"; so.frequency.value = 800;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.6; const lg = c.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(so.frequency);
    this.sir = c.createGain(); this.sir.gain.value = 0; so.connect(this.sir); this.sir.connect(hp); so.start(); lfo.start();
    const sn = c.createBufferSource(); sn.buffer = this.noise; sn.loop = true;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 4;
    this.scr = c.createGain(); this.scr.gain.value = 0; sn.connect(bp); bp.connect(this.scr); this.scr.connect(hp); sn.start();
    // ambience: surf + city hum
    const an = c.createBufferSource(); an.buffer = this.noise; an.loop = true;
    const alp = c.createBiquadFilter(); alp.type = "lowpass"; alp.frequency.value = 420;
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.09; const lg2 = c.createGain(); lg2.gain.value = 0.012;
    this.amb = c.createGain(); this.amb.gain.value = 0.02; lfo2.connect(lg2); lg2.connect(this.amb.gain);
    an.connect(alp); alp.connect(this.amb); this.amb.connect(hp); an.start(); lfo2.start();
  }
  private set(p: AudioParam, v: number, tc = 0.06) { if (this.ctx) p.setTargetAtTime(v, this.ctx.currentTime, tc); }
  update(speed: number, th: number, slip: number, siren: number, inCar: boolean) {
    if (!this.ctx || !this.eng) return;
    this.set(this.eng.o.frequency, 38 + speed * 3.2 + th * 12);
    this.set(this.eng.o2.frequency, 19 + speed * 1.6 + th * 6);
    this.set(this.eng.lp.frequency, 300 + speed * 26 + th * 260);
    this.set(this.eng.g.gain, inCar ? 0.05 + Math.min(1, speed / 45) * 0.05 : 0, 0.1);
    this.set(this.scr!.gain, inCar ? Math.max(0, Math.min(1, (slip - 4) / 8)) * 0.09 : 0);
    this.set(this.sir!.gain, siren * 0.04, 0.2);
  }
  burst(len: number, freq: number, vol: number, type: BiquadFilterType = "lowpass", delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t, Math.random()); s.stop(t + len + 0.05);
  }
  tone(freq: number, len: number, vol: number, type: OscillatorType = "sine", slide = 0, delay = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + len);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + len + 0.02);
  }
  shot(heavy: boolean, distance = 0) {
    const v = Math.max(0.03, 0.5 / (1 + distance / 25));
    this.burst(heavy ? 0.22 : 0.16, heavy ? 1800 : 2600, v);
    this.tone(heavy ? 110 : 150, 0.12, v * 0.8, "sine", 40);
  }
  boom() { this.burst(1.4, 300, 0.7); this.tone(60, 0.9, 0.5, "sine", 25); }
  crash(p: number) { this.burst(0.35, 500 + p * 20, Math.min(0.3, p / 60)); }
  cash() { this.tone(1318, 0.09, 0.08); this.tone(1760, 0.16, 0.08, "sine", 0, 0.07); }
  suspend() { if (this.ctx?.state === "running") void this.ctx.suspend(); }
  resume() { if (this.ctx?.state === "suspended") void this.ctx.resume(); }
  close() { void this.ctx?.close(); this.ctx = null; }
}
