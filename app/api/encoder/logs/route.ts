import { NextResponse } from "next/server";
import { ffmpegManager } from "@/lib/ffmpeg";

export async function GET() {
  // console.log("LOG INSTANCE:", ffmpegManager.getInstanceId());

  return NextResponse.json({
    logs: ffmpegManager.getLogs(),
  });
}
