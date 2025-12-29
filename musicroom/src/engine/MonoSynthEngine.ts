// MonoSynthEngine is a minimal audio engine that consumes render commands and renders a single voice with smooth parameter ramps.
import { CONFIG } from "../app/config";
import type { RenderPacket, RenderEvent } from "../render/types";
import type { AudioEngine } from "./AudioEngine";

export class MonoSynthEngine implements AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private lastPitchHz = 220;
  private retriggerOffset = 0;

  async resume() {
    this.ensureContext();
    if (!this.context) {
      return;
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  handleRender(cmd: RenderPacket) {
    if (!this.context || this.context.state !== "running") {
      return;
    }

    this.applyPitch(cmd.controls.pitchHz);
    this.applyEvents(cmd.events);
  }

  private ensureContext() {
    if (this.context) {
      return;
    }

    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.context.destination);
  }

  private applyEvents(events: RenderEvent[]) {
    // Extend as we get more events in the future
    for (const event of events) {
      if (event.type === "noteOn") {
        this.noteOn();
      } else if (event.type === "noteOff") {
        this.noteOff();
      } else if (event.type === "retrigger") {
        this.noteOff();
        this.noteOn();
      }
    }
  }

  // Actuator Primitives

  private noteOn() {
    if (!this.context || !this.masterGain) {
      return;
    }

    if (!this.osc) {
      this.osc = this.context.createOscillator();
      this.osc.type = "sine";
      this.osc.connect(this.masterGain);
      this.osc.start();
    }

    const now = this.context.currentTime + this.retriggerOffset;
    const attack = CONFIG.audio.attackMs / 1000;

    this.retriggerOffset = 0;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(this.lastPitchHz, now);

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(1, now + attack);
  }

  private noteOff() {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const release = CONFIG.audio.releaseMs / 1000;
    this.retriggerOffset = CONFIG.audio.retriggerGapMs / 1000;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + release);
  }

  private applyPitch(pitchHz: number | undefined) {
    if (!this.context || !pitchHz) {
      return;
    }

    this.lastPitchHz = pitchHz;
    if (!this.osc) {
      return;
    }

    const now = this.context.currentTime;
    const slew = CONFIG.audio.pitchSlewMs / 1000;
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.setValueAtTime(this.osc.frequency.value, now);
    this.osc.frequency.linearRampToValueAtTime(pitchHz, now + slew);
  }
}
