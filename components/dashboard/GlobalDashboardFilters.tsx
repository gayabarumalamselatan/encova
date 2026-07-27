"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw, Clock } from "lucide-react";

export interface DashboardFilterState {
  timeRange: string;
  status: string;
  codec: string;
  encoder: string;
}

interface GlobalDashboardFiltersProps {
  filters: DashboardFilterState;
  onFilterChange: (updated: Partial<DashboardFilterState>) => void;
  onReset: () => void;
  lastUpdated: string;
}

export default function GlobalDashboardFilters({
  filters,
  onFilterChange,
  onReset,
  lastUpdated,
}: GlobalDashboardFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Filter className="w-4 h-4" />
        </div>
        <span>Global Filters</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
        {/* Time Range */}
        <Select
          value={filters.timeRange}
          onValueChange={(val) => onFilterChange({ timeRange: val })}
        >
          <SelectTrigger className="bg-background/60 text-xs h-9">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5m">Last 5 Minutes</SelectItem>
            <SelectItem value="15m">Last 15 Minutes</SelectItem>
            <SelectItem value="1h">Last 1 Hour</SelectItem>
            <SelectItem value="6h">Last 6 Hours</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(val) => onFilterChange({ status: val })}
        >
          <SelectTrigger className="bg-background/60 text-xs h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="online">Online / Active</SelectItem>
            <SelectItem value="warning">Warning / Low FPS</SelectItem>
            <SelectItem value="offline">Offline / Stopped</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>

        {/* Codec Filter */}
        <Select
          value={filters.codec}
          onValueChange={(val) => onFilterChange({ codec: val })}
        >
          <SelectTrigger className="bg-background/60 text-xs h-9">
            <SelectValue placeholder="Codec" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Codecs</SelectItem>
            <SelectItem value="h264">H.264 / AVC</SelectItem>
            <SelectItem value="h265">H.265 / HEVC</SelectItem>
          </SelectContent>
        </Select>

        {/* Encoder Filter */}
        <Select
          value={filters.encoder}
          onValueChange={(val) => onFilterChange({ encoder: val })}
        >
          <SelectTrigger className="bg-background/60 text-xs h-9">
            <SelectValue placeholder="Encoder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Acceleration</SelectItem>
            <SelectItem value="nvenc">NVIDIA NVENC</SelectItem>
            <SelectItem value="qsv">Intel QSV</SelectItem>
            <SelectItem value="vaapi">Linux VAAPI</SelectItem>
            <SelectItem value="software">Software (CPU)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 self-end lg:self-auto text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Updated: {lastUpdated || "Live"}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 text-xs gap-1.5 border-border/80"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
