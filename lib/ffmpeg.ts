import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import { NasConfig, nasManager } from "./nas";
import { EncoderStatus, Camera, Output, StreamSettings } from "./types/ffmpeg";
import { resolveEncoder } from "./hwaccel";
import { maskRtspUrl } from "./security/encryption";
export class FFmpegProcess {
  public process: ChildProcessWithoutNullStreams | null = null;
  public logs: string[] = [];
  public status: EncoderStatus = "stopped";
  public stopping = false;
  public startTime: number = 0;

  public frames: number = 0;
  public dropped: number = 0;
  public fps: string = "";
  public bitrate: string = "";
  public resolution: string = "";
  public codec: string = "";
  public preset: string = "";
  public actualEncoder: string = "";
  public activeOutputs: number = 0;

  constructor(
    public cameraId: number,
    public cameraName: string,
  ) {}

  start(
    camera: Camera,
    outputs: Output[],
    nasConfig?: NasConfig,
    streamSettings?: StreamSettings,
  ) {
    if (this.process) throw new Error("Already running");

    const args: string[] = [];
    const hardwareEncoder = streamSettings?.hardwareEncoder || "software";
    const actualEncoder = resolveEncoder(streamSettings?.videoCodec || "h264", hardwareEncoder);
    this.actualEncoder = actualEncoder;
    
    let preset = streamSettings?.preset || "veryfast";
    const isQsvEncoder = hardwareEncoder === "qsv";
    if (isQsvEncoder) {
      preset = "none";
    }

    this.codec = streamSettings?.videoCodec || "h264";
    this.preset = preset === "none" ? "none" : preset;
    this.bitrate = streamSettings?.bitrate || "unknown";
    this.resolution = streamSettings?.outputResolution || "same";
    this.fps = camera.fps || "unknown";

    // Stability improvements
    args.push("-use_wallclock_as_timestamps", "1");
    args.push("-fflags", "+genpts");
    args.push("-thread_queue_size", "1024");

    // Default RTSP Transport to TCP
    if (camera.url.startsWith("rtsp://") && !args.includes("-rtsp_transport")) {
      args.push("-rtsp_transport", "tcp");
    }

    // Hardware acceleration arguments before -i
    if (hardwareEncoder === "qsv") {
      args.push("-hwaccel", "qsv");
      args.push("-hwaccel_output_format", "qsv");
    } else if (hardwareEncoder === "nvenc") {
      args.push("-hwaccel", "cuda");
      args.push("-hwaccel_output_format", "cuda");
    } else if (hardwareEncoder === "vaapi") {
      args.push("-hwaccel", "vaapi");
      args.push("-hwaccel_output_format", "vaapi");
      args.push("-vaapi_device", "/dev/dri/renderD128");
    }

    args.push("-i", camera.url);

    let bitrateArgs: string[] = [];
    if (streamSettings?.bitrate && streamSettings.bitrate !== "custom") {
      const br = streamSettings.bitrate;
      const numMatch = br.match(/(\d+)k/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        bitrateArgs = ["-b:v", br, "-maxrate", br, "-bufsize", `${num * 2}k`];
      } else {
        bitrateArgs = [
          "-b:v",
          br,
          "-maxrate",
          br,
          "-bufsize",
          `${parseInt(br, 10) * 2}k`,
        ];
      }
    }

    const resArgs: string[] = [];
    let resizeLog = "none";
    if (streamSettings?.outputResolution && streamSettings.outputResolution !== "same") {
      const res = streamSettings.outputResolution;
      const [w, h] = res.split("x");
      if (hardwareEncoder === "qsv" && w && h) {
        resArgs.push("-vf", `vpp_qsv=w=${w}:h=${h}`);
        resizeLog = `QSV VPP\nGenerated Filter: vpp_qsv=w=${w}:h=${h}`;
      } else if (hardwareEncoder === "nvenc" && w && h) {
        resArgs.push("-vf", `scale_cuda=${w}:${h}`);
        resizeLog = `CUDA Scale\nGenerated Filter: scale_cuda=${w}:${h}`;
      } else if (hardwareEncoder === "vaapi" && w && h) {
        resArgs.push("-vf", `scale_vaapi=w=${w}:h=${h}`);
        resizeLog = `VAAPI Scale\nGenerated Filter: scale_vaapi=w=${w}:h=${h}`;
      } else {
        resArgs.push("-vf", `scale=${res.replace("x", ":")}`);
        resizeLog = `Software Filter\nGenerated Filter: scale=${res.replace("x", ":")}`;
      }
    }

    const fpsArgs = camera.fps ? ["-r", camera.fps] : [];

    args.push("-c:v", actualEncoder);
    if (preset !== "none") {
      args.push("-preset", preset);
    }
    args.push(
      ...resArgs,
      ...fpsArgs,
      ...bitrateArgs,
    );
    args.push("-c:a", "aac");

    const teeOutputs: string[] = [];

    // Outputs
    let validOutputsCount = 0;
    outputs.forEach((out) => {
      let format = "flv";
      if (out.type === "dash") format = "dash";
      if (out.type === "hls") format = "hls";
      if (out.type === "file") format = "mp4";
      if (out.type === "rtmp") format = "flv";
      if (out.type === "rtsp") format = "rtsp";

      let finalUrl = out.url;
      if (finalUrl.startsWith("rtmp://")) {
        try {
          const urlObj = new URL(finalUrl);
          urlObj.hostname = "127.0.0.1";
          finalUrl = urlObj.toString();
        } catch (e) {}
      }

      // Workaround for some formats in tee
      if (format === "rtsp") {
        teeOutputs.push(`[f=rtsp]${finalUrl}`);
        validOutputsCount++;
      } else {
        teeOutputs.push(`[f=${format}]${finalUrl}`);
        validOutputsCount++;
      }
    });

    // Recording
    if (nasConfig?.storageMode === "record") {
      const basePath = nasManager.getBasePath(nasConfig);
      const duration = nasConfig.segmentDuration
        ? nasConfig.segmentDuration * 60
        : 300;
      const now = new Date();
      const YYYY = now.getFullYear().toString();
      const MM = (now.getMonth() + 1).toString().padStart(2, "0");
      const DD = now.getDate().toString().padStart(2, "0");

      const camStr = `cam${camera.id.toString().padStart(2, "0")}`;
      let pattern = nasConfig.folderPattern || "{cameraId}/{YYYY}/{MM}/{DD}";

      const currentDirPattern = pattern
        .replace("{cameraId}", camStr)
        .replace("{YYYY}", YYYY)
        .replace("{MM}", MM)
        .replace("{DD}", DD);
      const currentDirPath = path.join(basePath, currentDirPattern);
      if (!fs.existsSync(currentDirPath)) {
        try {
          fs.mkdirSync(currentDirPath, { recursive: true });
        } catch (e) {}
      }

      let ffmpegPattern = pattern
        .replace("{cameraId}", camStr)
        .replace("{YYYY}", "%Y")
        .replace("{MM}", "%m")
        .replace("{DD}", "%d");
      const outFilePath = path
        .join(basePath, ffmpegPattern, "%H-%M-%S.mp4")
        .replace(/\\/g, "/");

      teeOutputs.push(
        `[f=segment:segment_time=${duration}:reset_timestamps=1:strftime=1]${outFilePath}`,
      );
      validOutputsCount++;
    }

    if (teeOutputs.length > 0) {
      args.push(
        "-f",
        "tee",
        "-map",
        "0:v",
        "-map",
        "0:a?",
        teeOutputs.join("|"),
      );
    } else {
      // If nothing to do, just return
      return;
    }

    this.activeOutputs = validOutputsCount;

    const maskedArgs = args.map((arg) => maskRtspUrl(arg));
    const commandStr = `ffmpeg ${maskedArgs.join(" ")}`;
    const hwaccelType = actualEncoder.includes("qsv") ? "qsv" : actualEncoder.includes("nvenc") ? "cuda" : actualEncoder.includes("vaapi") ? "vaapi" : "none";
    const logHeader = `[Camera ${camera.id}] Starting ffmpeg with tee outputs: ${teeOutputs.length}\nSelected Encoder: ${actualEncoder}\nApplied Preset: ${preset}\nHardware Acceleration: ${hwaccelType}\nResize Mode: ${resizeLog}\nGenerated Command:\n${commandStr}`;
    console.log(logHeader);

    this.process = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
    this.status = "running";
    this.startTime = Date.now();
    this.logs.push(logHeader);

    this.process.on("error", (error) => {
      this.logs.push(
        `[${new Date().toISOString()}] FFmpeg process error: ${error.message}`,
      );
      this.status = "error";
    });

    this.process.stdout.on("data", (data) => {
      this.logs.push(data.toString());
      if (this.logs.length > 500) this.logs = this.logs.slice(-500);
    });

    this.process.stderr.on("data", (data) => {
      const msg = data.toString();
      this.logs.push(msg);

      const frameMatch = msg.match(/frame=\s*(\d+)/);
      if (frameMatch) this.frames = parseInt(frameMatch[1], 10);

      const dropMatch = msg.match(/drop=\s*(\d+)/);
      if (dropMatch) this.dropped = parseInt(dropMatch[1], 10);

      if (this.logs.length > 500) this.logs = this.logs.slice(-500);
    });

    this.process.on("close", (code) => {
      this.logs.push(
        `[${new Date().toISOString()}] FFmpeg exited. Code=${code}.`,
      );
      this.status = "stopped";
      this.process = null;
      this.stopping = false;
      this.startTime = 0;

      // Auto-restart logic would ideally be managed by Manager, but for simplicity we could emit event or just let manager poll
    });
  }

