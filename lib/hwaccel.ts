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
    
    // Step 1: Check FFmpeg
    let hasFfmpeg = false;
    try {
      await execAsync("ffmpeg -version");
      hasFfmpeg = true;
    } catch (e) {
      console.log("[HWACCEL] FFmpeg not found");
      return caps; // Exit early if no ffmpeg
    }

    // Step 2: List hardware accelerators
    try {
      const { stdout: hwaccels } = await execAsync("ffmpeg -hide_banner -hwaccels");
      if (hwaccels.includes("qsv")) caps.qsv.devicePresent = true; // Temporary flag
      if (hwaccels.includes("vaapi")) caps.vaapi.devicePresent = true;
      if (hwaccels.includes("cuda")) caps.nvenc.devicePresent = true;
    } catch (e) {}

    // Step 3: List encoders
    const { stdout: encoders } = await execAsync("ffmpeg -hide_banner -encoders");
    if (encoders.includes("h264_qsv")) caps.qsv.encoderPresent = true;
    if (encoders.includes("h264_nvenc")) caps.nvenc.encoderPresent = true;
    if (encoders.includes("h264_vaapi")) caps.vaapi.encoderPresent = true;
    if (encoders.includes("h264_amf")) caps.amf.encoderPresent = true;

    // Validate QSV/VAAPI on Linux
    if (process.platform === "linux") {
      let qsvPreChecksPassed = true;
      let qsvReason = "";

      // Step 4: Check /dev/dri
      if (!fs.existsSync("/dev/dri")) {
        qsvPreChecksPassed = false;
        qsvReason = "No Intel GPU device found. (/dev/dri missing)";
      }

      // Step 5: Check render node
      if (qsvPreChecksPassed && !fs.existsSync("/dev/dri/renderD128")) {
        qsvPreChecksPassed = false;
        qsvReason = "/dev/dri/renderD128 is missing.";
      }

      // Step 6: Check Intel VA driver
      let hasIhd = false;
      if (qsvPreChecksPassed) {
        try {
          const { stdout: findOut } = await execAsync("find /usr -name \"iHD_drv_video.so\" 2>/dev/null || true");
          if (findOut.trim() !== "") {
            hasIhd = true;
          }
        } catch (e) {}
        
        if (!hasIhd) {
          qsvPreChecksPassed = false;
          qsvReason = "Intel Media Driver (iHD_drv_video.so) is not installed.";
        }
      }

      // Step 7: Run vainfo
      if (qsvPreChecksPassed) {
        try {
          await execAsync("vainfo --display drm");
        } catch (e) {
          qsvPreChecksPassed = false;
          qsvReason = "vainfo failed to initialize the Intel driver.";
        }
      }

      if (!caps.qsv.encoderPresent) {
        qsvPreChecksPassed = false;
        qsvReason = "FFmpeg was compiled without QSV support.";
      }

      if (!qsvPreChecksPassed) {
        console.log(`[HWACCEL] QSV pre-checks failed: ${qsvReason}`);
        caps.qsv.functional = false;
        caps.qsv.reason = qsvReason;
        caps.vaapi.functional = false;
        caps.vaapi.reason = qsvReason;
      } else {
        // Step 8: Test Encode for QSV
        console.log(`[HWACCEL] QSV pre-checks passed. Running test encode.`);
        try {
          await execAsync("ffmpeg -f lavfi -i testsrc=size=640x360:rate=30 -t 1 -c:v h264_qsv -f null -");
          caps.qsv.functional = true;
          caps.vaapi.functional = true; // Assuming vaapi works if QSV works
          console.log(`[HWACCEL] QSV Validation PASSED`);
        } catch (e: any) {
          console.log(`[HWACCEL] QSV Validation FAILED: ${e.message}`);
          caps.qsv.functional = false;
          caps.qsv.reason = "QSV encoder exists but failed to initialize.";
          caps.vaapi.functional = false;
          caps.vaapi.reason = "VAAPI encoder failed to initialize.";
        }
      }
    }

    // Windows validation (simplified, kept as before)
    if (process.platform === "win32") {
      caps.qsv.devicePresent = caps.qsv.encoderPresent;
      caps.nvenc.devicePresent = caps.nvenc.encoderPresent;
      caps.vaapi.devicePresent = caps.vaapi.encoderPresent;
      caps.amf.devicePresent = caps.amf.encoderPresent;
      
      const testEncode = async (encoder: string, args: string[], capsRef: any) => {
        if (capsRef.encoderPresent) {
          try {
            await execAsync(`ffmpeg ${args.join(" ")}`);
            capsRef.functional = true;
          } catch (e: any) {
            capsRef.functional = false;
            capsRef.reason = `Exit code ${e.code || "unknown"}`;
          }
        } else {
          capsRef.functional = false;
          capsRef.reason = "Encoder not found";
        }
      };

      await testEncode("h264_qsv", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_qsv", "-f", "null", "-"], caps.qsv);
      await testEncode("h264_nvenc", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_nvenc", "-f", "null", "-"], caps.nvenc);
      await testEncode("h264_amf", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_amf", "-f", "null", "-"], caps.amf);
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
