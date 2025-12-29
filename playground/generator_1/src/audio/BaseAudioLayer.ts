/**
 * Base class for audio layers with common functionality
 */
import { warn } from "../utils/logger";
import { stopAudioNodeGroup } from "../utils/audioNodes";

export interface AudioNodeRef {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  filter?: BiquadFilterNode;
}

export abstract class BaseAudioLayer {
  protected context: AudioContext;
  protected tempo: number;
  protected activeNodes: Set<AudioNodeRef> = new Set();
  protected moduleName: string;

  constructor(context: AudioContext, tempo: number, moduleName: string) {
    this.context = context;
    this.tempo = tempo;
    this.moduleName = moduleName;
  }

  protected addActiveNode(node: AudioNodeRef): void {
    this.activeNodes.add(node);
  }

  protected getBeatDuration(): number {
    return 60 / this.tempo;
  }

  stop(): void {
    for (const node of this.activeNodes) {
      try {
        stopAudioNodeGroup(node, this.context);
      } catch (e) {
        warn(this.moduleName, `Error stopping node:`, e);
      }
    }
    this.activeNodes.clear();
  }

  abstract start(startTime: number): void;
}

