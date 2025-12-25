import { CONFIG } from "../app/config";
import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";
import type { RenderPacket, RenderEvent } from "../render/types";
import type { ReflexRenderer } from "./types";
import { mapNormalizedToScaleMidi, midiToHz } from "../mapping/scale";

export class ReflexImpulseRendererV1 implements ReflexRenderer {
  private isNoteOn = false;

  update(frame: FeatureFrame, events: GestureEvent[]): RenderPacket {
    const renderEvents: RenderEvent[] = [];

    const moveStart = events.some((event) => event.type === "MOVE_START");
    const moveEnd = events.some((event) => event.type === "MOVE_END");
    const directionChange = events.some(
      (event) => event.type === "DIRECTION_CHANGE_X",
    );

    if (moveStart && !this.isNoteOn) {
      this.isNoteOn = true;
      renderEvents.push({ type: "noteOn" });
    }

    if (directionChange) {
      if (this.isNoteOn) {
        renderEvents.push({ type: "noteOff" });
      }
      renderEvents.push({ type: "noteOn" });
      this.isNoteOn = true;
    }

    if (moveEnd && this.isNoteOn) {
      renderEvents.push({ type: "noteOff" });
      this.isNoteOn = false;
    }

    const normalized = clamp(1 - frame.features.leftHand.position.y, 0, 1);
    const midi = mapNormalizedToScaleMidi(
      normalized,
      CONFIG.mapping.pitch.minMidi,
      CONFIG.mapping.pitch.maxMidi,
      CONFIG.mapping.pitch.scale,
      CONFIG.mapping.pitch.mode,
    );
    const pitchHz = midiToHz(midi);

    return {
      timestamp: frame.timestamp,
      events: renderEvents,
      controls: {
        pitchHz,
      },
    };
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
