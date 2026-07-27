import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { metricsCollector } from "@/lib/monitoring/MetricsCollector";

export async function GET(req: Request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const cameraFilter = searchParams.get("camera");
    const statusFilter = searchParams.get("status");

    const latest = metricsCollector.getLatestSnapshot();
    let procs = latest.encoding.processes;

    if (cameraFilter && cameraFilter !== "all") {
      procs = procs.filter((p) => p.cameraId.toString() === cameraFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      procs = procs.filter((p) => p.status === statusFilter);
    }

    return NextResponse.json({
      activeCount: latest.encoding.activeProcesses,
      totalCount: latest.encoding.totalProcesses,
      processes: procs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
