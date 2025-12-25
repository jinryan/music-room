type ScaleName = "pentatonic" | "dorian";
type ScaleMode = "glide" | "quantize";

const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

export function midiToHz(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function mapNormalizedToScaleMidi(
  normalized: number,
  minMidi: number,
  maxMidi: number,
  scale: ScaleName,
  mode: ScaleMode,
) {
  const scaleMidi = buildScaleMidi(minMidi, maxMidi, scale);
  if (scaleMidi.length === 0) {
    return clamp(minMidi, minMidi, maxMidi);
  }

  const clamped = clamp(normalized, 0, 1);
  if (mode === "quantize") {
    const target = minMidi + clamped * (maxMidi - minMidi);
    return findNearest(scaleMidi, target);
  }

  const index = clamped * (scaleMidi.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.min(lowerIndex + 1, scaleMidi.length - 1);
  const t = index - lowerIndex;
  return lerp(scaleMidi[lowerIndex], scaleMidi[upperIndex], t);
}

function buildScaleMidi(minMidi: number, maxMidi: number, scale: ScaleName) {
  const intervals = SCALE_INTERVALS[scale];
  if (!intervals || intervals.length === 0) {
    return [];
  }

  const midiValues: number[] = [];
  const minOctave = Math.floor(minMidi / 12);
  const maxOctave = Math.floor(maxMidi / 12) + 1;

  for (let octave = minOctave; octave <= maxOctave; octave += 1) {
    for (const interval of intervals) {
      const midi = octave * 12 + interval;
      if (midi >= minMidi && midi <= maxMidi) {
        midiValues.push(midi);
      }
    }
  }

  return midiValues.sort((a, b) => a - b);
}

function findNearest(values: number[], target: number) {
  let best = values[0];
  let bestDiff = Math.abs(target - best);
  for (let i = 1; i < values.length; i += 1) {
    const value = values[i];
    const diff = Math.abs(target - value);
    if (diff < bestDiff) {
      best = value;
      bestDiff = diff;
    }
  }
  return best;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
