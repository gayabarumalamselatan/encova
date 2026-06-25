import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export interface HwAccelCapabilities {
  software: boolean;
  qsv: boolean;
  nvenc: boolean;
  vaapi: boolean;
  amf: boolean;
}

let cachedCapabilities: HwAccelCapabilities | null = null;

export async function detectHardwareCapabilities(force = false): Promise<HwAccelCapabilities> {
  if (cachedCapabilities && !force) {
    return cachedCapabilities;
  }

  const caps: HwAccelCapabilities = {
    software: true,
    qsv: false,
    nvenc: false,
    vaapi: false,
    amf: false,
  };

  try {
    const { stdout: encoders } = await execAsync("ffmpeg -hide_banner -encoders");
    
    if (encoders.includes("qsv")) caps.qsv = true;
    if (encoders.includes("nvenc")) caps.nvenc = true;
    if (encoders.includes("vaapi")) caps.vaapi = true;
    if (encoders.includes("amf")) caps.amf = true;

    // Check for Docker/Linux device availability for vaapi/qsv
    if (process.platform === "linux") {
      try {
        if (!fs.existsSync("/dev/dri")) {
          caps.qsv = false;
          caps.vaapi = false;
        }
      } catch (e) {
        // Assume false if error
        caps.qsv = false;
        caps.vaapi = false;
      }
    }
  } catch (error) {
    console.error("Failed to detect hardware capabilities via ffmpeg:", error);
  }

  cachedCapabilities = caps;
  return caps;
}

export function resolveEncoder(codec: string, mode: string = "auto"): string {
  const isH265 = codec === "h265";
  
  if (mode === "software") {
    return isH265 ? "libx265" : "libx264";
  }

  if (cachedCapabilities) {
    const { qsv, nvenc, vaapi, amf } = cachedCapabilities;
    
    // Priority: qsv -> nvenc -> vaapi -> amf -> software
    if (qsv) return isH265 ? "hevc_qsv" : "h264_qsv";
    if (nvenc) return isH265 ? "hevc_nvenc" : "h264_nvenc";
    if (vaapi) return isH265 ? "hevc_vaapi" : "h264_vaapi";
    if (amf) return isH265 ? "hevc_amf" : "h264_amf";
  }

  return isH265 ? "libx265" : "libx264";
}

// Auto-run on startup
detectHardwareCapabilities().catch(console.error);
