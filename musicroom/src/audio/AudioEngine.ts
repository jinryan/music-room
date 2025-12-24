import type { MusicalIntentFrame } from '../mapping/types'

export type AudioEngine = {
  resume: () => Promise<void>
  handleIntent: (intent: MusicalIntentFrame) => void
}
