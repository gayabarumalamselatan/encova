import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "settings", "settings.json");

function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { cameras: [], outputs: [], streamSettings: null };
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { cameras: [], outputs: [], streamSettings: null };
  }
}

function writeSettings(data: object) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

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
    const { cameras, outputs, streamSettings, autostart } = body;

    const current = readSettings();

    writeSettings({
      autostart: autostart ?? current.autostart,
      cameras: cameras ?? current.cameras,
      outputs: outputs ?? current.outputs,
      streamSettings: streamSettings ?? current.streamSettings,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/settings Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
