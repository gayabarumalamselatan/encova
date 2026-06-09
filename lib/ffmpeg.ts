import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import { NasConfig, nasManager } from "./nas";

type EncoderStatus = "stopped" | "running" | "error" | "stopping";

interface Camera {
  id: number;
  name: string;
  sourceType: string;
  url: string;
  resolution: string;
  fps: string;
}

interface Output {
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

class FFmpegManager {
  private process: ChildProcessWithoutNullStreams | null = null;
  private logs: string[] = [];
  private status: EncoderStatus = "stopped";
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stopping = false;
  private startTime: number = 0;
  private activeInputs: number = 0;
  private activeOutputs: number = 0;

  // getInstanceId() {
  //   return this.instanceId;
  // }
  start(
    cameras: Camera[],
    outputs: Output[],
    nasConfig?: NasConfig,
    streamSettings?: StreamSettings,
  ) {
    if (this.process) {
      throw new Error("Encoder is already running");
    }

    const args: string[] = [];

    const vcodec =
      streamSettings?.videoCodec === "h265" ? "libx265" : "libx264";
    const preset = streamSettings?.preset || "veryfast";

    let bitrateArgs: string[] = [];
    if (streamSettings?.bitrate && streamSettings.bitrate !== "custom") {
      const br = streamSettings.bitrate;
      const numMatch = br.match(/(\d+)k/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        const buf = num * 2;
        bitrateArgs = ["-b:v", br, "-maxrate", br, "-bufsize", `${buf}k`];
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

    const resArgs =
      streamSettings?.outputResolution &&
      streamSettings.outputResolution !== "same"
        ? ["-s", streamSettings.outputResolution]
        : [];

    // Push each camera as an input stream
    cameras.forEach((cam) => {
      args.push("-i", cam.url || "");
    });

    // Map outputs
    outputs.forEach((out) => {
      if (out.cameraMappings && out.cameraMappings.length > 0) {
        const camId = out.cameraMappings[0];
        const camIndex = cameras.findIndex((c) => c.id === camId);
        if (camIndex !== -1) {
          const fps = cameras[camIndex].fps;
          const fpsArgs = fps ? ["-r", fps] : [];

          args.push(
            "-map",
            `${camIndex}:v`,
            "-c:v",
            vcodec,
            "-preset",
            preset,
            ...resArgs,
            ...fpsArgs,
            ...bitrateArgs,
            "-map",
            `${camIndex}:a?`,
            "-c:a",
            "aac",
          );

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
            } catch (e) {
              // fallback to original if parsing fails
            }
          }

          args.push("-f", format, finalUrl);
        }
      }
    });

    // Add recording outputs if enabled
    if (nasConfig?.storageMode === "record") {
      const basePath = nasManager.getBasePath(nasConfig);
      const duration = nasConfig.segmentDuration
        ? nasConfig.segmentDuration * 60
        : 300;

      // Before starting, we want to ensure base access
      if (
        process.platform === "win32" &&
        nasConfig.type === "smb" &&
        nasConfig.username
      ) {
        try {
          const { execSync } = require("child_process");
          const pass = nasConfig.password ? ` ${nasConfig.password}` : "";
          execSync(`net use "${basePath}"${pass} /user:${nasConfig.username}`);
        } catch (e) {}
      }

      const now = new Date();
      const YYYY = now.getFullYear().toString();
      const MM = (now.getMonth() + 1).toString().padStart(2, "0");
      const DD = now.getDate().toString().padStart(2, "0");

      cameras.forEach((cam) => {
        // Only record cameras that are mapped to at least one output (i.e. being encoded)
        const isMapped = outputs.some((out) =>
          out.cameraMappings?.includes(cam.id),
        );
        if (isMapped) {
          const camIndex = cameras.findIndex((c) => c.id === cam.id);

          const camStr = `cam${cam.id.toString().padStart(2, "0")}`;
          let pattern =
            nasConfig.folderPattern || "{cameraId}/{YYYY}/{MM}/{DD}";

          // Pre-create current folder directory for ffmpeg
          const currentDirPattern = pattern
            .replace("{cameraId}", camStr)
            .replace("{YYYY}", YYYY)
            .replace("{MM}", MM)
            .replace("{DD}", DD);

          const currentDirPath = path.join(basePath, currentDirPattern);
          if (!fs.existsSync(currentDirPath)) {
            try {
              fs.mkdirSync(currentDirPath, { recursive: true });
            } catch (e) {
              console.error("Failed to create dir", currentDirPath, e);
            }
          }

          // Setup strftime format for ffmpeg
          let ffmpegPattern = pattern
            .replace("{cameraId}", camStr)
            .replace("{YYYY}", "%Y")
            .replace("{MM}", "%m")
            .replace("{DD}", "%d");

          const outFilePath = path
            .join(basePath, ffmpegPattern, "%H-%M-%S.mp4")
            .replace(/\\/g, "/");

          const fps = cameras[camIndex].fps;
          const fpsArgs = fps ? ["-r", fps] : [];

          args.push(
            "-map",
            `${camIndex}:v`,
            "-c:v",
            vcodec,
            "-preset",
            preset,
            ...resArgs,
            ...fpsArgs,
            ...bitrateArgs,
            "-map",
            `${camIndex}:a?`,
            "-c:a",
            "aac",
            "-f",
            "segment",
            "-segment_time",
            duration.toString(),
            "-reset_timestamps",
            "1",
            "-strftime",
            "1",
            outFilePath,
          );
        }
      });
    }

    const logHeader = `[FFMPEG]
${vcodec ? `-c:v ${vcodec}` : ""}
${resArgs.length ? `-s ${streamSettings?.outputResolution}` : ""}
${cameras[0]?.fps ? `-r ${cameras[0].fps}` : ""}
${bitrateArgs.length ? `-b:v ${streamSettings?.bitrate} -maxrate ${streamSettings?.bitrate} -bufsize ${parseInt((streamSettings?.bitrate || "0").replace("k", "")) * 2}k` : ""}
${preset ? `-preset ${preset}` : ""}`;

    console.log(logHeader);
    console.log("Starting ffmpeg with args:", args.join(" "));

    this.process = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.on("error", (error) => {
      this.logs.push(
        `[${new Date().toISOString()}] FFmpeg process error: ${error.message}`,
      );

      this.status = "error";
    });

    this.status = "running";
    this.startTime = Date.now();
    this.activeInputs = cameras.length;
    this.activeOutputs = outputs.filter(o => o.cameraMappings && o.cameraMappings.length > 0).length;
    this.logs.push(logHeader);
    this.logs.push(
      `[${new Date().toISOString()}] Encoder started configuring ${cameras.length} cameras to ${outputs.length} outputs.`,
    );

    this.process.stdout.on("data", (data) => {
      this.logs.push(data.toString());
    });

    this.process.stderr.on("data", (data) => {
      const msg = data.toString();

      console.log(msg);

      this.logs.push(msg);

      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(-1000);
      }
    });

