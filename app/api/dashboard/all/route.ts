import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { metricsCollector } from "@/lib/monitoring/MetricsCollector";

export async function GET(req: Request) {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const latest = metricsCollector.getLatestSnapshot();
    const history = metricsCollector.getHistory(from || undefined, to || undefined);

    return NextResponse.json({
      latest,
      historyCount: history.length,
      history: history.slice(-120), // return last 120 points (~10 mins) for fast chart rendering
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
