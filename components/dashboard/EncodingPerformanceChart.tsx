"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Zap, Activity, AlertTriangle, Layers } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { EncodingOverallMetrics } from "@/lib/monitoring/FFmpegMonitoringService";

interface EncodingPerformanceChartProps {
  data: EncodingOverallMetrics;
  history?: any[];
}

export default function EncodingPerformanceChart({
  data,
  history = [],
}: EncodingPerformanceChartProps) {
  const chartData = history.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    fps: item.encoding?.avgFps || 0,
    active: item.encoding?.activeProcesses || 0,
    dropped: item.encoding?.totalDroppedFrames || 0,
  }));

  return (
    <Card className="bg-card/90 border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            FFmpeg Encoding Engine Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-mono">
              Speed: {data.avgEncodeSpeed}
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-mono">
              Active: {data.activeProcesses} Processes
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Avg FPS</span>
            <span className="text-2xl font-black text-foreground font-mono">{data.avgFps}</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Frames</span>
            <span className="text-2xl font-black text-foreground font-mono">{data.totalFrames.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Dropped Frames</span>
            <span className={`text-2xl font-black font-mono ${data.totalDroppedFrames > 0 ? "text-amber-400" : "text-foreground"}`}>
              {data.totalDroppedFrames}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Restarts / Errors</span>
            <span className={`text-2xl font-black font-mono ${data.totalRestartCount > 0 ? "text-destructive" : "text-foreground"}`}>
              {data.totalRestartCount}
            </span>
          </div>
        </div>

        {/* Time-Series Line/Area Chart */}
        <div className="h-56 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fpsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="fps" name="Average FPS" stroke="#10b981" fillOpacity={1} fill="url(#fpsGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="active" name="Active Encodes" stroke="#3b82f6" fillOpacity={1} fill="url(#activeGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
              Collecting real-time encoding telemetry data...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
