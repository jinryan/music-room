export type MusicalIntentFrame = {
  timestamp: number
  events: MusicalEvent[]
  controls: Record<string, number>
  target?: {
    voiceId?: string
    channel?: string
  }
}

export type MusicalEvent =
  | { type: 'noteOn'; noteId: string }
  | { type: 'noteOff'; noteId: string }
