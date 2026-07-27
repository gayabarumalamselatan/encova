"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Server, Activity, ArrowDown, ArrowUp, Database, CheckCircle2 } from "lucide-react";
import { StorageMetrics } from "@/lib/monitoring/StorageMonitoringService";

interface NetworkStorageWidgetProps {
  storage: StorageMetrics;
}

export default function NetworkStorageWidget({ storage }: NetworkStorageWidgetProps) {
  const formatGb = (bytes: number) => {
    if (!bytes) return "0 GB";
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Card className="bg-card/90 border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            Storage & Recording NAS Infrastructure
          </CardTitle>
          <Badge
            variant="outline"
            className={
              storage.recordingActive
                ? "bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs font-mono"
                : "bg-muted text-muted-foreground text-xs"
            }
          >
            {storage.recordingActive ? "RECORDING ACTIVE" : "STREAMING ONLY"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Storage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Local Storage Usage</span>
            <span className="font-mono text-muted-foreground">
              {formatGb(storage.diskUsedBytes)} / {formatGb(storage.diskTotalBytes)} ({storage.diskUsagePercent}%)
            </span>
          </div>
          <Progress
            value={storage.diskUsagePercent}
            className={`h-2 ${storage.diskUsagePercent > 85 ? "bg-destructive/40" : "bg-purple-950/40"}`}
          />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Write Speed</span>
            <span className="text-base font-bold text-emerald-400 font-mono flex items-center gap-1">
              <ArrowDown className="w-3.5 h-3.5" />
              {storage.writeSpeedMbps} MB/s
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Read Speed</span>
            <span className="text-base font-bold text-cyan-400 font-mono flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" />
              {storage.readSpeedMbps} MB/s
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">NAS Target</span>
            <span className="text-sm font-semibold text-foreground truncate block" title={storage.nasAddress}>
              {storage.nasAddress}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Retention</span>
            <span className="text-base font-bold text-purple-400 font-mono">
              {storage.retentionDays} Days
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
