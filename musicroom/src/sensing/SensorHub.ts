import type { RawSensorData, SensorFrame } from "./types";

export type SensorReader = {
  readFrame: (timestamp: number) => RawSensorData;
};

export class SensorHub {
  private sensors = new Map<string, SensorReader>();

  register(id: string, sensor: SensorReader) {
    this.sensors.set(id, sensor);
  }

  readFrame(timestamp: number): SensorFrame {
    const sources: Record<string, RawSensorData> = {};

    for (const [id, sensor] of this.sensors.entries()) {
      sources[id] = sensor.readFrame(timestamp);
    }

    return {
      timestamp,
      sources,
    };
  }
}
