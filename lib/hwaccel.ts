import { exec, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

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

/**
 * Reusable helper to validate a hardware encoder by running a real encode command.
 */
export async function validateHardwareEncoder(
  encoder: string,
  ffmpegArguments: string[]
): Promise<{ functional: boolean; reason?: string; executionTimeMs: number }> {
  const startTime = Date.now();
  try {
    await execFileAsync("ffmpeg", ffmpegArguments);
    const executionTimeMs = Date.now() - startTime;
    return { functional: true, executionTimeMs };
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    const reason = (error.stderr || error.stdout || error.message || "Unknown error").toString().trim();
    return { functional: false, reason, executionTimeMs };
  }
}

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

    // Step 1: Check FFmpeg availability
    let ffmpegVersion = "";
    try {
      const { stdout } = await execAsync("ffmpeg -version");
      ffmpegVersion = stdout.split("\n")[0];
      console.log(`[HWACCEL] FFmpeg found: ${ffmpegVersion}`);
    } catch (e) {
      console.log("[HWACCEL] FFmpeg not found. Hardware acceleration unavailable.");
      const noFfmpegReason = "FFmpeg is not installed or not available in PATH.";
      caps.qsv.reason = noFfmpegReason;
      caps.nvenc.reason = noFfmpegReason;
      caps.vaapi.reason = noFfmpegReason;
      caps.amf.reason = noFfmpegReason;
      cachedCapabilities = caps;
      return caps;
    }

    // Step 2: Fetch available encoders
    let encodersOutput = "";
    try {
      const { stdout } = await execAsync("ffmpeg -hide_banner -encoders");
      encodersOutput = stdout;
    } catch (e: any) {
      console.warn("[HWACCEL] Failed to query ffmpeg encoders:", e.message);
    }

    // ==========================================
    // Stage 1: Intel QSV Detection & Validation
    // ==========================================
    console.log("[HWACCEL] Checking QSV encoder...");
    caps.qsv.encoderPresent = encodersOutput.includes("h264_qsv") || encodersOutput.includes("hevc_qsv");
    console.log(`[HWACCEL] [QSV] Encoder present: ${caps.qsv.encoderPresent}`);

    // QSV Device Check
    if (process.platform === "linux") {
      let qsvDev = false;
      if (fs.existsSync("/dev/dri")) {
        if (fs.existsSync("/dev/dri/renderD128")) {
          qsvDev = true;
        } else {
          try {
            const driFiles = fs.readdirSync("/dev/dri");
            if (driFiles.some((f) => f.startsWith("renderD"))) {
              qsvDev = true;
            }
          } catch (e) {}
        }
      }
      if (!qsvDev) {
        try {
          await execAsync("vainfo --display drm");
          qsvDev = true;
        } catch (e) {}
      }
      caps.qsv.devicePresent = qsvDev;
    } else {
      try {
        const { stdout: hwaccels } = await execAsync("ffmpeg -hide_banner -hwaccels");
        caps.qsv.devicePresent = hwaccels.includes("qsv") || caps.qsv.encoderPresent;
      } catch (e) {
        caps.qsv.devicePresent = caps.qsv.encoderPresent;
      }
    }
    console.log(`[HWACCEL] [QSV] Device present: ${caps.qsv.devicePresent}`);

    // QSV Functional Check
    if (caps.qsv.encoderPresent) {
      console.log("[HWACCEL] [QSV] Running one-second hardware encode test...");
      const qsvArgs = [
        "-hide_banner",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=size=640x360:rate=30",
        "-vf", "format=nv12",
        "-c:v", "h264_qsv",
        "-t", "1",
        "-f", "null", "-"
      ];
      const qsvRes = await validateHardwareEncoder("h264_qsv", qsvArgs);
      caps.qsv.functional = qsvRes.functional;
      if (qsvRes.functional) {
        delete caps.qsv.reason;
        console.log(`[HWACCEL] [QSV] Validation PASSED (${qsvRes.executionTimeMs}ms)`);
      } else {
        caps.qsv.reason = qsvRes.reason;
        console.log(`[HWACCEL] [QSV] Validation FAILED.\nReason:\n${qsvRes.reason}`);
      }
    } else {
      caps.qsv.functional = false;
      caps.qsv.reason = "QSV encoder (h264_qsv / hevc_qsv) not found in FFmpeg.";
    }

    // ==========================================
    // Stage 2: VAAPI Detection & Validation
    // ==========================================
    console.log("[HWACCEL] Checking VAAPI encoder...");
    caps.vaapi.encoderPresent = encodersOutput.includes("h264_vaapi") || encodersOutput.includes("hevc_vaapi");
    console.log(`[HWACCEL] [VAAPI] Encoder present: ${caps.vaapi.encoderPresent}`);

    // VAAPI Device Check
    if (process.platform === "linux") {
      let vaapiDev = false;
      if (fs.existsSync("/dev/dri")) {
        if (fs.existsSync("/dev/dri/renderD128")) {
          vaapiDev = true;
        } else {
          try {
            const driFiles = fs.readdirSync("/dev/dri");
            if (driFiles.some((f) => f.startsWith("renderD"))) {
              vaapiDev = true;
            }
          } catch (e) {}
        }
      }
      if (!vaapiDev) {
        try {
          await execAsync("vainfo --display drm");
          vaapiDev = true;
        } catch (e) {}
      }
      caps.vaapi.devicePresent = vaapiDev;
    } else {
      try {
        const { stdout: hwaccels } = await execAsync("ffmpeg -hide_banner -hwaccels");
        caps.vaapi.devicePresent = hwaccels.includes("vaapi");
      } catch (e) {
        caps.vaapi.devicePresent = false;
      }
    }
    console.log(`[HWACCEL] [VAAPI] Device present: ${caps.vaapi.devicePresent}`);

    // VAAPI Functional Check
    if (caps.vaapi.encoderPresent) {
      console.log("[HWACCEL] [VAAPI] Running one-second hardware encode test...");
      let vaapiDevArg: string[] = [];
      if (fs.existsSync("/dev/dri/renderD128")) {
        vaapiDevArg = ["-vaapi_device", "/dev/dri/renderD128"];
      } else if (fs.existsSync("/dev/dri")) {
        try {
          const driFiles = fs.readdirSync("/dev/dri");
          const renderNode = driFiles.find((f) => f.startsWith("renderD"));
          if (renderNode) {
            vaapiDevArg = ["-vaapi_device", `/dev/dri/${renderNode}`];
          }
        } catch (e) {}
      }

      const vaapiArgs = [
        "-hide_banner",
        "-y",
        ...vaapiDevArg,
        "-f", "lavfi",
        "-i", "testsrc=size=640x360:rate=30",
        "-vf", "format=nv12,hwupload",
        "-c:v", "h264_vaapi",
        "-t", "1",
        "-f", "null", "-"
      ];
      const vaapiRes = await validateHardwareEncoder("h264_vaapi", vaapiArgs);
      caps.vaapi.functional = vaapiRes.functional;
      if (vaapiRes.functional) {
        delete caps.vaapi.reason;
        console.log(`[HWACCEL] [VAAPI] Validation PASSED (${vaapiRes.executionTimeMs}ms)`);
      } else {
        caps.vaapi.reason = vaapiRes.reason;
        console.log(`[HWACCEL] [VAAPI] Validation FAILED.\nReason:\n${vaapiRes.reason}`);
      }
    } else {
      caps.vaapi.functional = false;
      caps.vaapi.reason = "VAAPI encoder (h264_vaapi / hevc_vaapi) not found in FFmpeg.";
    }

    // ==========================================
    // Stage 3: NVIDIA (NVENC) Detection & Validation
    // ==========================================
    console.log("[HWACCEL] Checking NVENC encoder...");
    caps.nvenc.encoderPresent = encodersOutput.includes("h264_nvenc") || encodersOutput.includes("hevc_nvenc");
    console.log(`[HWACCEL] [NVENC] Encoder present: ${caps.nvenc.encoderPresent}`);

    // NVENC Device Check
    let nvencDev = false;
    try {
      await execAsync("nvidia-smi");
      nvencDev = true;
    } catch (e) {
      if (fs.existsSync("/dev/nvidia0") || fs.existsSync("/dev/nvidiactl")) {
        nvencDev = true;
      } else {
        try {
          const { stdout: hwaccels } = await execAsync("ffmpeg -hide_banner -hwaccels");
          if (hwaccels.includes("cuda")) {
            nvencDev = true;
          }
        } catch (e2) {}
      }
    }
    caps.nvenc.devicePresent = nvencDev;
    console.log(`[HWACCEL] [NVENC] Device present: ${caps.nvenc.devicePresent}`);

    // NVENC Functional Check
    if (caps.nvenc.encoderPresent) {
      console.log("[HWACCEL] [NVENC] Running one-second hardware encode test...");
      const nvencArgs = [
        "-hide_banner",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=size=640x360:rate=30",
        "-c:v", "h264_nvenc",
        "-t", "1",
        "-f", "null", "-"
      ];
      const nvencRes = await validateHardwareEncoder("h264_nvenc", nvencArgs);
      caps.nvenc.functional = nvencRes.functional;
      if (nvencRes.functional) {
        delete caps.nvenc.reason;
        console.log(`[HWACCEL] [NVENC] Validation PASSED (${nvencRes.executionTimeMs}ms)`);
      } else {
        caps.nvenc.reason = nvencRes.reason;
        console.log(`[HWACCEL] [NVENC] Validation FAILED.\nReason:\n${nvencRes.reason}`);
      }
    } else {
      caps.nvenc.functional = false;
      caps.nvenc.reason = "NVENC encoder (h264_nvenc / hevc_nvenc) not found in FFmpeg.";
    }

    // ==========================================
    // Stage 4: AMD (AMF) Detection & Validation
    // ==========================================
    console.log("[HWACCEL] Checking AMF encoder...");
    caps.amf.encoderPresent = encodersOutput.includes("h264_amf") || encodersOutput.includes("hevc_amf");
    console.log(`[HWACCEL] [AMF] Encoder present: ${caps.amf.encoderPresent}`);

    // AMF Device Check
    let amfDev = false;
    if (process.platform === "win32") {
      try {
        const { stdout: hwaccels } = await execAsync("ffmpeg -hide_banner -hwaccels");
        amfDev = hwaccels.includes("amf") || caps.amf.encoderPresent;
      } catch (e) {
        amfDev = caps.amf.encoderPresent;
      }
    } else {
      if (fs.existsSync("/dev/kfd") || fs.existsSync("/dev/dri")) {
        amfDev = true;
      }
    }
    caps.amf.devicePresent = amfDev;
    console.log(`[HWACCEL] [AMF] Device present: ${caps.amf.devicePresent}`);

    // AMF Functional Check
    if (caps.amf.encoderPresent) {
      console.log("[HWACCEL] [AMF] Running one-second hardware encode test...");
      const amfArgs = [
        "-hide_banner",
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=size=640x360:rate=30",
        "-c:v", "h264_amf",
        "-t", "1",
        "-f", "null", "-"
      ];
      const amfRes = await validateHardwareEncoder("h264_amf", amfArgs);
      caps.amf.functional = amfRes.functional;
      if (amfRes.functional) {
        delete caps.amf.reason;
        console.log(`[HWACCEL] [AMF] Validation PASSED (${amfRes.executionTimeMs}ms)`);
      } else {
        caps.amf.reason = amfRes.reason;
        console.log(`[HWACCEL] [AMF] Validation FAILED.\nReason:\n${amfRes.reason}`);
      }
    } else {
      caps.amf.functional = false;
      caps.amf.reason = "AMF encoder (h264_amf / hevc_amf) not found in FFmpeg.";
    }

  } catch (error: any) {
    console.error("[HWACCEL] Unexpected failure during hardware capability detection:", error);
  }

  console.log("[HWACCEL] Hardware acceleration capability check complete:", JSON.stringify(caps, null, 2));
  cachedCapabilities = caps;
  return caps;
}

export function resolveEncoder(codec: string, hardwareEncoder: string = "software"): string {
  const isH265 = codec === "h265";

  switch (hardwareEncoder) {
    case "qsv":
      return isH265 ? "hevc_qsv" : "h264_qsv";
    case "nvenc":
      return isH265 ? "hevc_nvenc" : "h264_nvenc";
    case "vaapi":
      return isH265 ? "hevc_vaapi" : "h264_vaapi";
    case "amf":
      return isH265 ? "hevc_amf" : "h264_amf";
    case "software":
    default:
      return isH265 ? "libx265" : "libx264";
  }
}

// Auto-run on startup
detectHardwareCapabilities().catch(console.error);
