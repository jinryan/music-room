import { CONFIG } from '../../app/config'
import type { FeatureFrame } from '../../features/types'
import type { GestureEvent, GestureDetector } from '../types'

export class MovementOnsetDetector implements GestureDetector {
  private isMoving = false
  private counter = 0

  update(frame: FeatureFrame): GestureEvent[] {
    const speed = frame.features.hand.speed
    const events: GestureEvent[] = []

    if (!this.isMoving && speed >= CONFIG.detectors.move.startSpeed) {
      this.isMoving = true
      events.push({
        id: this.nextId('MOVE_START'),
        type: 'MOVE_START',
        timestamp: frame.timestamp,
        confidence: frame.features.hand.confidence,
        sourceFeatures: ['hand.speed'],
        data: {
          speed,
        },
      })
    }

    if (this.isMoving && speed <= CONFIG.detectors.move.stopSpeed) {
      this.isMoving = false
    }

    return events
  }

  private nextId(type: GestureEvent['type']) {
    this.counter += 1
    return `${type}-${this.counter}`
  }
}
