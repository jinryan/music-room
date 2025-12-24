import type { FeatureFrame } from '../features/types'

export type GestureEvent = {
  id: string
  type: 'MOVE_START' | 'DIRECTION_CHANGE_X'
  timestamp: number
  confidence: number
  sourceFeatures: string[]
  data: Record<string, unknown>
}

export type GestureDetector = {
  update: (frame: FeatureFrame) => GestureEvent[]
}
