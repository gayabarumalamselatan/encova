import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { decryptRtspUrl, maskRtspUrl } from "@/lib/security/encryption";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, rtspTransport = "tcp" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, connected: false, error: "Camera URL is required" },
        { status: 400 },
      );
    }

    const decryptedUrl = decryptRtspUrl(url);
    const maskedUrl = maskRtspUrl(url);

    console.log(`[CAMERA TEST] Probing connection for ${maskedUrl} via ${rtspTransport}...`);

    // Build ffprobe command with timeout
    const transportFlag = url.startsWith("rtsp://")
      ? `-rtsp_transport ${rtspTransport || "tcp"}`
      : "";

    const cmd = `ffprobe -v quiet -print_format json -show_streams -show_format ${transportFlag} -i "${decryptedUrl.replace(/"/g, '\\"')}"`;

    try {
      const { stdout } = await execAsync(cmd, { timeout: 7000 }); // 7 second max timeout for testing
      const info = JSON.parse(stdout);

      const streams = info.streams || [];
      const videoStream = streams.find((s: any) => s.codec_type === "video");
      const audioStream = streams.find((s: any) => s.codec_type === "audio");

      if (!videoStream && !audioStream && (!streams || streams.length === 0)) {
        return NextResponse.json({
          success: false,
          connected: false,
          error: "No media streams detected at the specified URL.",
        });
      }

      // Calculate FPS
      let fpsStr = "Unknown";
      if (videoStream?.avg_frame_rate) {
        const [num, den] = videoStream.avg_frame_rate.split("/").map(Number);
        if (num && den) {
          fpsStr = Math.round(num / den).toString();
        }
      } else if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        if (num && den) {
          fpsStr = Math.round(num / den).toString();
        }
      }

      // Calculate Bitrate
      let bitrateStr = "Unknown";
      const rawBitrate = info.format?.bit_rate || videoStream?.bit_rate;
      if (rawBitrate) {
        const kbps = Math.round(Number(rawBitrate) / 1000);
        bitrateStr = `${kbps} kbps`;
      }

      // Resolution
      const resStr =
        videoStream?.width && videoStream?.height
          ? `${videoStream.width}x${videoStream.height}`
          : "Unknown";

      // Codec
      const codecStr = videoStream?.codec_name
        ? videoStream.codec_name.toUpperCase()
        : "Unknown";

      // Audio
      const audioStr = audioStream
        ? `Yes (${audioStream.codec_name?.toUpperCase() || "AAC"})`
        : "None";

      return NextResponse.json({
        success: true,
        connected: true,
        codec: codecStr,
        resolution: resStr,
        fps: fpsStr,
        bitrate: bitrateStr,
        audio: audioStr,
      });
    } catch (execErr: any) {
      console.warn(`[CAMERA TEST] Probing failed for ${maskedUrl}:`, execErr.message);

      let cleanError = "Connection failed. Please check host, port, path, and credentials.";
      if (execErr.message.includes("ETIMEDOUT") || execErr.killed) {
        cleanError = "Connection timed out. Ensure the camera is reachable on the network.";
      } else if (execErr.message.includes("401") || execErr.message.includes("Unauthorized")) {
        cleanError = "Authentication failed. Check username and password.";
      } else if (execErr.message.includes("404") || execErr.message.includes("Not Found")) {
        cleanError = "Stream path not found. Verify stream path URL.";
      }

      return NextResponse.json({
        success: false,
        connected: false,
        error: cleanError,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, connected: false, error: err.message },
      { status: 500 },
    );
  }
}
