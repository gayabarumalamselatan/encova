"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Terminal, Cpu, Clock, Activity, Copy, Check } from "lucide-react";
import { FFmpegProcessMetrics } from "@/lib/monitoring/FFmpegMonitoringService";

interface FFmpegDetailModalProps {
  process: FFmpegProcessMetrics | null;
  onClose: () => void;
}

export default function FFmpegDetailModal({
  process,
  onClose,
}: FFmpegDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!process) return null;

  const logsText = process.recentLogs.join("\n");

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!process} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] bg-card border-border/80 text-foreground overflow-y-auto">
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-500" />
              FFmpeg Process Inspection — {process.cameraName} (PID: {process.pid || "N/A"})
            </DialogTitle>
            <Badge
              variant="outline"
              className={
                process.status === "running"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }
            >
              {process.status.toUpperCase()}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Live process diagnostic statistics, hardware encoder parameters, and stdout/stderr execution log buffer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-xl border border-border/40 font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px]">Codec</span>
              <span className="font-bold text-emerald-400">{process.codec}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Encoder</span>
              <span className="font-bold text-foreground">{process.encoder}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">HW Accel</span>
              <span className="font-bold text-cyan-400">{process.hwaccel.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Encode Speed</span>
              <span className="font-bold text-purple-400">{process.encodeSpeed}</span>
            </div>
          </div>

          {/* Metric Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg border border-border/30">
              <span className="text-muted-foreground block text-[10px]">FPS</span>
              <span className="text-sm font-bold">{process.fps}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/30">
              <span className="text-muted-foreground block text-[10px]">Bitrate</span>
              <span className="text-sm font-bold">{process.bitrate}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/30">
              <span className="text-muted-foreground block text-[10px]">Resolution</span>
              <span className="text-sm font-bold">{process.resolution}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-border/30">
              <span className="text-muted-foreground block text-[10px]">Uptime</span>
              <span className="text-sm font-bold">{process.uptimeSeconds}s</span>
            </div>
          </div>

          {/* Live Log Buffer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                Recent Process Log Buffer (Stderr / Stdout)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLogs}
                className="h-7 text-[11px] gap-1.5"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy Logs"}
              </Button>
            </div>

            <pre className="p-3.5 rounded-xl bg-black/90 border border-border/80 font-mono text-[11px] text-emerald-400/90 overflow-x-auto max-h-56 select-all leading-relaxed">
              {logsText || "[No stderr logs outputted by process]"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
