import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Helper to sanitize filenames so they don't break download links
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

// Promise wrapper to execute FFmpeg command line
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Spawning FFmpeg with arguments:", args.join(" "));
    const ffmpegProc = spawn("ffmpeg", args);
    let stderrOutput = "";

    ffmpegProc.stderr.on("data", (data) => {
      stderrOutput += data.toString();
    });

    ffmpegProc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error("FFmpeg process failed with code", code);
        console.error("FFmpeg stderr logs:", stderrOutput);
        reject(new Error(`FFmpeg compression failed (code ${code}): ${stderrOutput.slice(-300)}`));
      }
    });

    ffmpegProc.on("error", (err) => {
      console.error("Failed to start FFmpeg process:", err);
      reject(err);
    });
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Retrieve FFmpeg options from Form Data
    const videoCodec = (formData.get("videoCodec") as string) || "libx264";
    const preset = (formData.get("preset") as string) || "medium";
    const crf = (formData.get("crf") as string) || "23";
    const bitrate = (formData.get("bitrate") as string) || "";
    const resolution = (formData.get("resolution") as string) || "original";
    const fps = (formData.get("fps") as string) || "original";
    const audioCodec = (formData.get("audioCodec") as string) || "aac";
    const audioBitrate = (formData.get("audioBitrate") as string) || "128k";

    console.log("Video compression request received:");
    console.log(`- File Name: ${file.name}`);
    console.log(`- Size: ${file.size} bytes`);
    console.log(`- Codec: ${videoCodec}, Preset: ${preset}, CRF: ${crf}, Bitrate: ${bitrate || "Auto"}`);
    console.log(`- Resolution: ${resolution}, FPS: ${fps}`);
    console.log(`- Audio Codec: ${audioCodec}, Audio Bitrate: ${audioBitrate}`);

    // Ensure output directories exist
    const videosDir = path.join(process.cwd(), "public", "videos");
    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }

    const uniqueId = randomUUID();
    const cleanFilename = sanitize(file.name);
    const ext = path.extname(cleanFilename) || ".mp4";

    // Original uploaded file path
    const originalFilename = `original_${uniqueId}${ext}`;
    const originalPath = path.join(videosDir, originalFilename);

    // Write file upload buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalSize = buffer.length;
    await writeFile(originalPath, buffer);

    // Compressed output file path
    // We append the extension correctly.
    const compressedFilename = `compressed_${uniqueId}${ext}`;
    const outputPath = path.join(videosDir, compressedFilename);

    // Construct FFmpeg arguments
    const args: string[] = ["-y", "-i", originalPath];

    // 1. Video compression & codec settings
    if (videoCodec === "copy") {
      args.push("-c:v", "copy");
    } else {
      args.push("-c:v", videoCodec);
      
      // Preset speed
      if (preset) {
        args.push("-preset", preset);
      }

      // Bitrate vs quality (CRF)
      if (bitrate && bitrate !== "auto" && bitrate.trim() !== "") {
        args.push("-b:v", bitrate);
      } else if (crf) {
        args.push("-crf", crf);
      }
    }

    // 2. Video scaling / resolution
    if (resolution && resolution !== "original") {
      if (resolution === "1920x1080") {
        args.push("-vf", "scale=1920:-2");
      } else if (resolution === "1280x720") {
        args.push("-vf", "scale=1280:-2");
      } else if (resolution === "854x480") {
        args.push("-vf", "scale=854:-2");
      } else if (resolution === "640x360") {
        args.push("-vf", "scale=640:-2");
      } else {
        const match = resolution.match(/^(\d+)x(\d+)$/);
        if (match) {
          args.push("-vf", `scale=${match[1]}:-2`);
        }
      }
    }

    // 3. Frame rate settings
    if (fps && fps !== "original") {
      args.push("-r", fps);
    }

    // 4. Audio settings
    if (audioCodec === "none" || audioCodec === "an") {
      args.push("-an");
    } else if (audioCodec === "copy") {
      args.push("-c:a", "copy");
    } else {
      args.push("-c:a", audioCodec);
      if (audioBitrate && audioBitrate !== "original") {
        args.push("-b:a", audioBitrate);
      }
    }

    // Add Output path
    args.push(outputPath);

    // Execute FFmpeg process
    await runFFmpeg(args);

    if (!existsSync(outputPath)) {
      throw new Error("FFmpeg completed but output file was not generated");
    }

    const compressedSize = statSync(outputPath).size;

    return NextResponse.json({
      filename: file.name,
      originalSize,
      compressedSize,
      // The videos are in public/videos, which is served statically by Next.js at /videos/
      downloadUrl: `/videos/${compressedFilename}`,
      originalUrl: `/videos/${originalFilename}`,
    });

  } catch (err: any) {
    console.error("POST /api/video-compress error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Video compression failed" },
      { status: 500 }
    );
  }
}
