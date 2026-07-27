"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Terminal, Eye, CheckCircle2, AlertCircle, Play, Square } from "lucide-react";
import { FFmpegProcessMetrics } from "@/lib/monitoring/FFmpegMonitoringService";
import FFmpegDetailModal from "./FFmpegDetailModal";

interface ActiveFFmpegTableProps {
  processes: FFmpegProcessMetrics[];
}

export default function ActiveFFmpegTable({ processes }: ActiveFFmpegTableProps) {
  const [selectedProcess, setSelectedProcess] = useState<FFmpegProcessMetrics | null>(null);

  return (
    <>
      <Card className="bg-card/90 border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              Active FFmpeg Encoding Processes ({processes.length})
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              Live Monitor
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-2 p-0 overflow-auto max-h-[350px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md">
              <TableRow className="border-border/40 text-[11px]">
                <TableHead className="font-semibold">PID</TableHead>
                <TableHead className="font-semibold">Camera</TableHead>
                <TableHead className="font-semibold">Codec & Encoder</TableHead>
                <TableHead className="font-semibold">HW Accel</TableHead>
                <TableHead className="font-semibold">FPS</TableHead>
                <TableHead className="font-semibold">Speed</TableHead>
                <TableHead className="font-semibold">Bitrate</TableHead>
                <TableHead className="font-semibold">Uptime</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs font-mono">
              {processes.length > 0 ? (
                processes.map((proc) => (
                  <TableRow
                    key={proc.cameraId}
                    className="border-border/30 hover:bg-muted/20 cursor-pointer"
                    onClick={() => setSelectedProcess(proc)}
                  >
                    <TableCell className="font-bold text-emerald-400">
                      {proc.pid ? proc.pid : "-"}
                    </TableCell>
                    <TableCell className="font-sans font-medium text-foreground">
                      {proc.cameraName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      <span className="text-foreground font-semibold">{proc.codec}</span> ({proc.encoder})
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                        {proc.hwaccel}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{proc.fps}</TableCell>
                    <TableCell className="text-purple-400 font-semibold">{proc.encodeSpeed}</TableCell>
                    <TableCell className="text-muted-foreground">{proc.bitrate}</TableCell>
                    <TableCell className="text-muted-foreground">{proc.uptimeSeconds}s</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          proc.status === "running"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                            : "bg-destructive/10 text-destructive border-destructive/30 text-[10px]"
                        }
                      >
                        {proc.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProcess(proc);
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground font-sans">
                    No active FFmpeg encoding processes currently running. Start encoding from the CCTV Encode page.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspection Modal */}
      <FFmpegDetailModal process={selectedProcess} onClose={() => setSelectedProcess(null)} />
    </>
  );
}
