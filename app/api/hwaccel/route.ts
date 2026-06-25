import { NextResponse } from "next/server";
import { detectHardwareCapabilities } from "@/lib/hwaccel";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";
  
  try {
    const caps = await detectHardwareCapabilities(force);
    return NextResponse.json(caps);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
