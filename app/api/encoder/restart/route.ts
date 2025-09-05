import { NextResponse } from "next/server"
import { ffmpegManager } from "@/lib/ffmpeg"

export async function POST(req: Request) {
  const { inputUrl, outputs } = await req.json()
  ffmpegManager.restart(inputUrl, outputs)
  return NextResponse.json({ success: true, status: ffmpegManager.getStatus() })
}
