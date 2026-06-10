import { NextResponse } from "next/server";
import { ffmpegManager } from "@/lib/ffmpeg";
import { nasManager } from "@/lib/nas";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

let storageMetricsCache = {
  data: null as any,
  timestamp: 0,
};

let mediaMtxMetricsCache = {
  data: null as any,
  timestamp: 0,
};

async function fetchMediaMtxMetrics() {
  const now = Date.now();
  if (
    now - mediaMtxMetricsCache.timestamp < 5000 &&
    mediaMtxMetricsCache.data
  ) {
    return mediaMtxMetricsCache.data;
  }

  try {
    const res = await fetch("http://localhost:9997/metrics", {
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) {
      const text = await res.text();

      let streams = 0,
        rtspPubs = 0,
        rtspClients = 0,
        hlsClients = 0,
        webrtcClients = 0;

      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("paths{") || line.startsWith("paths ")) streams++;
        if (line.startsWith('rtsp_conns{state="publish"}')) rtspPubs++;
        if (
          line.startsWith('rtsp_conns{state="read"}') ||
          line.startsWith('rtsp_sessions{state="read"}')
        )
          rtspClients++;
        if (line.startsWith("hls_muxers{")) hlsClients++;
        if (line.startsWith("webrtc_conns{")) webrtcClients++;
      }

      mediaMtxMetricsCache.data = {
        streams,
        rtspPubs,
        rtspClients,
        hlsClients,
        webrtcClients,
      };
      mediaMtxMetricsCache.timestamp = now;
      return mediaMtxMetricsCache.data;
    }
  } catch (err) {
    // console.error("MediaMTX metrics error:", err);
  }
  return {
    streams: 0,
    rtspPubs: 0,
    rtspClients: 0,
    hlsClients: 0,
    webrtcClients: 0,
  };
}

