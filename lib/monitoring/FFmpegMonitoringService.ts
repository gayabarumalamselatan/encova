import { ffmpegManager } from "../ffmpeg";
import { maskRtspUrl } from "../security/encryption";

export interface FFmpegProcessMetrics {
  pid?: number;
  cameraId: number;
  cameraName: string;
  status: string;
  uptimeSeconds: number;
  frames: number;
  droppedFrames: number;
  duplicatedFrames: number;
  fps: string;
  bitrate: string;
  resolution: string;
  codec: string;
  encoder: string;
  hwaccel: string;
  activeOutputs: number;
  encodeSpeed: string;
  restartCount: number;
  errorCount: number;
  recentLogs: string[];
}

export interface EncodingOverallMetrics {
  activeProcesses: number;
  totalProcesses: number;
  avgFps: number;
  totalFrames: number;
  totalDroppedFrames: number;
  totalDuplicatedFrames: number;
  avgEncodeSpeed: string;
  totalRestartCount: number;
  totalErrorCount: number;
  processes: FFmpegProcessMetrics[];
}

export class FFmpegMonitoringService {
  getMetrics(): EncodingOverallMetrics {
    const rawStatus = ffmpegManager.getStatus();
    const systemMetrics = ffmpegManager.getMetrics();
    const processesMap = ffmpegManager.processes;

    const processes: FFmpegProcessMetrics[] = Array.from(processesMap.values()).map((proc) => {
      const maskedLogs = proc.logs.slice(-20).map((l) => maskRtspUrl(l));

      let speedStr = "1.0x";
      for (let i = proc.logs.length - 1; i >= 0; i--) {
        const speedMatch = proc.logs[i].match(/speed=\s*([\d\.]+)x/);
        if (speedMatch) {
          speedStr = `${speedMatch[1]}x`;
          break;
        }
      }

      let dupFrames = 0;
      for (let i = proc.logs.length - 1; i >= 0; i--) {
        const dupMatch = proc.logs[i].match(/dup=\s*(\d+)/);
        if (dupMatch) {
          dupFrames = parseInt(dupMatch[1], 10);
          break;
        }
      }

      const hwaccel = proc.actualEncoder.includes("qsv")
        ? "qsv"
        : proc.actualEncoder.includes("nvenc")
        ? "cuda"
        : proc.actualEncoder.includes("vaapi")
        ? "vaapi"
        : "software";

      return {
        pid: proc.process?.pid,
        cameraId: proc.cameraId,
        cameraName: proc.cameraName,
        status: proc.status,
        uptimeSeconds: proc.getUptime(),
        frames: proc.frames,
        droppedFrames: proc.dropped,
        duplicatedFrames: dupFrames,
        fps: proc.fps || "0",
        bitrate: proc.bitrate || "0 kbps",
        resolution: proc.resolution || "Unknown",
        codec: proc.codec || "h264",
        encoder: proc.actualEncoder || "libx264",
        hwaccel,
        activeOutputs: proc.activeOutputs,
        encodeSpeed: speedStr,
        restartCount: systemMetrics.totalRestartCount,
        errorCount: systemMetrics.totalErrorCount,
        recentLogs: maskedLogs,
      };
    });

    const activeProcs = processes.filter((p) => p.status === "running");
    const totalFpsSum = activeProcs.reduce((sum, p) => sum + (parseFloat(p.fps) || 0), 0);
    const avgFps = activeProcs.length > 0 ? Math.round(totalFpsSum / activeProcs.length) : 0;

    return {
      activeProcesses: activeProcs.length,
      totalProcesses: processes.length,
      avgFps,
      totalFrames: processes.reduce((sum, p) => sum + p.frames, 0),
      totalDroppedFrames: processes.reduce((sum, p) => sum + p.droppedFrames, 0),
      totalDuplicatedFrames: processes.reduce((sum, p) => sum + p.duplicatedFrames, 0),
      avgEncodeSpeed: activeProcs.length > 0 ? activeProcs[0].encodeSpeed : "1.0x",
      totalRestartCount: systemMetrics.totalRestartCount,
      totalErrorCount: systemMetrics.totalErrorCount,
      processes,
    };
  }
}

export const ffmpegMonitoringService = new FFmpegMonitoringService();
