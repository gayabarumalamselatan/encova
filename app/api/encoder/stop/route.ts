import { NextResponse } from "next/server"
import { ffmpegManager } from "@/lib/ffmpeg"

export async function POST() {
  ffmpegManager.stop()
  return NextResponse.json({ success: true, status: ffmpegManager.getStatus() })
}
