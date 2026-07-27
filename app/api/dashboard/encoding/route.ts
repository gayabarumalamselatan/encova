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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const latest = metricsCollector.getLatestSnapshot();
    const history = metricsCollector.getHistory(from || undefined, to || undefined);

    const timeSeries = history.slice(-100).map((h) => ({
      timestamp: h.timestamp,
      avgFps: h.encoding.avgFps,
      activeProcesses: h.encoding.activeProcesses,
      droppedFrames: h.encoding.totalDroppedFrames,
    }));

    return NextResponse.json({
      latest: latest.encoding,
      timeSeries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
