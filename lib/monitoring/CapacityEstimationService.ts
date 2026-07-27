export interface CapacityMetrics {
  currentActiveCameras: number;
  estimatedMaxCameras: number;
  cpuRemainingPercent: number;
  gpuRemainingPercent: number;
  remainingCapacityPercent: number;
  estimatedCpuPerStreamPercent: number;
  estimatedGpuPerStreamPercent: number;
  bottleneck: "CPU" | "GPU" | "RAM" | "None";
}

export class CapacityEstimationService {
  calculate(
    activeCamerasCount: number,
    cpuUsagePercent: number,
    gpuUsagePercent: number,
    gpuAvailable: boolean,
  ): CapacityMetrics {
    const cpuRemaining = Math.max(0, 100 - cpuUsagePercent);
    const gpuRemaining = Math.max(0, 100 - gpuUsagePercent);

    const activeCount = Math.max(1, activeCamerasCount);

    // Estimate per-stream CPU / GPU cost
    const cpuPerStream = Math.max(4, cpuUsagePercent / activeCount);
    const gpuPerStream = gpuAvailable ? Math.max(5, gpuUsagePercent / activeCount) : 0;

    const maxByCpu = activeCamerasCount + Math.floor(cpuRemaining / cpuPerStream);
    const maxByGpu = gpuAvailable && gpuPerStream > 0
      ? activeCamerasCount + Math.floor(gpuRemaining / gpuPerStream)
      : maxByCpu;

    const estimatedMax = Math.max(activeCamerasCount, Math.min(maxByCpu, maxByGpu, 32));

    let bottleneck: "CPU" | "GPU" | "RAM" | "None" = "None";
    if (cpuRemaining < gpuRemaining) bottleneck = "CPU";
    else if (gpuAvailable && gpuRemaining < cpuRemaining) bottleneck = "GPU";

    const capacityUsed = Math.round((activeCamerasCount / Math.max(1, estimatedMax)) * 100);
    const remainingCapacityPercent = Math.max(0, 100 - capacityUsed);

    return {
      currentActiveCameras: activeCamerasCount,
      estimatedMaxCameras: estimatedMax,
      cpuRemainingPercent: cpuRemaining,
      gpuRemainingPercent: gpuAvailable ? gpuRemaining : 100,
      remainingCapacityPercent,
      estimatedCpuPerStreamPercent: parseFloat(cpuPerStream.toFixed(1)),
      estimatedGpuPerStreamPercent: parseFloat(gpuPerStream.toFixed(1)),
      bottleneck,
    };
  }
}

export const capacityEstimationService = new CapacityEstimationService();
