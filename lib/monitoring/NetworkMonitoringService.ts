import os from "os";

export interface NetworkMetrics {
  inboundMbps: number;
  outboundMbps: number;
  totalInboundBytes: number;
  totalOutboundBytes: number;
  packetErrors: number;
  reconnectCount: number;
  connectionFailures: number;
  interfaces: { name: string; ip: string }[];
}

let lastNetworkTime = Date.now();
let lastInboundBytes = 0;
let lastOutboundBytes = 0;

export class NetworkMonitoringService {
  getMetrics(activeStreamCount: number = 0): NetworkMetrics {
    const interfaces: { name: string; ip: string }[] = [];
    const ifaces = os.networkInterfaces();

    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name] || []) {
        if (!iface.internal && iface.family === "IPv4") {
          interfaces.push({ name, ip: iface.address });
        }
      }
    }

    const now = Date.now();
    const timeDiffSec = Math.max(1, (now - lastNetworkTime) / 1000);

    // Calculate dynamic stream bandwidth
    const estimatedInMbps = parseFloat((activeStreamCount * 3.5).toFixed(2));
    const estimatedOutMbps = parseFloat((activeStreamCount * 3.5 * 1.5).toFixed(2));

    lastNetworkTime = now;

    return {
      inboundMbps: estimatedInMbps,
      outboundMbps: estimatedOutMbps,
      totalInboundBytes: Math.round(estimatedInMbps * 1024 * 1024 * 60),
      totalOutboundBytes: Math.round(estimatedOutMbps * 1024 * 1024 * 60),
      packetErrors: 0,
      reconnectCount: 0,
      connectionFailures: 0,
      interfaces,
    };
  }
}

export const networkMonitoringService = new NetworkMonitoringService();
