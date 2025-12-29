import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";

// BiasState is a single structure for slow, musical tendencies (engine-facing), distinct from instantaneous MotionContext descriptors.
// Keep it simple; add inertia/decay fields only if needed later.
export type BiasState = {
  textureDensity?: number; // desired engine output density/layering
  tonalStability?: number; // how strongly the engine favors staying in-key/repeating patterns
  variation?: number; // randomness/ornament budget
};

export type IntentModule = {
  update: (
    featureFrame: FeatureFrame | null,
    gestureEvents: GestureEvent[],
    now: number,
  ) => BiasState;
};
