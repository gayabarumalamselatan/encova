import { NextResponse } from "next/server";
import { ffmpegManager } from "@/lib/ffmpeg";
import { nasManager } from "@/lib/nas";

export async function POST(req: Request) {
  try {
    console.log("api di hit");
    // console.log("START INSTANCE:", ffmpegManager.getInstanceId());
    const { cameras, outputs, nasConfig, streamSettings } = await req.json();
    console.log("payload di parse");
    if (nasConfig?.storageMode === "record") {
      console.log("mount nas");
      await nasManager.mount(nasConfig);
      console.log("mount nas done");
    }
    console.log("run ffmpeg");
    const { decryptRtspUrl } = await import("@/lib/security/encryption");
    const runtimeCameras = Array.isArray(cameras)
      ? cameras.map((c: any) => ({ ...c, url: decryptRtspUrl(c.url) }))
      : cameras;
    ffmpegManager.start(runtimeCameras, outputs, nasConfig, streamSettings);
    console.log("run ffmpeg done");
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
