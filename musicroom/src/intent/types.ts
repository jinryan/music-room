import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";

export type BiasControls = {
  stability?: number;
  entropy?: number;
  registerBias?: number;
  densityTarget?: number;
};

export type IntentModule = {
  update: (
    featureFrame: FeatureFrame | null,
    gestureEvents: GestureEvent[],
    now: number,
  ) => BiasControls;
};
