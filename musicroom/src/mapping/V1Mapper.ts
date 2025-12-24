import { CONFIG } from '../app/config'
import type { FeatureFrame } from '../features/types'
import type { GestureEvent } from '../gestures/types'
import type { MusicalIntentFrame, MusicalEvent } from './types'
import { mapNormalizedToScaleMidi, midiToHz } from './scale'

const NOTE_ID = 'lead'

export class V1Mapper {
  private isNoteOn = false

  update(
    frame: FeatureFrame,
    events: GestureEvent[]
  ): MusicalIntentFrame {
    const musicalEvents: MusicalEvent[] = []

    const moveStart = events.some((event) => event.type === 'MOVE_START')
    const directionChange = events.some(
      (event) => event.type === 'DIRECTION_CHANGE_X'
    )

    if (moveStart && !this.isNoteOn) {
      this.isNoteOn = true
      musicalEvents.push({ type: 'noteOn', noteId: NOTE_ID })
    }

    if (directionChange) {
      if (this.isNoteOn) {
        musicalEvents.push({ type: 'noteOff', noteId: NOTE_ID })
      }
      musicalEvents.push({ type: 'noteOn', noteId: NOTE_ID })
      this.isNoteOn = true
    }

    const normalized = clamp(1 - frame.features.hand.position.y, 0, 1)
    const midi = mapNormalizedToScaleMidi(
      normalized,
      CONFIG.mapping.pitch.minMidi,
      CONFIG.mapping.pitch.maxMidi,
      CONFIG.mapping.pitch.scale,
      CONFIG.mapping.pitch.mode
    )
    const pitchHz = midiToHz(midi)

    return {
      timestamp: frame.timestamp,
      events: musicalEvents,
      controls: {
        pitchHz,
      },
    }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
