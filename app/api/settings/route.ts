import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settingsManager";

export async function GET() {
  try {
    const data = readSettings();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cameras, outputs, streamSettings, autostart, nasConfig } = body;

    const current = readSettings();

    writeSettings({
      ...current,
      autostart: autostart ?? current.autostart,
      cameras: cameras ?? current.cameras,
      outputs: outputs ?? current.outputs,
      streamSettings: streamSettings ?? current.streamSettings,
      nasConfig: nasConfig ?? current.nasConfig,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

