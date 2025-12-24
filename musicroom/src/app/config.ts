export const CONFIG = {
  filters: {
    positionEMAAlpha: 0.25,
    velocityEMAAlpha: 0.35,
    minDtSeconds: 1 / 240,
  },
  detectors: {
    move: {
      startSpeed: 0.5,
      stopSpeed: 0.4,
    },
    direction: {
      minSpeed: 0.6,
      minAxisSpeed: 0.15,
      cooldownMs: 200,
    },
  },
  mapping: {
    pitch: {
      minMidi: 50,
      maxMidi: 74,
      scale: 'pentatonic' as const,
      mode: 'glide' as const,
    },
  },
  audio: {
    attackMs: 30,
    releaseMs: 80,
    pitchSlewMs: 30,
    retriggerGapMs: 100,
  },
  debug: {
    log: {
      loop: true,
      gestures: true,
      intents: true,
      directionCheck: false,
    },
  },
  ui: {
    hudEmpty: '--',
    overlay: {
      colors: {
        raw: '#f5a847',
        smooth: '#47f5a2',
        velocity: '#4dc6ff',
      },
      dotRadius: {
        raw: 6,
        smooth: 10,
      },
      velocityScale: 0.25,
      velocityArrow: {
        lineWidth: 3,
        headLength: 12,
      },
    },
  },
}
