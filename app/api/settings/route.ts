import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function isDocker(): boolean {
  return process.env.DOCKER === "true" || fs.existsSync("/.dockerenv");
}

function getSettingsPath() {
  if (isDocker()) {
    return path.join(process.cwd(), "data", "settings", "settings.json");
  }
  return path.join(process.cwd(), "settings", "settings.json");
}

function readSettings() {
  const settingsFile = getSettingsPath();

  if (!fs.existsSync(settingsFile)) {
    if (isDocker()) {
      const defaultSettingsFile = path.join(process.cwd(), "settings", "settings.json");
      if (fs.existsSync(defaultSettingsFile)) {
        try {
          const raw = fs.readFileSync(defaultSettingsFile, "utf-8");
          const data = JSON.parse(raw);
          writeSettings(data);
          return data;
        } catch {
          /* fallback to defaults */
        }
      }
    }
    return { cameras: [], outputs: [], streamSettings: null, nasConfig: null };
  }

  try {
    const raw = fs.readFileSync(settingsFile, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { cameras: [], outputs: [], streamSettings: null, nasConfig: null };
  }
}

function writeSettings(data: object) {
  const settingsFile = getSettingsPath();
  const settingsDir = path.dirname(settingsFile);

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2), "utf-8");
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
    const { cameras, outputs, streamSettings, autostart, nasConfig } = body;

    const current = readSettings();

    writeSettings({
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
