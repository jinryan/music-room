export type FeatureFrame = {
  timestamp: number
  features: {
    hand: {
      position: { x: number; y: number }
      velocity: { x: number; y: number }
      speed: number
      confidence: number
    }
  }
}
