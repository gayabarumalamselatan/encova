import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export interface HwStatus {
  encoderPresent: boolean;
  devicePresent: boolean;
  functional: boolean;
  reason?: string;
}

export interface HwAccelCapabilities {
  software: { functional: boolean };
  qsv: HwStatus;
  nvenc: HwStatus;
  vaapi: HwStatus;
  amf: HwStatus;
}

let cachedCapabilities: HwAccelCapabilities | null = null;

export async function detectHardwareCapabilities(force = false): Promise<HwAccelCapabilities> {
  if (cachedCapabilities && !force) {
    return cachedCapabilities;
  }

  const caps: HwAccelCapabilities = {
    software: { functional: true },
    qsv: { encoderPresent: false, devicePresent: false, functional: false },
    nvenc: { encoderPresent: false, devicePresent: false, functional: false },
    vaapi: { encoderPresent: false, devicePresent: false, functional: false },
    amf: { encoderPresent: false, devicePresent: false, functional: false },
  };

  try {
    console.log("[HWACCEL] Starting hardware acceleration capability check...");
    const { stdout: encoders } = await execAsync("ffmpeg -hide_banner -encoders");
    
    if (encoders.includes("qsv")) caps.qsv.encoderPresent = true;
    if (encoders.includes("nvenc")) caps.nvenc.encoderPresent = true;
    if (encoders.includes("vaapi")) caps.vaapi.encoderPresent = true;
    if (encoders.includes("amf")) caps.amf.encoderPresent = true;

    // Device presence
    if (process.platform === "linux") {
      if (fs.existsSync("/dev/dri")) {
        caps.qsv.devicePresent = true;
        caps.vaapi.devicePresent = true;
      }
      if (fs.existsSync("/dev/nvidia0") || fs.existsSync("/dev/nvidiactl")) {
        caps.nvenc.devicePresent = true;
      } else {
        try {
          await execAsync("nvidia-smi");
          caps.nvenc.devicePresent = true;
        } catch (e) {
          caps.nvenc.devicePresent = false;
        }
      }
    } else if (process.platform === "win32") {
      caps.qsv.devicePresent = caps.qsv.encoderPresent;
      caps.nvenc.devicePresent = caps.nvenc.encoderPresent;
      caps.vaapi.devicePresent = caps.vaapi.encoderPresent;
      caps.amf.devicePresent = caps.amf.encoderPresent;
    }

    // Validation testing
    if (caps.qsv.encoderPresent && caps.qsv.devicePresent) {
      try {
        await execAsync("ffmpeg -f lavfi -i testsrc=size=128x128:rate=1 -t 1 -c:v h264_qsv -f null -");
        caps.qsv.functional = true;
      } catch (e: any) {
        caps.qsv.functional = false;
        caps.qsv.reason = "QSV test failed";
      }
    } else {
       caps.qsv.reason = caps.qsv.encoderPresent ? "No Intel GPU detected" : "Encoder not found";
    }

    if (caps.nvenc.encoderPresent && caps.nvenc.devicePresent) {
      try {
        const { stderr } = await execAsync("ffmpeg -f lavfi -i testsrc=size=128x128:rate=1 -t 1 -c:v h264_nvenc -f null -");
        if (stderr.includes("Cannot load libcuda.so.1")) {
          caps.nvenc.functional = false;
          caps.nvenc.reason = "Cannot load libcuda.so.1";
        } else {
          caps.nvenc.functional = true;
        }
      } catch (e: any) {
        caps.nvenc.functional = false;
        caps.nvenc.reason = "NVENC test failed";
      }
    } else {
       caps.nvenc.reason = caps.nvenc.encoderPresent ? "No NVIDIA GPU detected" : "Encoder not found";
    }

    if (caps.vaapi.encoderPresent && caps.vaapi.devicePresent) {
      try {
        await execAsync("ffmpeg -vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc=size=128x128:rate=1 -t 1 -c:v h264_vaapi -f null -");
        caps.vaapi.functional = true;
      } catch (e: any) {
        caps.vaapi.functional = false;
        caps.vaapi.reason = "VAAPI test failed";
      }
    } else {
       caps.vaapi.reason = caps.vaapi.encoderPresent ? "No VAAPI device detected" : "Encoder not found";
    }

    if (caps.amf.encoderPresent && caps.amf.devicePresent) {
      try {
        await execAsync("ffmpeg -f lavfi -i testsrc=size=128x128:rate=1 -t 1 -c:v h264_amf -f null -");
        caps.amf.functional = true;
      } catch (e: any) {
        caps.amf.functional = false;
        caps.amf.reason = "AMF test failed";
      }
    } else {
       caps.amf.reason = caps.amf.encoderPresent ? "No AMD GPU detected" : "Encoder not found";
    }

  } catch (error) {
    console.error("[HWACCEL] Failed to detect hardware capabilities via ffmpeg:", error);
  }

  console.log("[HWACCEL] Hardware acceleration capability check complete:", JSON.stringify(caps, null, 2));
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
    if (qsv.functional) return isH265 ? "hevc_qsv" : "h264_qsv";
    if (nvenc.functional) return isH265 ? "hevc_nvenc" : "h264_nvenc";
    if (vaapi.functional) return isH265 ? "hevc_vaapi" : "h264_vaapi";
    if (amf.functional) return isH265 ? "hevc_amf" : "h264_amf";
  }

  return isH265 ? "libx265" : "libx264";
}

// Auto-run on startup
detectHardwareCapabilities().catch(console.error);
