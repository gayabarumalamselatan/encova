"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Cpu, Zap, Thermometer, Flame, Server, HardDrive } from "lucide-react";
import { GpuMetrics } from "@/lib/monitoring/GPUService";
import { SystemMetrics } from "@/lib/monitoring/SystemMonitoringService";

interface HardwareUtilizationWidgetProps {
  system: SystemMetrics;
  gpu: GpuMetrics;
}

export default function HardwareUtilizationWidget({
  system,
  gpu,
}: HardwareUtilizationWidgetProps) {
  return (
    <Card className="bg-card/90 border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            Hardware Acceleration & Processor Utilization
          </span>
          <Badge variant="outline" className="text-xs font-mono">
            {gpu.available ? gpu.model : "CPU Software Encoding"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* CPU Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              CPU Load ({system.cpuCores} Cores)
            </span>
            <span className="font-mono font-bold text-primary">{system.cpuUsage}%</span>
          </div>
          <Progress value={system.cpuUsage} className="h-2 bg-primary/20" />
          <p className="text-[11px] text-muted-foreground font-mono">{system.cpuModel}</p>
        </div>

        {/* GPU Section */}
        {gpu.available ? (
          <div className="space-y-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                GPU Acceleration ({gpu.vendor.toUpperCase()})
              </span>
              <div className="flex items-center gap-2">
                {gpu.temperatureCelsius && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    {gpu.temperatureCelsius}°C
                  </Badge>
                )}
                {gpu.powerDrawWatts && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] gap-1">
                    <Flame className="w-3 h-3 text-purple-400" />
                    {gpu.powerDrawWatts}W
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* GPU Core */}
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">GPU Core</span>
                  <span className="font-mono font-bold text-foreground">{gpu.gpuUsagePercent}%</span>
                </div>
                <Progress value={gpu.gpuUsagePercent} className="h-1.5 bg-amber-950/40" />
              </div>

              {/* Encoder NVENC */}
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Hardware Encoder</span>
                  <span className="font-mono font-bold text-emerald-400">{gpu.encoderUsagePercent}%</span>
                </div>
                <Progress value={gpu.encoderUsagePercent} className="h-1.5 bg-emerald-950/40" />
              </div>

              {/* VRAM Memory */}
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">VRAM ({gpu.vramUsedMb} MB)</span>
                  <span className="font-mono font-bold text-cyan-400">{gpu.vramUsagePercent}%</span>
                </div>
                <Progress value={gpu.vramUsagePercent} className="h-1.5 bg-cyan-950/40" />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground flex items-center justify-between">
            <span>No dedicated NVIDIA / Intel QSV GPU detected. Running software CPU encoding.</span>
            <Badge variant="outline" className="text-[10px]">CPU ONLY</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
