// A short-lived bundle of commands and continuous controls that tell the music engine what to do right now.
// Ephemeral, stateless, and consumed immediately (e.g., a MIDI bundle or draw call).
export type RenderPacket = {
  timestamp: number;
  events: RenderEvent[];
  controls: Record<string, number>;
};

export type RenderEvent =
  | { type: "noteOn" }
  | { type: "noteOff" }
  | { type: "retrigger" }; // keep for future; engine already supports it. Or remove?

// Interface: anything that consumes render commands implements this shape (e.g., Music Engine).
export type RenderConsumer = {
  handleRender: (packet: RenderPacket) => void;
};
