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
    const statusFilter = searchParams.get("status");
    const codecFilter = searchParams.get("codec");

    const latest = metricsCollector.getLatestSnapshot();
    let cameras = latest.cameras.cameras;

    if (statusFilter && statusFilter !== "all") {
      cameras = cameras.filter((c) => c.status === statusFilter);
    }
    if (codecFilter && codecFilter !== "all") {
      cameras = cameras.filter((c) => c.codec.toLowerCase() === codecFilter.toLowerCase());
    }

    return NextResponse.json({
      summary: {
        total: latest.cameras.total,
        online: latest.cameras.online,
        warning: latest.cameras.warning,
        offline: latest.cameras.offline,
        disabled: latest.cameras.disabled,
      },
      cameras,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
