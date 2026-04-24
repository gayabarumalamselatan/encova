export type CompressionLevel = "low" | "medium" | "high";

export interface CompressionOptions {
  level: CompressionLevel;
}

export interface CompressionResult {
  filename: string;
  originalSize: number;
  compressedSize: number;
  downloadUrl: string;
}

export type CompressionHandler = (
  inputPath: string,
  outputPath: string,
  options: CompressionOptions
) => Promise<void>;
