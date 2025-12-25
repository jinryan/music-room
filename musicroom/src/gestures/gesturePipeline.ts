import type { FeatureFrame } from "../features/types";
import type { GestureEvent, GestureDetector } from "./types";
import { MovementOnsetDetector } from "./detectors/MovementOnsetDetector";
import { DirectionChangeDetector } from "./detectors/DirectionChangeDetector";

export function createGesturePipeline() {
  // Create a detector for each (feature, detector) pair
  const detectors: GestureDetector[] = [
    new MovementOnsetDetector({
      sourceLabel: "leftHand.speed",
      selectFeature: (frame: FeatureFrame) => frame.features.leftHand,
    }),
    new DirectionChangeDetector({
      axis: "x",
      sourceLabel: "leftHand.velocity",
      selectFeature: (frame: FeatureFrame) => frame.features.leftHand,
    }),
  ];

  return (featureFrame: FeatureFrame | null): GestureEvent[] => {
    if (!featureFrame) {
      return [];
    }

    // TODO (rjin): Parallelize?
    const events: GestureEvent[] = [];
    for (let i = 0; i < detectors.length; i += 1) {
      const detector = detectors[i];
      events.push(...detector.update(featureFrame));
    }
    return events;
  };
}
