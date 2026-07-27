import { systemMonitoringService, SystemMetrics } from "./SystemMonitoringService";
import { gpuService, GpuMetrics } from "./GPUService";
import { ffmpegMonitoringService, EncodingOverallMetrics } from "./FFmpegMonitoringService";
import { mediaMTXMonitoringService, MediaMTXMetrics } from "./MediaMTXMonitoringService";
import { storageMonitoringService, StorageMetrics } from "./StorageMonitoringService";
import { networkMonitoringService, NetworkMetrics } from "./NetworkMonitoringService";
import { cameraMonitoringService, CameraStatusSummary } from "./CameraMonitoringService";
import { capacityEstimationService, CapacityMetrics } from "./CapacityEstimationService";
import { alertService, AlertItem } from "./AlertService";

export interface DashboardTelemetrySnapshot {
  timestamp: string;
  system: SystemMetrics;
  gpu: GpuMetrics;
  encoding: EncodingOverallMetrics;
  mediaMtx: MediaMTXMetrics;
  storage: StorageMetrics;
  network: NetworkMetrics;
  cameras: CameraStatusSummary;
  capacity: CapacityMetrics;
  alerts: AlertItem[];
}

const MAX_HISTORY_SNAPSHOTS = 7200; // 24 hours of 5-second ticks

export class MetricsCollector {
  private snapshots: DashboardTelemetrySnapshot[] = [];
  private currentSnapshot: DashboardTelemetrySnapshot | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isCollecting = false;

  constructor() {
    this.start();
  }

  public start() {
    if (this.timer) return;
    // Initial collect tick
    this.collect().catch(() => {});
    // 5-second interval tick
    this.timer = setInterval(() => {
      this.collect().catch(() => {});
    }, 5000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async collect(): Promise<DashboardTelemetrySnapshot> {
    if (this.isCollecting && this.currentSnapshot) {
      return this.currentSnapshot;
    }

    this.isCollecting = true;
    try {
      const nowStr = new Date().toISOString();

      const [system, gpu, encoding, mediaMtx, storage, cameras] = await Promise.all([
        systemMonitoringService.getMetrics(),
        gpuService.getMetrics(),
        Promise.resolve(ffmpegMonitoringService.getMetrics()),
        mediaMTXMonitoringService.getMetrics(),
        storageMonitoringService.getMetrics(),
        Promise.resolve(cameraMonitoringService.getMetrics()),
      ]);

      const network = networkMonitoringService.getMetrics(encoding.activeProcesses);
      const capacity = capacityEstimationService.calculate(
        cameras.online,
        system.cpuUsage,
        gpu.gpuUsagePercent,
        gpu.available,
      );

      const alerts = alertService.evaluateAlerts({
        cpuUsage: system.cpuUsage,
        gpuUsage: gpu.gpuUsagePercent,
        diskUsagePercent: storage.diskUsagePercent,
        offlineCamerasCount: cameras.offline,
        encodingErrorsCount: encoding.totalErrorCount + encoding.totalRestartCount,
        mediaMtxConnected: mediaMtx.connected,
        nasLatencyMs: storage.nasLatencyMs,
      });

      const snapshot: DashboardTelemetrySnapshot = {
        timestamp: nowStr,
        system,
        gpu,
        encoding,
        mediaMtx,
        storage,
        network,
        cameras,
        capacity,
        alerts,
      };

      this.currentSnapshot = snapshot;
      this.snapshots.push(snapshot);

      if (this.snapshots.length > MAX_HISTORY_SNAPSHOTS) {
        this.snapshots = this.snapshots.slice(-MAX_HISTORY_SNAPSHOTS);
      }

      return snapshot;
    } finally {
      this.isCollecting = false;
    }
  }

  public getLatestSnapshot(): DashboardTelemetrySnapshot {
    if (this.currentSnapshot) return this.currentSnapshot;
    // Fallback sync construction if initial tick hasn't completed
    const nowStr = new Date().toISOString();
    return {
      timestamp: nowStr,
      system: {
        cpuUsage: 15,
        cpuCores: 8,
        cpuModel: "System CPU",
        ramTotalBytes: 16 * 1024 * 1024 * 1024,
        ramUsedBytes: 4 * 1024 * 1024 * 1024,
        ramFreeBytes: 12 * 1024 * 1024 * 1024,
        ramUsagePercent: 25,
        uptimeSeconds: 3600,
        platform: process.platform,
        arch: process.arch,
        hostname: "encova-node",
        diskTotalBytes: 100 * 1024 * 1024 * 1024,
        diskFreeBytes: 60 * 1024 * 1024 * 1024,
        diskUsedBytes: 40 * 1024 * 1024 * 1024,
        diskUsagePercent: 40,
      },
      gpu: {
        vendor: "none",
        model: "No GPU",
        gpuUsagePercent: 0,
        encoderUsagePercent: 0,
        decoderUsagePercent: 0,
        vramUsedMb: 0,
        vramTotalMb: 0,
        vramUsagePercent: 0,
        available: false,
      },
      encoding: {
        activeProcesses: 0,
        totalProcesses: 0,
        avgFps: 0,
        totalFrames: 0,
        totalDroppedFrames: 0,
        totalDuplicatedFrames: 0,
        avgEncodeSpeed: "1.0x",
        totalRestartCount: 0,
        totalErrorCount: 0,
        processes: [],
      },
      mediaMtx: {
        connected: true,
        publishers: 0,
        readers: 0,
        rtspSessions: 0,
        rtmpSessions: 0,
        hlsStreams: 0,
        webRtcSessions: 0,
        bandwidthInMbps: 0,
        bandwidthOutMbps: 0,
        activeStreamCount: 0,
      },
      storage: {
        currentStorageMode: "stream",
        diskTotalBytes: 100 * 1024 * 1024 * 1024,
        diskFreeBytes: 60 * 1024 * 1024 * 1024,
        diskUsedBytes: 40 * 1024 * 1024 * 1024,
        diskUsagePercent: 40,
        readSpeedMbps: 5,
        writeSpeedMbps: 1,
        nasConnected: false,
        nasType: "smb",
        nasAddress: "None",
        nasLatencyMs: 0,
        recordingActive: false,
        retentionDays: 30,
      },
      network: {
        inboundMbps: 0,
        outboundMbps: 0,
        totalInboundBytes: 0,
        totalOutboundBytes: 0,
        packetErrors: 0,
        reconnectCount: 0,
        connectionFailures: 0,
        interfaces: [],
      },
      cameras: {
        total: 0,
        online: 0,
        warning: 0,
        offline: 0,
        disabled: 0,
        cameras: [],
      },
      capacity: {
        currentActiveCameras: 0,
        estimatedMaxCameras: 16,
        cpuRemainingPercent: 85,
        gpuRemainingPercent: 100,
        remainingCapacityPercent: 85,
        estimatedCpuPerStreamPercent: 5,
        estimatedGpuPerStreamPercent: 0,
        bottleneck: "None",
      },
      alerts: [],
    };
  }

  public getHistory(fromTime?: string, toTime?: string): DashboardTelemetrySnapshot[] {
    if (!fromTime && !toTime) return this.snapshots;
    const fromMs = fromTime ? new Date(fromTime).getTime() : 0;
    const toMs = toTime ? new Date(toTime).getTime() : Date.now();

    return this.snapshots.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= fromMs && t <= toMs;
    });
  }
}

declare global {
  var metricsCollector: MetricsCollector | undefined;
}

export const metricsCollector =
  global.metricsCollector || (global.metricsCollector = new MetricsCollector());
