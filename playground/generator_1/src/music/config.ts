export type Chord = {
  root: string;
  notes: string[];
  name: string;
};

export const CONFIG = {
  tempo: 120, // BPM
  key: "A",
  scale: ["A", "B", "C", "D", "E", "F", "G"], // A natural minor
  chordProgression: [
    { root: "A", notes: ["A2", "C3", "E3"], name: "Am" }, // i
    { root: "F", notes: ["F2", "A2", "C3"], name: "F" }, // VI
    { root: "C", notes: ["C3", "E3", "G3"], name: "C" }, // III
    { root: "G", notes: ["G2", "B2", "D3"], name: "G" }, // VII
  ] as Chord[],
  barsPerChord: 2, // Each chord lasts 2 bars
  beatsPerBar: 4,
  totalBars: 8, // Total loop length
  totalBeats: 32, // 8 bars * 4 beats
} as const;


