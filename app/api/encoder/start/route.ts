import { NextResponse } from "next/server"
import { ffmpegManager } from "@/lib/ffmpeg"

export async function POST(req: Request) {
  try {
    const { cameras, outputs } = await req.json()
    ffmpegManager.start(cameras, outputs)
    return NextResponse.json({ success: true, status: ffmpegManager.getStatus() })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
