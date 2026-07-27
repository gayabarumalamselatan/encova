"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gauge, Cpu, Zap, Layers, AlertCircle } from "lucide-react";
import { CapacityMetrics } from "@/lib/monitoring/CapacityEstimationService";

interface CapacityWidgetProps {
  capacity: CapacityMetrics;
}

export default function CapacityWidget({ capacity }: CapacityWidgetProps) {
  return (
    <Card className="bg-card/90 border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            System Capacity & Stream Scalability Estimation
          </CardTitle>
          {capacity.bottleneck !== "None" && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Bottleneck: {capacity.bottleneck}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Stream Capacity Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Current Active Stream Load</span>
            <span className="font-mono font-bold text-emerald-400">
              {capacity.currentActiveCameras} / {capacity.estimatedMaxCameras} Streams Max
            </span>
          </div>
          <Progress
            value={100 - capacity.remainingCapacityPercent}
            className="h-2.5 bg-emerald-950/40"
          />
        </div>

        {/* Headroom Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Remaining Capacity</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {capacity.remainingCapacityPercent}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">CPU Headroom</span>
            <span className="text-xl font-bold text-primary font-mono">
              {capacity.cpuRemainingPercent}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">GPU Headroom</span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              {capacity.gpuRemainingPercent}%
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">CPU Cost / Stream</span>
            <span className="text-base font-bold text-foreground font-mono">
              ~{capacity.estimatedCpuPerStreamPercent}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
