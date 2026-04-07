import { spawn, ChildProcessWithoutNullStreams } from "child_process"

type EncoderStatus = "stopped" | "running" | "error"

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

class FFmpegManager {
  private process: ChildProcessWithoutNullStreams | null = null
  private logs: string[] = []
  private status: EncoderStatus = "stopped"

  start(cameras: Camera[], outputs: Output[]) {
    if (this.process) {
      throw new Error("Encoder is already running")
    }

    const args: string[] = [];

    // Push each camera as an input stream
    cameras.forEach(cam => {
      args.push("-i", cam.url || "");
    });

    // Map outputs
    outputs.forEach((out) => {
      if (out.cameraMappings && out.cameraMappings.length > 0) {
        const camId = out.cameraMappings[0];
        const camIndex = cameras.findIndex(c => c.id === camId);
        if (camIndex !== -1) {
          args.push(
            "-map", `${camIndex}:v`,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-map", `${camIndex}:a?`,
            "-c:a", "aac"
          );

          let format = "flv";
          if (out.type === "dash") format = "dash";
          if (out.type === "hls") format = "hls";
          if (out.type === "file") format = "mp4";
          if (out.type === "rtmp") format = "flv";

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

    console.log("Starting ffmpeg with args:", args.join(" "))

    this.process = spawn("ffmpeg", args)

    this.status = "running"
    this.logs.push(`[${new Date().toISOString()}] Encoder started configuring ${cameras.length} cameras to ${outputs.length} outputs.`)

    this.process.stdout.on("data", (data) => {
      this.logs.push(data.toString())
    })

    this.process.stderr.on("data", (data) => {
      this.logs.push(data.toString())
    })

    this.process.on("close", (code) => {
      this.logs.push(`[${new Date().toISOString()}] Encoder stopped with code ${code}`)
      this.status = "stopped"
      this.process = null
    })
  }

  stop() {
    if (this.process) {
      this.process.kill("SIGTERM")
      this.process = null
      this.status = "stopped"
      this.logs.push(`[${new Date().toISOString()}] Encoder stopped manually`)
    }
  }

  restart(cameras: Camera[], outputs: Output[]) {
    this.stop()
    setTimeout(() => this.start(cameras, outputs), 1000)
    this.logs.push(`[${new Date().toISOString()}] Encoder restarted`)
  }

  getStatus() {
    return this.status
  }

  getLogs() {
    return this.logs.slice(-200) // limit last 200 logs
  }
}

export const ffmpegManager = new FFmpegManager()
