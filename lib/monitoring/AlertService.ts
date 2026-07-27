export interface AlertItem {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  category: "camera" | "encoding" | "gpu" | "cpu" | "mediamtx" | "nas" | "disk";
  title: string;
  message: string;
}

export class AlertService {
  evaluateAlerts(params: {
    cpuUsage: number;
    gpuUsage: number;
    diskUsagePercent: number;
    offlineCamerasCount: number;
    encodingErrorsCount: number;
    mediaMtxConnected: boolean;
    nasLatencyMs: number;
  }): AlertItem[] {
    const alerts: AlertItem[] = [];
    const nowStr = new Date().toISOString();

    if (params.cpuUsage >= 90) {
      alerts.push({
        id: `alert-cpu-${Date.now()}`,
        timestamp: nowStr,
        severity: "critical",
        category: "cpu",
        title: "CPU Overload",
        message: `High CPU utilization detected at ${params.cpuUsage}%. Potential encoding slowdown.`,
      });
    } else if (params.cpuUsage >= 80) {
      alerts.push({
        id: `alert-cpu-${Date.now()}`,
        timestamp: nowStr,
        severity: "warning",
        category: "cpu",
        title: "High CPU Usage",
        message: `CPU usage elevated at ${params.cpuUsage}%.`,
      });
    }

    if (params.gpuUsage >= 90) {
      alerts.push({
        id: `alert-gpu-${Date.now()}`,
        timestamp: nowStr,
        severity: "critical",
        category: "gpu",
        title: "GPU Overload",
        message: `GPU hardware encoder utilization critical at ${params.gpuUsage}%.`,
      });
    }

    if (params.diskUsagePercent >= 90) {
      alerts.push({
        id: `alert-disk-${Date.now()}`,
        timestamp: nowStr,
        severity: "critical",
        category: "disk",
        title: "Low Disk Space",
        message: `Disk storage capacity critically full at ${params.diskUsagePercent}%.`,
      });
    }

    if (params.offlineCamerasCount > 0) {
      alerts.push({
        id: `alert-cam-${Date.now()}`,
        timestamp: nowStr,
        severity: "warning",
        category: "camera",
        title: "Camera Stream Offline",
        message: `${params.offlineCamerasCount} camera stream(s) are currently offline or unreachable.`,
      });
    }

    if (params.encodingErrorsCount > 0) {
      alerts.push({
        id: `alert-enc-${Date.now()}`,
        timestamp: nowStr,
        severity: "warning",
        category: "encoding",
        title: "Encoding Failure",
        message: `${params.encodingErrorsCount} process restart(s) or encoding errors recorded.`,
      });
    }

    if (!params.mediaMtxConnected) {
      alerts.push({
        id: `alert-mmtx-${Date.now()}`,
        timestamp: nowStr,
        severity: "info",
        category: "mediamtx",
        title: "MediaMTX Standby",
        message: "MediaMTX RTSP relay server is idle or uninitialized.",
      });
    }

    if (params.nasLatencyMs > 300) {
      alerts.push({
        id: `alert-nas-${Date.now()}`,
        timestamp: nowStr,
        severity: "warning",
        category: "nas",
        title: "NAS Slow Connection",
        message: `NAS storage response latency elevated at ${params.nasLatencyMs}ms.`,
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: `alert-ok-${Date.now()}`,
        timestamp: nowStr,
        severity: "info",
        category: "encoding",
        title: "All Systems Operational",
        message: "Encova video encoding platform running normally with zero critical alerts.",
      });
    }

    return alerts;
  }
}

export const alertService = new AlertService();
