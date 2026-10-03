class SoundSystem {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // Radio packet transmission chirp
  public playPacketChirp() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(2400, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.09);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // Audio fallback silent
    }
  }

  public playRadioChirp() {
    this.playPacketChirp();
  }

  // Packet received acknowledge ping
  public playPacketAck() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1760, t);
      osc.frequency.setValueAtTime(2200, t + 0.04);

      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    } catch {}
  }

  // System WATCH state reached
  public playWatchPing() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(587.33, t); // D5
      osc2.frequency.setValueAtTime(880, t + 0.08); // A5

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t + 0.08);
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.35);
    } catch {}
  }

  // System WARNING state reached
  public playWarningAlert() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      [659.25, 783.99, 987.77].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + i * 0.1);

        gain.gain.setValueAtTime(0.05, t + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (i + 1) * 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + i * 0.1);
        osc.stop(t + (i + 1) * 0.13);
      });
    } catch {}
  }

  // System CRITICAL siren
  public playCriticalSiren() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      // Rising and falling siren tone
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.linearRampToValueAtTime(1100, t + 0.25);
      osc.frequency.linearRampToValueAtTime(650, t + 0.5);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.6);
    } catch {}
  }

  // Sensor Fault or Link Broken
  public playFaultBuzz() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.setValueAtTime(140, t + 0.08);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  }

  // ==========================================
  // WATCH TOWER EMERGENCY SIREN & RED BUZZER (Continuous Audio Synthesis)
  // ==========================================
  private sirenNodes: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    lfo?: OscillatorNode;
    lfoGain?: GainNode;
    gainNode: GainNode;
    type: 'SIREN' | 'BUZZER';
  } | null = null;
  public isWatchtowerSirenActive: boolean = false;
  public sirenVolume: number = 0.22;
  public sirenMode: 'SIREN' | 'BUZZER' = 'SIREN';

  public startWatchtowerSiren(type: 'SIREN' | 'BUZZER' = 'SIREN') {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.sirenNodes) {
        this.stopWatchtowerSiren();
      }

      this.sirenMode = type;
      const t = this.ctx.currentTime;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, t);
      gainNode.gain.linearRampToValueAtTime(this.sirenVolume, t + 0.3);

      if (type === 'SIREN') {
        // Dual Wailing Pitch Modulated Outdoor Warning Siren (520Hz - 940Hz)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(680, t);
        osc2.frequency.setValueAtTime(684, t); // Slight detune creates acoustic horn phase roll

        // LFO sweeps frequency between 520Hz and 920Hz with a 2.4s cycle
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.42, t);
        lfoGain.gain.setValueAtTime(220, t);

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        lfo.start(t);

        this.sirenNodes = { osc1, osc2, lfo, lfoGain, gainNode, type: 'SIREN' };
      } else {
        // Industrial Red Buzzer / Rapid Emergency Horn Pulse
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(440, t);
        osc2.frequency.setValueAtTime(220, t);

        // LFO pulses buzzer on/off at 3.2 Hz
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(3.2, t);
        lfoGain.gain.setValueAtTime(0.5, t);

        const pulseGain = this.ctx.createGain();
        pulseGain.gain.setValueAtTime(0.5, t);
        lfo.connect(lfoGain);
        lfoGain.connect(pulseGain.gain);

        osc1.connect(pulseGain);
        osc2.connect(pulseGain);
        pulseGain.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        lfo.start(t);

        this.sirenNodes = { osc1, osc2, lfo, lfoGain, gainNode, type: 'BUZZER' };
      }

      this.isWatchtowerSirenActive = true;
    } catch {}
  }

  public stopWatchtowerSiren() {
    if (!this.sirenNodes || !this.ctx) {
      this.isWatchtowerSirenActive = false;
      return;
    }
    try {
      const t = this.ctx.currentTime;
      this.sirenNodes.gainNode.gain.linearRampToValueAtTime(0.0001, t + 0.35);
      const nodes = this.sirenNodes;
      setTimeout(() => {
        try {
          nodes.osc1.stop();
          nodes.osc2.stop();
          nodes.lfo?.stop();
          nodes.osc1.disconnect();
          nodes.osc2.disconnect();
          nodes.lfo?.disconnect();
          nodes.gainNode.disconnect();
        } catch {}
      }, 400);
    } catch {}
    this.sirenNodes = null;
    this.isWatchtowerSirenActive = false;
  }

  public toggleWatchtowerSiren(type?: 'SIREN' | 'BUZZER') {
    if (this.isWatchtowerSirenActive) {
      this.stopWatchtowerSiren();
    } else {
      this.startWatchtowerSiren(type || this.sirenMode);
    }
    return this.isWatchtowerSirenActive;
  }

  public setSirenVolume(vol: number) {
    this.sirenVolume = Math.max(0, Math.min(1, vol));
    if (this.sirenNodes && this.ctx) {
      this.sirenNodes.gainNode.gain.setValueAtTime(this.sirenVolume, this.ctx.currentTime);
    }
  }
}

export const soundManager = new SoundSystem();
