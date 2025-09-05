import { NextResponse } from "next/server"
import { ffmpegManager } from "@/lib/ffmpeg"

export async function GET() {
  return NextResponse.json({
    logs: ffmpegManager.getLogs(),
  })
}
