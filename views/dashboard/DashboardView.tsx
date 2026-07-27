"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Video,
  FileArchive,
  BookOpen,
  Users,
  LogOut,
  RefreshCw,
  Activity,
  ArrowLeft,
} from "lucide-react";

import GlobalDashboardFilters, {
  DashboardFilterState,
} from "@/components/dashboard/GlobalDashboardFilters";
import SystemOverviewCards from "@/components/dashboard/SystemOverviewCards";
import CameraStatusWidget from "@/components/dashboard/CameraStatusWidget";
import EncodingPerformanceChart from "@/components/dashboard/EncodingPerformanceChart";
import HardwareUtilizationWidget from "@/components/dashboard/HardwareUtilizationWidget";
import MediaMTXWidget from "@/components/dashboard/MediaMTXWidget";
import NetworkStorageWidget from "@/components/dashboard/NetworkStorageWidget";
import ActiveFFmpegTable from "@/components/dashboard/ActiveFFmpegTable";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import CapacityWidget from "@/components/dashboard/CapacityWidget";

import HeaderBar from "@/components/layout/HeaderBar";

import { DashboardTelemetrySnapshot } from "@/lib/monitoring/MetricsCollector";

export default function DashboardView() {
  const { session, logout } = useAuth();
  const [telemetry, setTelemetry] = useState<DashboardTelemetrySnapshot | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const [filters, setFilters] = useState<DashboardFilterState>({
    timeRange: "1h",
    status: "all",
    codec: "all",
    encoder: "all",
  });

  const fetchTelemetry = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.codec !== "all") params.set("codec", filters.codec);

      const res = await fetch(`/api/dashboard/all?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data.latest);
        setHistory(data.history || []);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("[DASHBOARD] Telemetry fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    // 2-second polling tick loop
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchTelemetry();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      timeRange: "1h",
      status: "all",
      codec: "all",
      encoder: "all",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header Bar */}
        <HeaderBar />

        {/* Dashboard Main Container */}
        <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Global Filters */}
          <GlobalDashboardFilters
            filters={filters}
            onFilterChange={(up) => setFilters((prev) => ({ ...prev, ...up }))}
            onReset={handleResetFilters}
            lastUpdated={lastUpdated}
          />

          {telemetry ? (
            <div className="space-y-6">
              {/* Section 1: System Overview Cards */}
              <SystemOverviewCards data={telemetry} />

              {/* Section 2: Camera Status Overview */}
              <CameraStatusWidget data={telemetry.cameras} />

              {/* Section 3: Encoding Performance Chart */}
              <EncodingPerformanceChart data={telemetry.encoding} history={history} />

              {/* Section 4 & 5: Hardware & MediaMTX */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <HardwareUtilizationWidget system={telemetry.system} gpu={telemetry.gpu} />
                <MediaMTXWidget data={telemetry.mediaMtx} />
              </div>

              {/* Section 6 & 7: Storage & Network */}
              <NetworkStorageWidget storage={telemetry.storage} />

              {/* Section 8: Active FFmpeg Processes Table */}
              <ActiveFFmpegTable processes={telemetry.encoding.processes} />

              {/* Section 9 & 10: Alerts & Capacity Estimation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AlertsPanel alerts={telemetry.alerts} />
                <CapacityWidget capacity={telemetry.capacity} />
              </div>
            </div>
          ) : (
            <div className="min-h-[400px] flex items-center justify-center flex-col gap-3 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-mono">Initializing Encova NOC Telemetry Engine...</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Asisgo Encova Enterprise NOC Platform. Real-time operational telemetry.
        </footer>
      </div>
    </ProtectedRoute>
  );
}
