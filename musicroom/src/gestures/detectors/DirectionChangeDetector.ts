import { CONFIG } from '../../app/config'
import type { FeatureFrame } from '../../features/types'
import type { GestureEvent, GestureDetector } from '../types'

type Vec2 = { x: number; y: number }

export class DirectionChangeDetector implements GestureDetector {
  private lastVelocity: Vec2 | null = null
  private lastTriggerTime = 0
  private counter = 0
  private lastLogTime = 0

  update(frame: FeatureFrame): GestureEvent[] {
    const { velocity, speed, confidence } = frame.features.hand
    const events: GestureEvent[] = []

    if (speed < CONFIG.detectors.direction.minSpeed) {
      return events
    }

    if (this.lastVelocity) {
      const minAxisSpeed = CONFIG.detectors.direction.minAxisSpeed
      const changedXDirection =
        Math.abs(this.lastVelocity.x) > minAxisSpeed &&
        Math.abs(velocity.x) > minAxisSpeed &&
        this.lastVelocity.x * velocity.x < 0
      const cooldownReady =
        frame.timestamp - this.lastTriggerTime >=
        CONFIG.detectors.direction.cooldownMs

      if (
        CONFIG.debug.log.directionCheck &&
        frame.timestamp - this.lastLogTime >= 250
      ) {
        this.lastLogTime = frame.timestamp
        console.info('[direction-check-x]', {
          speed: speed.toFixed(2),
          lastX: this.lastVelocity.x.toFixed(3),
          currentX: velocity.x.toFixed(3),
          changedXDirection,
          cooldownReady,
        })
      }

      if (cooldownReady && changedXDirection) {
        if (CONFIG.debug.log.gestures) {
          console.info('[direction-change-x]', {
            speed: speed.toFixed(2),
            lastX: this.lastVelocity.x.toFixed(3),
            currentX: velocity.x.toFixed(3),
          })
        }
        this.lastTriggerTime = frame.timestamp
        events.push({
          id: this.nextId('DIRECTION_CHANGE_X'),
          type: 'DIRECTION_CHANGE_X',
          timestamp: frame.timestamp,
          confidence,
          sourceFeatures: ['hand.velocity'],
          data: {
            speed,
            lastX: this.lastVelocity.x,
            currentX: velocity.x,
          },
        })
      }
    }

    const minAxisSpeed = CONFIG.detectors.direction.minAxisSpeed
    if (Math.abs(velocity.x) > minAxisSpeed) {
      this.lastVelocity = { x: velocity.x, y: velocity.y }
    }

    return events
  }

  private nextId(type: GestureEvent['type']) {
    this.counter += 1
    return `${type}-${this.counter}`
  }
}
