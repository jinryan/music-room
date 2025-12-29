// IntentInterpreter converts recent motion/gesture history into slow-moving BiasControls for the music engine (V1: stub defaults).
import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";
import type { BiasState, IntentModule } from "./types";

export class IntentInterpreter implements IntentModule {
  private biasState: BiasState = {
    textureDensity: 0.5,
    tonalStability: 0.75,
    variation: 0.25,
  };

  update(
    featureFrame: FeatureFrame | null,
    gestureEvents: GestureEvent[],
    now: number,
  ): BiasState {
    // TODO(rjin): ingest feature/gesture ring buffers once available (V2+)
    void featureFrame;
    void gestureEvents;
    void now;

    return this.biasState;
  }
}
