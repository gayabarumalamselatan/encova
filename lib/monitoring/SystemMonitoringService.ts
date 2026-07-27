import os from "os";
import checkDiskSpace from "check-disk-space";

export interface SystemMetrics {
  cpuUsage: number;
  cpuCores: number;
  cpuModel: string;
  ramTotalBytes: number;
  ramUsedBytes: number;
  ramFreeBytes: number;
  ramUsagePercent: number;
  uptimeSeconds: number;
  platform: string;
  arch: string;
  hostname: string;
  diskTotalBytes: number;
  diskFreeBytes: number;
  diskUsedBytes: number;
  diskUsagePercent: number;
}

let lastCpuTimes: os.CpuInfo[] | null = null;

function getCpuAverageLoad(): number {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) return 0;

  if (!lastCpuTimes) {
    lastCpuTimes = cpus;
    return Math.round(os.loadavg()[0] * 10 || 15);
  }

  let totalIdle = 0;
  let totalTick = 0;

  for (let i = 0; i < cpus.length; i++) {
    const cpu = cpus[i];
    const lastCpu = lastCpuTimes[i] || cpu;

    const idle = cpu.times.idle - lastCpu.times.idle;
    const user = cpu.times.user - lastCpu.times.user;
    const sys = cpu.times.sys - lastCpu.times.sys;
    const irq = cpu.times.irq - lastCpu.times.irq;
    const nice = cpu.times.nice - lastCpu.times.nice;

    const tick = idle + user + sys + irq + nice;
    totalIdle += idle;
    totalTick += tick;
  }

  lastCpuTimes = cpus;
  if (totalTick === 0) return 0;
  const usage = Math.round(((totalTick - totalIdle) / totalTick) * 100);
  return Math.min(100, Math.max(0, usage));
}

export class SystemMonitoringService {
  async getMetrics(): Promise<SystemMetrics> {
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;
    const ramUsagePercent = Math.round((usedRam / totalRam) * 100);
    const cpuUsage = getCpuAverageLoad();
    const cpus = os.cpus();

    let diskTotal = 100 * 1024 * 1024 * 1024;
    let diskFree = 50 * 1024 * 1024 * 1024;

    try {
      const diskPath = process.platform === "win32" ? "C:" : "/";
      const diskInfo = await checkDiskSpace(diskPath);
      diskTotal = diskInfo.size;
      diskFree = diskInfo.free;
    } catch {
      /* fallback */
    }

    const diskUsed = diskTotal - diskFree;
    const diskUsagePercent = Math.round((diskUsed / diskTotal) * 100);

    return {
      cpuUsage,
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model || "Generic CPU",
      ramTotalBytes: totalRam,
      ramUsedBytes: usedRam,
      ramFreeBytes: freeRam,
      ramUsagePercent,
      uptimeSeconds: Math.floor(os.uptime()),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      diskTotalBytes: diskTotal,
      diskFreeBytes: diskFree,
      diskUsedBytes: diskUsed,
      diskUsagePercent,
    };
  }
}

export const systemMonitoringService = new SystemMonitoringService();
