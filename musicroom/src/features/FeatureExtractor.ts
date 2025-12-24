import { CONFIG } from '../app/config'
import type { Hand2D, SensorFrame } from '../sensing/types'
import type { FeatureFrame } from './types'
import { emaVector } from './filters'

type Vec2 = { x: number; y: number }

export class FeatureExtractor {
  private lastTimestamp: number | null = null
  private lastPosition: Vec2 | null = null
  private lastVelocity: Vec2 | null = null

  update(frame: SensorFrame): FeatureFrame | null {
    const hand = this.getPrimaryHand(frame)
    if (!hand) {
      return null
    }

    const rawPosition: Vec2 = { x: hand.x, y: hand.y }
    const position = this.lastPosition
      ? emaVector(
          rawPosition,
          this.lastPosition,
          CONFIG.filters.positionEMAAlpha
        )
      : rawPosition

    const dtSeconds = this.getDeltaSeconds(frame.timestamp)

    const rawVelocity =
      this.lastPosition && dtSeconds > 0
        ? {
            x: (position.x - this.lastPosition.x) / dtSeconds,
            y: (position.y - this.lastPosition.y) / dtSeconds,
          }
        : { x: 0, y: 0 }

    const velocity = this.lastVelocity
      ? emaVector(
          rawVelocity,
          this.lastVelocity,
          CONFIG.filters.velocityEMAAlpha
        )
      : rawVelocity

    const speed = Math.hypot(velocity.x, velocity.y)

    this.lastTimestamp = frame.timestamp
    this.lastPosition = position
    this.lastVelocity = velocity

    return {
      timestamp: frame.timestamp,
      features: {
        hand: {
          position,
          velocity,
          speed,
          confidence: hand.confidence,
        },
      },
    }
  }

  private getPrimaryHand(frame: SensorFrame): Hand2D | null {
    const source = frame.sources.camera_0
    if (!source || source.kind !== 'camera.hand2d') {
      return null
    }

    return source.hands2d?.[0] ?? null
  }

  private getDeltaSeconds(timestamp: number) {
    if (!this.lastTimestamp) {
      return 0
    }

    return Math.max(
      (timestamp - this.lastTimestamp) / 1000,
      CONFIG.filters.minDtSeconds
    )
  }
}
