/**
 * Sound Engine
 *
 * Generates sound effects using Web Audio API.
 * Creates procedural sounds for farming actions.
 */

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private musicGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private activeMusic: AudioBufferSourceNode | null = null;
  private soundCache: Map<string, AudioBuffer> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.musicGainNode = this.audioContext.createGain();
      this.sfxGainNode = this.audioContext.createGain();

      this.musicGainNode.connect(this.audioContext.destination);
      this.sfxGainNode.connect(this.audioContext.destination);

      this.musicGainNode.gain.value = 0.3;
      this.sfxGainNode.gain.value = 0.6;
    }
  }

  /**
   * Play a sound effect
   */
  playSound(soundId: string): void {
    if (!this.audioContext) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    // Generate procedural sound based on ID
    switch (soundId) {
      case "dig-soil":
        this.generateDigSound();
        break;
      case "water-splash":
        this.generateWaterSound();
        break;
      case "harvest-sound":
        this.generateHarvestSound();
        break;
      case "door-chime":
        this.generateChimeSound();
        break;
      case "ka-ching":
        this.generateCashRegisterSound();
        break;
      case "dialogue-sound":
        this.generateDialogueSound();
        break;
      case "gift-sound":
        this.generateGiftSound();
        break;
      case "love-sound":
        this.generateLoveSound();
        break;
      case "eating-sound":
        this.generateEatingSound();
        break;
      case "collect-sound":
        this.generateCollectSound();
        break;
      case "animal-content-sound":
        this.generateAnimalSound();
        break;
      case "growth-complete":
        this.generateGrowthCompleteSound();
        break;
      case "wilt-sound":
        this.generateWiltSound();
        break;
      case "fertilizer-sound":
        this.generateFertilizerSound();
        break;
      default:
        console.log(`Sound not implemented: ${soundId}`);
    }
  }

  /**
   * Play background music
   */
  playMusic(musicId: string): void {
    // Stop current music
    if (this.activeMusic) {
      this.activeMusic.stop();
    }

    // In a real implementation, you'd load and play actual music files
    console.log(`Playing music: ${musicId}`);
  }

  /**
   * Stop all sounds
   */
  cleanup(): void {
    if (this.activeMusic) {
      this.activeMusic.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // ========================================
  // Procedural Sound Generators
  // ========================================

  private generateDigSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    filter.type = "lowpass";
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private generateWaterSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * 0.5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // White noise for water
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);

    noise.start(now);
    noise.stop(now + 0.5);
  }

  private generateHarvestSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // Two-tone harvest sound
    [500, 700].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  private generateChimeSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C, E, G

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.5);
    });
  }

  private generateCashRegisterSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // "Ka" sound
    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    osc1.type = "square";
    osc1.frequency.value = 800;
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.sfxGainNode);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // "Ching" sound
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 1200;
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(this.sfxGainNode);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  }

  private generateDialogueSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private generateGiftSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // Ascending arpeggio
    [400, 500, 600, 700].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  private generateLoveSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // Higher, sweeter tones
    [600, 800, 1000, 1200].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  }

  private generateEatingSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // Munching sounds
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sawtooth";
      osc.frequency.value = 150 + Math.random() * 50;

      gain.gain.setValueAtTime(0.15, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.15);
    }
  }

  private generateCollectSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // Quick ascending tone
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private generateAnimalSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // Gentle warbling tone
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.value = 300;

    lfo.type = "sine";
    lfo.frequency.value = 5;
    lfoGain.gain.value = 20;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    lfo.start(now);
    osc.start(now);
    osc.stop(now + 0.5);
    lfo.stop(now + 0.5);
  }

  private generateGrowthCompleteSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // 8-bit ascending fanfare: C5 → E5 → G5 → C6
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.setValueAtTime(0.2, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  private generateWiltSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // 8-bit descending sad tone: G4 → E4 → C4
    [392, 329.63, 261.63].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.setValueAtTime(0.15, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.17);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  private generateFertilizerSound(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const now = this.audioContext.currentTime;

    // 8-bit sprinkle: quick staccato notes with rising pitch
    [440, 494, 523.25, 587.33, 659.25].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const t = now + i * 0.07;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(t);
      osc.stop(t + 0.05);
    });
  }
}
