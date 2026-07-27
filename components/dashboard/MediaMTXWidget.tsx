"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Signal, Users, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { MediaMTXMetrics } from "@/lib/monitoring/MediaMTXMonitoringService";

interface MediaMTXWidgetProps {
  data: MediaMTXMetrics;
}

export default function MediaMTXWidget({ data }: MediaMTXWidgetProps) {
  return (
    <Card className="bg-card/90 border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            MediaMTX Media Server & Protocol Sessions
          </CardTitle>
          <Badge
            variant="outline"
            className={
              data.connected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs gap-1"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs gap-1"
            }
          >
            {data.connected ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
            {data.connected ? "RELAY ACTIVE" : "STANDBY"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Session Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Publishers</span>
            <span className="text-xl font-bold text-cyan-400 font-mono">{data.publishers}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Readers</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{data.readers}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">RTSP Sessions</span>
            <span className="text-xl font-bold text-foreground font-mono">{data.rtspSessions}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">HLS Streams</span>
            <span className="text-xl font-bold text-purple-400 font-mono">{data.hlsStreams}</span>
          </div>
        </div>

        {/* Bandwidth Throughput Bar */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-muted-foreground block text-[10px]">Bandwidth In</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">{data.bandwidthInMbps} Mbps</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-border/60" />

          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-muted-foreground block text-[10px]">Bandwidth Out</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{data.bandwidthOutMbps} Mbps</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