  stop() {
    if (!this.process) return;
    this.stopping = true;
    this.status = "stopping";
    try {
      if (this.process.stdin && this.process.stdin.writable) {
        this.process.stdin.write("q\n");
      } else {
        this.process.kill("SIGTERM");
      }
      setTimeout(() => {
        if (this.process) this.process.kill("SIGKILL");
      }, 5000);
    } catch (e) {
      this.process.kill("SIGKILL");
    }
  }

  getUptime() {
    return this.status === "running" && this.startTime > 0
      ? Math.floor((Date.now() - this.startTime) / 1000)
      : 0;
  }
}

class FFmpegManager {
  public processes: Map<number, FFmpegProcess> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private totalRestartCount = 0;
  private totalErrorCount = 0;

  start(
    cameras: Camera[],
    outputs: Output[],
    nasConfig?: NasConfig,
    streamSettings?: StreamSettings,
  ) {
    if (nasConfig?.storageMode === "record") {
      if (
        process.platform === "win32" &&
        nasConfig.type === "smb" &&
        nasConfig.username
      ) {
        try {
          const { execSync } = require("child_process");
          const pass = nasConfig.password ? ` ${nasConfig.password}` : "";
          const basePath = nasManager.getBasePath(nasConfig);
          execSync(`net use "${basePath}"${pass} /user:${nasConfig.username}`);
        } catch (e) {}
      }
    }

    cameras.forEach((cam) => {
      if (this.processes.has(cam.id)) {
        this.processes.get(cam.id)?.stop();
      }

      const camOutputs = outputs.filter((o) =>
        o.cameraMappings?.includes(cam.id),
      );
      if (camOutputs.length === 0 && nasConfig?.storageMode !== "record")
        return;

      const proc = new FFmpegProcess(cam.id, cam.name);
      proc.start(cam, camOutputs, nasConfig, streamSettings);
      this.processes.set(cam.id, proc);
    });

    if (nasConfig?.storageMode === "record" && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(
        () => {
          nasManager.cleanup(nasConfig).catch(console.error);
        },
        1000 * 60 * 60,
      );
      nasManager.cleanup(nasConfig).catch(console.error);
    }

    // Auto-restart checking loop
    setInterval(() => {
      this.processes.forEach((proc, id) => {
        if (proc.status === "stopped" && !proc.stopping) {
          // We'd restart here if needed, increment restart count
          this.totalRestartCount++;
        }
      });
    }, 10000);
  }

