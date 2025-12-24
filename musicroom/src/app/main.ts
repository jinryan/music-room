import { CONFIG } from './config'
import { CameraSource } from '../sensing/CameraSource'
import { HandLandmarkerSensor } from '../sensing/HandLandmarkerSensor'
import { FeatureExtractor } from '../features/FeatureExtractor'
import { DebugOverlay } from '../ui/DebugOverlay'
import { GestureBus } from '../gestures/GestureBus'
import { MovementOnsetDetector } from '../gestures/detectors/MovementOnsetDetector'
import { DirectionChangeDetector } from '../gestures/detectors/DirectionChangeDetector'
import type { GestureDetector } from '../gestures/types'
import { V1Mapper } from '../mapping/V1Mapper'
import { MonoSynthEngine } from '../audio/MonoSynthEngine'
import type { MusicalEvent } from '../mapping/types'
import { SensorHub } from '../sensing/SensorHub'

type FrameStats = {
  lastTimestamp: number
  frameCount: number
  lastLogTime: number
}

const LOG_INTERVAL_MS = 1000

export async function bootApp() {
  const { video, overlay } = setupDom()
  const camera = new CameraSource(video)
  const sensor = new HandLandmarkerSensor(camera)
  const sensorHub = new SensorHub()
  const featureExtractor = new FeatureExtractor()
  const gestureBus = new GestureBus()
  const detectors: GestureDetector[] = [
    new MovementOnsetDetector(),
    new DirectionChangeDetector(),
  ]
  const mapper = new V1Mapper()
  const audio = new MonoSynthEngine()

  await camera.init()
  await sensor.init()
  sensorHub.register('camera_0', sensor)
  overlay.resize(window.innerWidth, window.innerHeight)
  window.addEventListener('resize', () =>
    overlay.resize(window.innerWidth, window.innerHeight)
  )
  document.addEventListener('pointerdown', () => {
    audio.resume().catch((error) => {
      console.warn('Failed to resume audio context', error)
    })
  })

  const stats: FrameStats = {
    lastTimestamp: performance.now(),
    frameCount: 0,
    lastLogTime: performance.now(),
  }

  let lastGestureType: string | null = null
  let noteOnState: boolean | null = null
  let pitchHz: number | null = null

  const loop = (timestamp: number) => {
    const deltaMs = timestamp - stats.lastTimestamp
    stats.lastTimestamp = timestamp
    stats.frameCount += 1

    const sensorFrame = sensorHub.readFrame(timestamp)

    const featureFrame = featureExtractor.update(sensorFrame)
    const events = featureFrame
      ? detectors.flatMap((detector) => detector.update(featureFrame))
      : []

    if (events.length > 0) {
      gestureBus.publish(events)
      if (CONFIG.debug.log.gestures) {
        events.forEach((event) => console.info(`[gesture] ${event.type}`, event))
      }
      lastGestureType = gestureBus.getLastEvent()?.type ?? null
    }

    if (featureFrame) {
      const intent = mapper.update(featureFrame, events)
      pitchHz = intent.controls.pitchHz ?? null
      noteOnState = updateNoteState(noteOnState, intent.events)
      audio.handleIntent(intent)
      if (intent.events.length > 0 && CONFIG.debug.log.intents) {
        console.info('[intent]', intent)
      }
    } else {
      noteOnState = null
      pitchHz = null
    }

    overlay.render(
      sensorFrame,
      featureFrame,
      {
        gestureType: lastGestureType,
        noteOn: noteOnState,
        pitchHz,
      }
    )

    if (
      CONFIG.debug.log.loop &&
      timestamp - stats.lastLogTime >= LOG_INTERVAL_MS
    ) {
      const elapsed = timestamp - stats.lastLogTime
      const fps = (stats.frameCount * 1000) / elapsed
      const latencyBudgetMs = deltaMs

      // Log once per second to avoid flooding the console.
      console.info(
        `[loop] fps=${fps.toFixed(1)} frameDeltaMs=${deltaMs.toFixed(
          2
        )} latencyBudgetMs=${latencyBudgetMs.toFixed(2)}`
      )

      stats.frameCount = 0
      stats.lastLogTime = timestamp
    }

    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)
}

function setupDom(): { video: HTMLVideoElement; overlay: DebugOverlay } {
  const video = document.createElement('video')
  video.className = 'camera-feed'
  video.autoplay = true
  video.playsInline = true
  video.muted = true

  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) {
    throw new Error('Missing #app root element')
  }

  root.innerHTML = ''
  root.appendChild(video)
  const overlay = new DebugOverlay(root)

  return { video, overlay }
}

function updateNoteState(
  current: boolean | null,
  events: MusicalEvent[]
) {
  let next = current ?? false
  for (const event of events) {
    if (event.type === 'noteOn' || event.type === 'retrigger') {
      next = true
    } else if (event.type === 'noteOff') {
      next = false
    }
  }
  return next
}
