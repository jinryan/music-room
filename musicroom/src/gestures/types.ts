import type { FeatureFrame } from "../features/types";

// Interface for output of gestures pipeline
export type GestureEvent = {
  id: string;
  type: "MOVE_START" | "MOVE_END" | "DIRECTION_CHANGE_X" | "DIRECTION_CHANGE_Y";
  timestamp: number;
  confidence: number;
  sourceFeatures: string[];
  data: Record<string, unknown>;
};

// Interface for input to gesture detectors
// Can and should expand
export type KinematicFeature = {
  velocity: { x: number; y: number };
  speed: number;
  confidence: number;
};

// Interface for gesture detectors
export type GestureDetector = {
  update: (frame: FeatureFrame) => GestureEvent[];
};
