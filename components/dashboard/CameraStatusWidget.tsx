"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, Search, CheckCircle2, AlertCircle, XCircle, Slash, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CameraStatusSummary, CameraDetail } from "@/lib/monitoring/CameraMonitoringService";

interface CameraStatusWidgetProps {
  data: CameraStatusSummary;
}

const STATUS_COLORS: Record<string, string> = {
  online: "#10b981", // green-500
  warning: "#f59e0b", // yellow-500
  offline: "#ef4444", // red-500
  disabled: "#6b7280", // gray-500
};

export default function CameraStatusWidget({ data }: CameraStatusWidgetProps) {
  const [search, setSearch] = useState("");

  const pieData = [
    { name: "Online", value: data.online, color: STATUS_COLORS.online },
    { name: "Warning", value: data.warning, color: STATUS_COLORS.warning },
    { name: "Offline", value: data.offline, color: STATUS_COLORS.offline },
    { name: "Disabled", value: data.disabled, color: STATUS_COLORS.disabled },
  ].filter((d) => d.value > 0);

  const filteredCameras = data.cameras.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.sourceType.toLowerCase().includes(search.toLowerCase()) ||
      c.codec.toLowerCase().includes(search.toLowerCase()),
  );

  const renderStatusBadge = (status: CameraDetail["status"]) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ONLINE
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 text-[11px]">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            WARNING
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-[11px]">
            <XCircle className="w-3 h-3 text-destructive" />
            OFFLINE
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-[11px]">
            <Slash className="w-3 h-3" />
            DISABLED
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left Column: Camera Donut & Summary Status Cards */}
      <Card className="bg-card/90 border-border/60 shadow-sm">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-500" />
              Camera Fleet Overview
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              Total: {data.total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Status Metric Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Online</span>
              <span className="text-xl font-bold text-emerald-400">{data.online}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Warning</span>
              <span className="text-xl font-bold text-amber-400">{data.warning}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Offline</span>
              <span className="text-xl font-bold text-destructive">{data.offline}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold">Disabled</span>
              <span className="text-xl font-bold text-muted-foreground">{data.disabled}</span>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="h-44 w-full relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground">No Cameras Configured</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right Column: Interactive Camera Inventory Table */}
      <Card className="bg-card/90 border-border/60 shadow-sm lg:col-span-2 flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Real-Time Camera Stream Details
            </CardTitle>
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cameras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-background/50"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 p-0 flex-1 overflow-auto max-h-[280px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-md">
              <TableRow className="border-border/40 text-[11px]">
                <TableHead className="font-semibold">Camera Name</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold">Codec</TableHead>
                <TableHead className="font-semibold">Res & FPS</TableHead>
                <TableHead className="font-semibold">Bitrate</TableHead>
                <TableHead className="font-semibold text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs font-mono">
              {filteredCameras.length > 0 ? (
                filteredCameras.map((cam) => (
                  <TableRow key={cam.id} className="border-border/30 hover:bg-muted/20">
                    <TableCell className="font-sans font-medium text-foreground">{cam.name}</TableCell>
                    <TableCell>{renderStatusBadge(cam.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">{cam.sourceType}</TableCell>
                    <TableCell className="text-emerald-400 font-semibold">{cam.codec}</TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {cam.resolution} @ {cam.fps}fps
                    </TableCell>
                    <TableCell className="text-foreground">{cam.currentBitrate}</TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono">
                      {cam.latencyMs > 0 ? `${cam.latencyMs}ms` : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground font-sans">
                    No matching camera streams found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
