"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Wifi,
  Clock,
  AlertTriangle,
  Server,
  Database,
} from "lucide-react";
import { DashboardTelemetrySnapshot } from "@/lib/monitoring/MetricsCollector";

interface SystemOverviewCardsProps {
  data: DashboardTelemetrySnapshot;
}

export default function SystemOverviewCards({ data }: SystemOverviewCardsProps) {
  const { system, gpu, network, storage, alerts } = data;

  const activeAlertsCount = alerts.filter((a) => a.severity !== "info").length;
  const systemHealthPercent = Math.max(
    0,
    100 - (system.cpuUsage * 0.3 + system.ramUsagePercent * 0.3 + storage.diskUsagePercent * 0.4),
  );

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    return `${h}h ${m}m`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(1);
    return `${gb} GB`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* Card 1: System Health */}
      <Card className="bg-card/90 border-border/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">System Health</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-foreground flex items-baseline gap-1">
              {Math.round(systemHealthPercent)}%
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] ml-1">
                HEALTHY
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{system.hostname || "Encova Platform"}</p>
          </div>
          <Progress value={systemHealthPercent} className="h-1.5 bg-emerald-950/40" />
        </CardContent>
      </Card>

      {/* Card 2: CPU Utilization */}
      <Card className="bg-card/90 border-border/60 shadow-sm relative overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">CPU Load</span>
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {system.cpuUsage}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={system.cpuModel}>
              {system.cpuCores} Cores ({system.arch})
            </p>
          </div>
          <Progress
            value={system.cpuUsage}
            className={`h-1.5 ${system.cpuUsage > 80 ? "bg-destructive/30" : "bg-primary/20"}`}
          />
        </CardContent>
      </Card>

      {/* Card 3: RAM Memory */}
      <Card className="bg-card/90 border-border/60 shadow-sm relative overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">RAM Usage</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-foreground">
              {system.ramUsagePercent}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatBytes(system.ramUsedBytes)} / {formatBytes(system.ramTotalBytes)}
            </p>
          </div>
          <Progress value={system.ramUsagePercent} className="h-1.5 bg-purple-950/40" />
        </CardContent>
      </Card>

      {/* Card 4: GPU Utilization */}
      <Card className="bg-card/90 border-border/60 shadow-sm relative overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">GPU / NVENC</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-foreground flex items-baseline gap-1">
              {gpu.available ? `${gpu.encoderUsagePercent}%` : "N/A"}
              {gpu.available && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] uppercase">
                  {gpu.vendor}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={gpu.model}>
              {gpu.available ? gpu.model : "CPU Software"}
            </p>
          </div>
          <Progress value={gpu.available ? gpu.encoderUsagePercent : 0} className="h-1.5 bg-amber-950/40" />
        </CardContent>
      </Card>

      {/* Card 5: Network & Storage */}
      <Card className="bg-card/90 border-border/60 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Network & Disk</span>
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground flex items-center justify-between">
              <span className="text-cyan-400 text-base font-mono">↓{network.inboundMbps} Mbps</span>
              <span className="text-emerald-400 text-base font-mono">↑{network.outboundMbps} Mbps</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
              <span>Disk: {storage.diskUsagePercent}%</span>
              <span>Uptime: {formatUptime(system.uptimeSeconds)}</span>
            </div>
          </div>
          <Progress value={storage.diskUsagePercent} className="h-1.5 bg-cyan-950/40" />
        </CardContent>
      </Card>
    </div>
  );
}