export async function GET() {
  let metricsText = "";

  function addMetric(
    name: string,
    value: number | string,
    help: string,
    type: string = "gauge",
    labels: Record<string, string> = {},
  ) {
    metricsText += `# HELP ${name} ${help}\n`;
    metricsText += `# TYPE ${name} ${type}\n`;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");

    if (labelStr) {
      metricsText += `${name}{${labelStr}} ${value}\n\n`;
    } else {
      metricsText += `${name} ${value}\n\n`;
    }
  }

  try {
    // 1. Settings data
    let activeCameras = 0;
    let activeOutputs = 0;
    try {
      const possiblePaths = [
        path.join(process.cwd(), "settings.json"),
        path.join(process.cwd(), "data", "settings", "settings.json"),
      ];

      let settingsData = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          settingsData = JSON.parse(fs.readFileSync(p, "utf-8"));
          break;
        }
      }

      if (settingsData) {
        if (settingsData.cameras) {
          activeCameras = settingsData.cameras.filter(
            (c: any) => c.enabled,
          ).length;
        }
        if (settingsData.outputs) {
          activeOutputs = settingsData.outputs.filter(
            (o: any) => o.enabled,
          ).length;
        }
      }
    } catch (e) {
      console.error("Failed to read settings", e);
    }

    // 2. FFmpeg Metrics
    const ffmpegMetrics = ffmpegManager.getMetrics();

    addMetric(
      "encova_active_cameras",
      activeCameras,
      "Number of configured and enabled cameras",
    );
    addMetric(
      "encova_active_outputs",
      activeOutputs,
      "Number of configured output streams",
    );
    addMetric(
      "encova_active_streams",
      activeOutputs,
      "Number of streams currently published to MediaMTX",
    ); // Approx based on outputs
    addMetric(
      "encova_ffmpeg_processes",
      ffmpegMetrics.processCount,
      "Number of running FFmpeg processes",
    );
    addMetric(
      "encova_encoder_status",
      ffmpegMetrics.status,
      "Encoder state (1 = running, 0 = stopped)",
    );
    addMetric(
      "encova_encoder_uptime_seconds",
      ffmpegMetrics.uptimeSeconds,
      "How long the encoder has been running",
    );

    // Video Encoding Metrics
    if (ffmpegMetrics.currentCodec) {
      addMetric("encova_video_codec", 1, "Current codec", "gauge", {
        name: ffmpegMetrics.currentCodec,
      });
    }

    const kbpsMatch = ffmpegMetrics.currentBitrate?.match(/(\d+)k/);
    const bitrateVal = kbpsMatch ? parseInt(kbpsMatch[1], 10) : 0;
    addMetric(
      "encova_video_bitrate_kbps",
      bitrateVal,
      "Current configured bitrate",
    );

    if (
      ffmpegMetrics.currentResolution &&
      ffmpegMetrics.currentResolution !== "same"
    ) {
      const parts = ffmpegMetrics.currentResolution.split("x");
      if (parts.length === 2) {
        addMetric("encova_video_resolution", 1, "Current resolution", "gauge", {
          width: parts[0],
          height: parts[1],
        });
      }
    }

    addMetric(
      "encova_video_fps",
      parseInt(ffmpegMetrics.currentFps) || 0,
      "Configured FPS",
    );
    addMetric(
      "encova_ffmpeg_restarts_total",
      ffmpegMetrics.totalRestartCount,
      "Number of FFmpeg restarts since application start",
      "counter",
    );
    addMetric(
      "encova_ffmpeg_errors_total",
      ffmpegMetrics.totalErrorCount,
      "Number of FFmpeg errors detected",
      "counter",
    );

    // 3. System Metrics
    const memUsage = process.memoryUsage();
    addMetric(
      "encova_node_memory_used_bytes",
      memUsage.heapUsed,
      "Node.js memory usage",
    );
    addMetric(
      "encova_node_memory_total_bytes",
      memUsage.heapTotal,
      "Node.js memory allocated",
    );

    let cpuUsage = 0;
    if (process.cpuUsage) {
      const usage = process.cpuUsage();
      cpuUsage = (usage.user + usage.system) / 1000000;
    }
    addMetric(
      "encova_node_cpu_usage_percent",
      cpuUsage,
      "Current Node.js CPU usage if measurable",
    );
    addMetric(
      "encova_process_uptime_seconds",
      Math.floor(process.uptime()),
      "Encova application uptime",
    );

    // 4. NAS Storage Metrics
    const now = Date.now();
    let storageData;
    if (
      now - storageMetricsCache.timestamp < 30000 &&
      storageMetricsCache.data
    ) {
      storageData = storageMetricsCache.data;
    } else {
      storageData = await nasManager.getMetrics();
      storageMetricsCache.data = storageData;
      storageMetricsCache.timestamp = now;
    }

    addMetric(
      "encova_storage_total_bytes",
      storageData.totalBytes || 0,
      "Total NAS capacity",
    );
    addMetric(
      "encova_storage_used_bytes",
      storageData.usedBytes || 0,
      "Used NAS capacity",
    );
    addMetric(
      "encova_storage_free_bytes",
      storageData.freeBytes || 0,
      "Free NAS capacity",
    );
    addMetric(
      "encova_recording_storage_used_bytes",
      storageData.recordingBytes || 0,
      "Size consumed by recording files",
    );
    addMetric(
      "encova_recording_files_total",
      storageData.recordingFiles || 0,
      "Number of recorded files",
    );
    addMetric(
      "encova_last_recording_timestamp",
      storageData.latestRecordingTimestamp || 0,
      "UNIX timestamp of newest recording",
    );
    addMetric(
      "encova_storage_status",
      storageData.connected ? 1 : 0,
      "1 connected, 0 disconnected",
    );

    // 5. Recording Metrics
    const nasConfig = nasManager.getCurrentConfig();
    addMetric(
      "encova_recording_enabled",
      nasConfig?.storageMode === "record" ? 1 : 0,
      "1 if NAS recording mode is enabled",
    );
    addMetric(
      "encova_recording_segment_duration_seconds",
      (nasConfig?.segmentDuration || 0) * 60,
      "Current segment duration",
    );
    addMetric(
      "encova_recording_retention_days",
      nasConfig?.retentionDays || 0,
      "Current retention policy",
    );

    let lastFileAge = 0;
    if (storageData.latestRecordingTimestamp) {
      lastFileAge =
        Math.floor(Date.now() / 1000) - storageData.latestRecordingTimestamp;
      if (lastFileAge < 0) lastFileAge = 0;
    }
    addMetric(
      "encova_recording_last_file_age_seconds",
      lastFileAge,
      "Age of latest recording",
    );

    // 6. MediaMTX Metrics
    const mtxMetrics = await fetchMediaMtxMetrics();
    addMetric(
      "encova_mediastreams_total",
      mtxMetrics.streams,
      "Total media streams in MediaMTX",
    );
    addMetric(
      "encova_rtsp_publishers_total",
      mtxMetrics.rtspPubs,
      "Total RTSP publishers",
    );
    addMetric(
      "encova_rtsp_clients_total",
      mtxMetrics.rtspClients,
      "Total RTSP clients",
    );
    addMetric(
      "encova_hls_clients_total",
      mtxMetrics.hlsClients,
      "Total HLS clients",
    );
    addMetric(
      "encova_webrtc_clients_total",
      mtxMetrics.webrtcClients,
      "Total WebRTC clients",
    );
  } catch (error: any) {
    console.error("Error generating metrics:", error);
    metricsText += `\n# Error generating metrics: ${error.message}\n`;
  }

  return new NextResponse(metricsText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-store",
    },
  });
}