  stop() {
    this.processes.forEach((proc) => proc.stop());
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  getStatus() {
    const cameraStatuses = Array.from(this.processes.values()).map((p) => ({
      id: p.cameraId,
      name: p.cameraName,
      status: p.status,
      uptime: p.getUptime(),
      frames: p.frames,
      dropped: p.dropped,
      logs: p.logs.slice(-50),
      pid: p.process?.pid,
      codec: p.codec,
      actualEncoder: p.actualEncoder,
      resolution: p.resolution,
      bitrate: p.bitrate,
      activeOutputs: p.activeOutputs,
    }));

    const anyRunning = cameraStatuses.some((c) => c.status === "running");

    return {
      status: anyRunning ? "running" : "stopped",
      cameras: cameraStatuses,
      logs: cameraStatuses.flatMap((c) => c.logs).slice(-200), // legacy logs array
      uptime: Math.max(0, ...cameraStatuses.map((c) => c.uptime)),
      frames: cameraStatuses.reduce((a, b) => a + b.frames, 0),
      dropped: cameraStatuses.reduce((a, b) => a + b.dropped, 0),
    };
  }

  getLogs() {
    return Array.from(this.processes.values())
      .flatMap((c) => c.logs)
      .slice(-200);
  }

  getMetrics() {
    const statuses = Array.from(this.processes.values());
    const anyRunning = statuses.some((c) => c.status === "running");
    const runningCount = statuses.filter((c) => c.status === "running").length;
    const firstRunning = statuses.find((c) => c.status === "running");

    return {
      status: anyRunning ? 1 : 0,
      processCount: runningCount,
      activeInputs: statuses.length,
      activeOutputs: statuses.reduce((sum, p) => sum + p.activeOutputs, 0),
      uptimeSeconds: firstRunning ? firstRunning.getUptime() : 0,
      totalRestartCount: this.totalRestartCount,
      totalErrorCount: this.totalErrorCount,
      currentCodec: firstRunning?.codec || "",
      currentBitrate: firstRunning?.bitrate || "",
      currentResolution: firstRunning?.resolution || "",
      currentFps: firstRunning?.fps || "",
      currentPreset: firstRunning?.preset || "",
    };
  }

  isRunning() {
    return Array.from(this.processes.values()).some(
      (p) => p.status === "running",
    );
  }
}

declare global {
  var ffmpegManager: FFmpegManager | undefined;
}

export const ffmpegManager =
  global.ffmpegManager || (global.ffmpegManager = new FFmpegManager());
