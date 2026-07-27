import { NextResponse } from "next/server";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { metricsCollector } from "@/lib/monitoring/MetricsCollector";

export async function GET() {
  try {
    const isAuth = await isAuthenticated();
    if (!isAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const latest = metricsCollector.getLatestSnapshot();
    return NextResponse.json(latest.storage);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
