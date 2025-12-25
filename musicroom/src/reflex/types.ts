import type { FeatureFrame } from "../features/types";
import type { GestureEvent } from "../gestures/types";
import type { RenderPacket } from "../render/types";

export type ReflexRenderer = {
  update: (frame: FeatureFrame, events: GestureEvent[]) => RenderPacket;
};
