export type EncoderStatus =
  | "stopped"
  | "starting"
  | "running"
  | "error"
  | "stopping";

export interface Camera {
  id: number;
  name: string;
  sourceType: string;
  url: string;
  resolution: string;
  fps: string;
}

export interface Output {
  id: number;
  type: string;
  url: string;
  cameraMappings: number[];
}

export interface StreamSettings {
  videoCodec?: string;
  preset?: string;
  bitrate?: string;
  outputResolution?: string;
}
