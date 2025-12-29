import { BaseAudioLayer, type AudioNodeRef } from "./BaseAudioLayer";

type DrumType = "kick" | "snare" | "hihat";

export class DrumLayer extends BaseAudioLayer {
  private scheduledKicks: Set<number> = new Set();
  private scheduledSnares: Set<number> = new Set();
  private scheduledHiHats: Set<number> = new Set();

  constructor(context: AudioContext, tempo: number) {
    super(context, tempo, "DrumLayer");
  }

  private createKick(): AudioNodeRef {
    const oscillator = this.context.createOscillator();
    oscillator.type = "sine";

    const gain = this.context.createGain();
    gain.gain.value = 0;

    oscillator.connect(gain);

    return { source: oscillator, gain };
  }

  private createSnare(): AudioNodeRef {
    // Create white noise buffer
    const bufferSize = this.context.sampleRate * 0.1; // 100ms
    const buffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = 0;

    noise.connect(gain);

    return { source: noise, gain };
  }

  private createHiHat(): AudioNodeRef {
    // Use white noise instead of square wave for more realistic hi-hat sound
    const bufferSize = this.context.sampleRate * 0.1; // 100ms
    const buffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    // Add high-pass filter to shape the hi-hat sound (emphasize high frequencies)
    const filter = this.context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8000; // High frequencies for crisp hi-hat
    filter.Q.value = 1;

    const gain = this.context.createGain();
    gain.gain.value = 0;

    noise.connect(filter);
    filter.connect(gain);

    return { source: noise, gain, filter };
  }

  private scheduleDrum(
    type: DrumType,
    beatIndex: number,
    scheduleTime: number,
  ): void {
    const scheduledSet =
      type === "kick"
        ? this.scheduledKicks
        : type === "snare"
          ? this.scheduledSnares
          : this.scheduledHiHats;

    if (scheduledSet.has(beatIndex)) {
      return;
    }
    scheduledSet.add(beatIndex);

    const nodeGroup =
      type === "kick"
        ? this.createKick()
        : type === "snare"
          ? this.createSnare()
          : this.createHiHat();

    nodeGroup.gain.connect(this.context.destination);
    this.addActiveNode(nodeGroup);

    const config =
      type === "kick"
        ? { duration: 0.2, volume: 0.6 }
        : type === "snare"
          ? { duration: 0.15, volume: 0.4 }
          : { duration: 0.08, volume: 0.25 }; // Slightly longer, slightly quieter

    if (type === "kick") {
      const osc = nodeGroup.source as OscillatorNode;
      osc.frequency.setValueAtTime(60, scheduleTime);
      osc.frequency.exponentialRampToValueAtTime(30, scheduleTime + 0.1);
    }

    nodeGroup.source.start(scheduleTime);
    nodeGroup.source.stop(scheduleTime + config.duration);

    nodeGroup.gain.gain.setValueAtTime(0, scheduleTime);
    nodeGroup.gain.gain.linearRampToValueAtTime(
      config.volume,
      scheduleTime + 0.001,
    );

    if (type === "kick") {
      nodeGroup.gain.gain.exponentialRampToValueAtTime(0.01, scheduleTime + 0.1);
    } else if (type === "snare") {
      nodeGroup.gain.gain.exponentialRampToValueAtTime(
        0.01,
        scheduleTime + 0.05,
      );
    } else {
      // Hi-hat: faster attack, natural decay
      nodeGroup.gain.gain.exponentialRampToValueAtTime(
        0.01,
        scheduleTime + 0.04,
      );
    }

    nodeGroup.gain.gain.linearRampToValueAtTime(
      0,
      scheduleTime + config.duration,
    );
  }

  scheduleKick(beatIndex: number, scheduleTime: number): void {
    this.scheduleDrum("kick", beatIndex, scheduleTime);
  }

  scheduleSnare(beatIndex: number, scheduleTime: number): void {
    this.scheduleDrum("snare", beatIndex, scheduleTime);
  }

  scheduleHiHat(beatIndex: number, scheduleTime: number): void {
    this.scheduleDrum("hihat", beatIndex, scheduleTime);
  }

  schedulePattern(startTime: number, loopLength: number): void {
    const beatDuration = this.getBeatDuration();

    for (let loop = 0; loop < loopLength; loop++) {
      const loopStartBeat = loop * 32;

      // Kick pattern (beats 1 and 3)
      for (let bar = 0; bar < 8; bar++) {
        const barStartBeat = loopStartBeat + bar * 4;
        this.scheduleKick(barStartBeat, startTime + barStartBeat * beatDuration);
        this.scheduleKick(
          barStartBeat + 2,
          startTime + (barStartBeat + 2) * beatDuration,
        );
      }

      // Snare pattern (beats 2 and 4)
      for (let bar = 0; bar < 8; bar++) {
        const barStartBeat = loopStartBeat + bar * 4;
        this.scheduleSnare(
          barStartBeat + 1,
          startTime + (barStartBeat + 1) * beatDuration,
        );
        this.scheduleSnare(
          barStartBeat + 3,
          startTime + (barStartBeat + 3) * beatDuration,
        );
      }

      // Hi-hat pattern (8th notes)
      for (let beat = 0; beat < 32; beat++) {
        for (let eighth = 0; eighth < 2; eighth++) {
          const eighthBeat = beat + eighth * 0.5;
          const absoluteBeat = loopStartBeat + eighthBeat;
          this.scheduleHiHat(
            Math.floor(absoluteBeat * 2),
            startTime + absoluteBeat * beatDuration,
          );
        }
      }
    }
  }

  start(startTime: number): void {
    this.scheduledKicks.clear();
    this.scheduledSnares.clear();
    this.scheduledHiHats.clear();
    this.schedulePattern(startTime, 4);
  }
}

