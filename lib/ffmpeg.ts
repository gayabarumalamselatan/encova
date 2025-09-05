import { spawn, ChildProcessWithoutNullStreams } from "child_process"

type EncoderStatus = "stopped" | "running" | "error"

class FFmpegManager {
  private process: ChildProcessWithoutNullStreams | null = null
  private logs: string[] = []
  private status: EncoderStatus = "stopped"

  start(inputUrl: string, outputs: { type: string; url: string }[]) {
    if (this.process) {
      throw new Error("Encoder is already running")
    }
    console.log(inputUrl)
    // contoh command ffmpeg dasar
    const args = [
      "-i", inputUrl,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-c:a", "aac",
      "-f", "flv", outputs[0].url, 
    ]

    this.process = spawn("ffmpeg", args)

    this.status = "running"
    this.logs.push(`[${new Date().toISOString()}] Encoder started`)

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

  restart(inputUrl: string, outputs: { type: string; url: string }[]) {
    this.stop()
    setTimeout(() => this.start(inputUrl, outputs), 1000)
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