    // this.process.on("close", (code) => {
    //   this.logs.push(
    //     `[${new Date().toISOString()}] Encoder stopped with code ${code}`,
    //   );
    //   this.status = "stopped";
    //   this.process = null;
    //   if (this.cleanupInterval) {
    //     clearInterval(this.cleanupInterval);
    //     this.cleanupInterval = null;
    //   }
    // });

    this.process.on("exit", (code, signal) => {
      this.logs.push(
        `[${new Date().toISOString()}] FFmpeg exit event. code=${code}, signal=${signal}`,
      );
    });

    this.process.on("close", (code) => {
      const reason = this.stopping
        ? "Process Stopped Successfuly"
        : "Process exited unexpectedly";

      this.logs.push(
        `[${new Date().toISOString()}] FFmpeg exited. Code=${code}. ${reason}`,
      );

      this.status = "stopped";
      this.process = null;
      this.stopping = false;
      this.activeInputs = 0;
      this.activeOutputs = 0;
      this.startTime = 0;

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    });

    if (nasConfig?.storageMode === "record") {
      this.cleanupInterval = setInterval(
        () => {
          nasManager.cleanup(nasConfig).catch(console.error);
        },
        1000 * 60 * 60,
      ); // Run cleanup every hour

      // Also run once on start
      nasManager.cleanup(nasConfig).catch(console.error);
    }
  }

  // stop() {
  //   if (this.process) {
  //     this.process.kill("SIGTERM");
  //     this.process = null;
  //     this.status = "stopped";
  //     if (this.cleanupInterval) {
  //       clearInterval(this.cleanupInterval);
  //       this.cleanupInterval = null;
  //     }
  //     this.logs.push(`[${new Date().toISOString()}] Encoder stopped manually`);
  //   }
  // }

  stop() {
    if (!this.process) {
      this.logs.push(
        `[${new Date().toISOString()}] Stop requested but no FFmpeg process is running`,
      );
      return;
    }

    if (this.stopping) {
      this.logs.push(`[${new Date().toISOString()}] Stop already in progress`);
      return;
    }

    const pid = this.process.pid;

    this.logs.push(`[${new Date().toISOString()}] stopping encoder...`);

    this.status = "stopping";
    this.stopping = true;

    this.logs.push(
      `[${new Date().toISOString()}] Stopping encoder (PID ${pid})`,
    );

    try {
      if (this.process.stdin && this.process.stdin.writable) {
        // FFmpeg built-in graceful shutdown
        this.logs.push(
          `[${new Date().toISOString()}] Sending shutdown command (q)`,
        );
        this.process.stdin.write("q\n");
        console.log("stdin writable:", this.process.stdin.writable);
      } else {
        this.logs.push(
          `[${new Date().toISOString()}] FFmpeg stdin is not writable, forcing SIGTERM`,
        );

        this.process.kill("SIGTERM");
      }

      // Safety timeout
      setTimeout(() => {
        if (this.process) {
          this.logs.push(
            `[${new Date().toISOString()}] Graceful stop timeout. Forcing termination...`,
          );

          try {
            this.process.kill("SIGTERM");
          } catch {}
        }
      }, 15000);
    } catch (err: any) {
      this.logs.push(
        `[${new Date().toISOString()}] Graceful shutdown failed: ${err.message}`,
      );

      try {
        this.process.kill("SIGTERM");
      } catch {}
    }
  }

  restart(cameras: Camera[], outputs: Output[], nasConfig?: NasConfig) {
    this.stop();
    setTimeout(() => this.start(cameras, outputs, nasConfig), 1000);
    this.logs.push(`[${new Date().toISOString()}] Encoder restarted`);
  }

  getStatus() {
    return this.status;
  }

  getLogs() {
    return this.logs.slice(-200); // limit last 200 logs
  }

  getMetrics() {
    return {
      status: this.status === "running" ? 1 : 0,
      processCount: this.process ? 1 : 0,
      activeInputs: this.activeInputs,
      activeOutputs: this.activeOutputs,
      uptimeSeconds: this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    };
  }
}

// export const ffmpegManager = new FFmpegManager();
declare global {
  var ffmpegManager: FFmpegManager | undefined;
}

export const ffmpegManager =
  global.ffmpegManager || (global.ffmpegManager = new FFmpegManager());
