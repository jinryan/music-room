import type { GestureEvent } from './types'

export class GestureBus {
  private lastEvent: GestureEvent | null = null

  publish(events: GestureEvent[]) {
    if (events.length === 0) {
      return
    }

    this.lastEvent = events[events.length - 1]
  }

  getLastEvent() {
    return this.lastEvent
  }
}
