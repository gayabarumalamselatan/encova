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
        console.log("[HWACCEL] /dev/dri detected");
        caps.qsv.devicePresent = true;
        caps.vaapi.devicePresent = true;
      } else {
        console.log("[HWACCEL] /dev/dri not available");
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

    if (process.platform === "linux") {
      try {
        const { stdout: idOut } = await execAsync("id");
        console.log(`[HWACCEL] Current Identity:\n${idOut.trim()}`);
        if (!idOut.includes("render")) {
          console.log(`[HWACCEL] WARNING: 'render' group does not exist or user is not in it.`);
        }
        
        if (fs.existsSync("/dev/dri")) {
          const { stdout: lsOut } = await execAsync("ls -la /dev/dri");
          console.log(`[HWACCEL] /dev/dri contents:\n${lsOut.trim()}`);
          
          if (fs.existsSync("/dev/dri/renderD128")) {
            let canRead = false;
            let canWrite = false;
            try { await execAsync("test -r /dev/dri/renderD128"); canRead = true; } catch (e) {}
            try { await execAsync("test -w /dev/dri/renderD128"); canWrite = true; } catch (e) {}
            console.log(`[HWACCEL] /dev/dri/renderD128 permissions: readable=${canRead}, writable=${canWrite}`);
          }
        }
      } catch (e) {
        console.log(`[HWACCEL] Identity/permission check failed:`, e);
      }
    }

    // Validation testing
    const testEncode = async (encoder: string, args: string[], capsRef: any) => {
      console.log(`[HWACCEL] Checking encoder: ${encoder}`);
      if (capsRef.encoderPresent) {
        console.log(`[HWACCEL] Encoder found`);
        console.log(`[HWACCEL] Running validation test`);
        const commandStr = `ffmpeg ${args.join(" ")}`;
        const cwd = process.cwd();
        const pathEnv = process.env.PATH || "unknown";
        const startTime = Date.now();

        try {
          const { stdout, stderr } = await execAsync(commandStr);
          const duration = Date.now() - startTime;
          
          const logMsg = `[HWACCEL] Testing ${encoder}\n\nCommand:\n${commandStr}\n\nWorking Directory:\n${cwd}\n\nPATH:\n${pathEnv}\n\nExit Code:\n0\n\nSignal:\nnull\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nDuration:\n${duration}ms`;
          console.log(logMsg);
          console.log(`[HWACCEL] Validation PASSED`);
          capsRef.functional = true;
        } catch (e: any) {
          const duration = Date.now() - startTime;
          const exitCode = e.code !== undefined ? e.code : "unknown";
          const signal = e.signal !== undefined ? e.signal : "null";
          const stdout = e.stdout || "";
          const stderr = e.stderr || e.message || "";
          
          const logMsg = `[HWACCEL] Validation FAILED\n\nTesting ${encoder}\n\nCommand:\n${commandStr}\n\nWorking Directory:\n${cwd}\n\nPATH:\n${pathEnv}\n\nExit Code:\n${exitCode}\n\nSignal:\n${signal}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nDuration:\n${duration}ms`;
          console.log(logMsg);
          capsRef.functional = false;
          let reasonStr = `Exit code ${exitCode}`;
          if (stderr.includes("Error initializing an internal MFX session") || stderr.includes("unsupported (-3)") || stderr.includes("Permission denied")) {
            reasonStr = "GPU device permission issue";
          }
          capsRef.reason = reasonStr;
        }
      } else {
        console.log(`[HWACCEL] Encoder not found`);
        capsRef.functional = false;
        capsRef.reason = "Encoder not found";
      }
    };

    await testEncode("h264_qsv", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_qsv", "-f", "null", "-"], caps.qsv);
    await testEncode("h264_nvenc", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_nvenc", "-f", "null", "-"], caps.nvenc);
    await testEncode("h264_vaapi", ["-vaapi_device", "/dev/dri/renderD128", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_vaapi", "-f", "null", "-"], caps.vaapi);
    await testEncode("h264_amf", ["-f", "lavfi", "-i", "testsrc=size=640x360:rate=30", "-t", "1", "-c:v", "h264_amf", "-f", "null", "-"], caps.amf);

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
