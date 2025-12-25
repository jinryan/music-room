export const CONFIG = {
  /**
   * Filters are used to smooth the input data.
   * ema alpha used in src/features/filters.ts
   */
  filters: {
    positionEMAAlpha: 0.25,
    velocityEMAAlpha: 0.35,
    minDtSeconds: 1 / 240,
  },

  /**
   * Detectors are used to detect gestures in the input data.
   */
  detectors: {
    /**
     * startSpeed: speed threshold for move onset detection.
     * stopSpeed: speed threshold for move stop detection.
     */
    move: {
      startSpeed: 0.3,
      stopSpeed: 0.2,
    },
    /**
     * direction: used to detect direction changes in the input data.
     * minAxisSpeed: speed threshold for x-axis direction change detection.
     * cooldownMs: refactory period in ms after a direction change is triggered.
     */
    direction: {
      minAxisSpeed: 0.4,
      cooldownMs: 200,
    },
  },

  /**
   * Mapping is used to map the input data to musical notes.
   */
  mapping: {
    /**
     * pitch: used to map the input data to musical notes.
     * minMidi: minimum MIDI note.
     * maxMidi: maximum MIDI note.
     * scale: scale to use for the mapping.
     * mode: mode to use for the mapping.
     */
    pitch: {
      minMidi: 50,
      maxMidi: 74,
      scale: "pentatonic" as const,
      mode: "glide" as const,
    },
  },

  /**
   * Audio is used to render the musical notes.
   */
  audio: {
    attackMs: 30,
    releaseMs: 80,
    pitchSlewMs: 30,
    retriggerGapMs: 100,
  },

  /**
   * Debug is used to log the input data.
   */
  debug: {
    log: {
      loop: true,
      gestures: true,
      render: true,
      directionCheck: false,
      logIntervalMs: 1000,
    },
  },

  /**
   * UI is used to display the input data.
   */
  ui: {
    hudEmpty: "--",
    overlay: {
      colors: {
        raw: "#f5a847",
        smooth: "#47f5a2",
        velocity: "#4dc6ff",
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
};
