import type { RenderConsumer } from "../render/types";

export type AudioEngine = RenderConsumer & {
  resume: () => Promise<void>;
};
