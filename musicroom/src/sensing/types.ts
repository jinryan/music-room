export type Hand2D = {
  x: number
  y: number
  confidence: number
}

export type RawSensorData = {
  kind: 'camera.hand2d'
  hands2d?: Hand2D[]
}

export type SensorFrame = {
  timestamp: number
  sources: Record<string, RawSensorData>
}
