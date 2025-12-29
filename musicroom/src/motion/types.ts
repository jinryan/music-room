import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";

// MotionContext captures instantaneous human movement (measurement space).
// It bundles raw features, derived descriptors, and motion events for a single moment.
export type MotionContext = {
  timestamp: number;
  features: FeatureFrame["features"];
  descriptors: MotionDescriptors;
  events: GestureEvent[];
};

// Descriptors are fast-changing summaries of recent kinematics (frame-to-frame or short window).
export type MotionDescriptors = {
  motionEnergy: number; // e.g., speed × amplitude
  motionContinuity: number; // 0=jittery, 1=smooth
  engagement: "absent" | "hovering" | "moving";
  activity?: number; // optional short-window activity measure (0..1)
};
