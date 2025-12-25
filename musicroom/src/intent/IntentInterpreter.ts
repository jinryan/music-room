import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";
import type { BiasControls, IntentModule } from "./types";

export class IntentInterpreter implements IntentModule {
  private biasControls: BiasControls = {
    stability: 1,
    entropy: 0,
  };

  update(
    featureFrame: FeatureFrame | null,
    gestureEvents: GestureEvent[],
    now: number,
  ): BiasControls {
    // TODO(rjin): ingest feature/gesture ring buffers once available (V2+)
    void featureFrame;
    void gestureEvents;
    void now;

    return this.biasControls;
  }
}
