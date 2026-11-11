import { getCachedAudioBlob, type FreesoundSound } from './freesound';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gains: GainNode[] = [];
  private audioNodes: (AudioBufferSourceNode | null)[] = [];

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getGain(index: number): GainNode | undefined {
    return this.gains[index];
  }

  get gainCount(): number {
    return this.gains.length;
  }

  async ensureAudio(layerCount: number, customSounds: (FreesoundSound | null)[]): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    const ctx = this.ctx;
    for (let i = this.gains.length; i < layerCount; i++) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(ctx.destination);
      this.gains.push(g);
      await this.setupLayerSource(i, customSounds[i]);
    }
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }

  async setupLayerSource(
    i: number,
    customSound?: FreesoundSound | null,
    directBuffer?: ArrayBuffer
  ): Promise<void> {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const gainNode = this.gains[i];
    if (!gainNode) return;

    if (this.audioNodes[i]) {
      try {
        this.audioNodes[i]?.stop();
        this.audioNodes[i]?.disconnect();
      } catch {}
      this.audioNodes[i] = null;
    }

    if (customSound) {
      try {
        const cachedBuf = directBuffer || (await getCachedAudioBlob(customSound.id));
        if (cachedBuf) {
          const audioBuffer = await ctx.decodeAudioData(cachedBuf.slice(0));
          const sourceNode = ctx.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.loop = true;
          sourceNode.connect(gainNode);
          sourceNode.start();
          this.audioNodes[i] = sourceNode;
          return;
        }
      } catch (e) {
        console.warn('Failed to decode cached custom sound, falling back to procedural:', e);
      }
    }

    // Procedural fallback / default synthetic ambience
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    const slotMod = i % 4;
    for (let n = 0; n < data.length; n++) {
      let white = Math.random() * 2 - 1;
      last = (last + 0.025 * white) / 1.025;
      data[n] = slotMod === 3 ? white * (Math.random() > 0.998 ? 1 : 0.08) : slotMod === 0 ? white * 0.45 : last * 6;
    }
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = slotMod === 0 ? 'highpass' : 'lowpass';
    const freqs = [900, 420, 240, 1800];
    f.frequency.value = freqs[slotMod];
    node.connect(f).connect(gainNode);
    node.start();
    this.audioNodes[i] = node;
  }

  updateGains(
    layers: number[],
    master: number,
    playing: boolean,
    muted: boolean,
    layerActive: boolean[]
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.gains.forEach((g, i) => {
      const isAudible = playing && !muted && (layerActive[i] ?? true);
      const targetGain = isAudible ? ((layers[i] ?? 0) / 100) * (master / 100) * 0.22 : 0;
      g.gain.setTargetAtTime(targetGain, now, 0.4);
    });
  }

  async addLayer(volume = 50, master = 100, isAudible = false): Promise<void> {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const newIndex = this.gains.length;
    const g = ctx.createGain();
    g.gain.value = isAudible ? (volume / 100) * (master / 100) * 0.22 : 0;
    g.connect(ctx.destination);
    this.gains.push(g);
    await this.setupLayerSource(newIndex, null);
  }

  removeLayer(i: number): void {
    if (this.audioNodes[i]) {
      try {
        this.audioNodes[i]?.stop();
        this.audioNodes[i]?.disconnect();
      } catch {}
    }
    if (this.gains[i]) {
      try {
        this.gains[i]?.disconnect();
      } catch {}
    }
    this.audioNodes.splice(i, 1);
    this.gains.splice(i, 1);
  }
}

export const audioEngine = new AudioEngine();
