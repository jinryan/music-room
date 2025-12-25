// Expand as we get more features in the future
export type FeatureFrame = {
  timestamp: number;
  features: {
    leftHand: {
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      speed: number;
      confidence: number;
    };
  };
};
