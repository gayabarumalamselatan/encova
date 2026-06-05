import { NextResponse } from "next/server";
import { ffmpegManager } from "@/lib/ffmpeg";
import { nasManager } from "@/lib/nas";

export async function POST(req: Request) {
  try {
    const { inputUrl, outputs, nasConfig, streamSettings } = await req.json();

    if (nasConfig?.storageMode === "record") {
      await nasManager.mount(nasConfig);
    }

    ffmpegManager.restart(inputUrl, outputs, nasConfig, streamSettings);
    return NextResponse.json({
      success: true,
      status: ffmpegManager.getStatus(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
