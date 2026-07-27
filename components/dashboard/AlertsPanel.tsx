"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, Bell, ShieldAlert, CheckCircle2 } from "lucide-react";
import { AlertItem } from "@/lib/monitoring/AlertService";

interface AlertsPanelProps {
  alerts: AlertItem[];
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const filtered = alerts.filter(
    (a) => filterSeverity === "all" || a.severity === filterSeverity,
  );

  const renderBadge = (sev: AlertItem["severity"]) => {
    switch (sev) {
      case "critical":
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
            CRITICAL
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
            WARNING
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
            INFO
          </Badge>
        );
    }
  };

  const renderIcon = (sev: AlertItem["severity"]) => {
    switch (sev) {
      case "critical":
        return <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />;
    }
  };

  return (
    <Card className="bg-card/90 border-border/60 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            Platform Alerts & System Feeds
          </CardTitle>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterSeverity("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterSeverity === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilterSeverity("critical")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterSeverity === "critical" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Critical
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 p-0 flex-1 overflow-auto max-h-[300px]">
        <div className="divide-y divide-border/30">
          {filtered.length > 0 ? (
            filtered.map((alert) => (
              <div key={alert.id} className="p-3 hover:bg-muted/20 transition-colors flex items-start gap-3">
                {renderIcon(alert.severity)}
                <div className="space-y-1 text-xs w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{alert.title}</span>
                    {renderBadge(alert.severity)}
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{alert.message}</p>
                  <span className="text-[10px] text-muted-foreground/70 font-mono block">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground font-sans">
              No active system alerts in this category.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
