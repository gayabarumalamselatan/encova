import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { compressionHandlers, mimeTypeMap, extensionMap } from "@/lib/compress";
import type { CompressionOptions } from "@/lib/compress/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let tempInputPath = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const level = (formData.get("level") as string) || "medium";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Detect type ────────────────────────────────────────────────────────────
    const ext = path.extname(file.name).toLowerCase();
    const fileType = mimeTypeMap[file.type] ?? extensionMap[ext];

    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file format" },
        { status: 400 },
      );
    }

    const handler = compressionHandlers[fileType];
    if (!handler) {
      return NextResponse.json(
        { error: `No compression handler registered for: ${fileType}` },
        { status: 400 },
      );
    }

    // ── Save upload to temp dir ────────────────────────────────────────────────
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalSize = buffer.length;

    const uniqueId = crypto.randomUUID();
    tempInputPath = path.join(os.tmpdir(), `encova_${uniqueId}${ext}`);
    await writeFile(tempInputPath, buffer);

    // ── Prepare output path ────────────────────────────────────────────────────
    const downloadsDir = path.join(process.cwd(), "public", "downloads");
    if (!existsSync(downloadsDir)) {
      await mkdir(downloadsDir, { recursive: true });
    }

    const outputFilename = `${uniqueId}_${file.name}`;
    const outputPath = path.join(downloadsDir, outputFilename);

    // ── Compress ───────────────────────────────────────────────────────────────
    const options: CompressionOptions = {
      level: level as CompressionOptions["level"],
    };
    await handler(tempInputPath, outputPath, options);

    const compressedSize = statSync(outputPath).size;

    return NextResponse.json({
      filename: file.name,
      originalSize,
      compressedSize,
      downloadUrl: `/downloads/${outputFilename}`,
    });
  } catch (err: any) {
    console.error("POST /api/compress error:", err);
    const msg: string = err?.message ?? "Compression failed";
    // Give a friendly hint if Ghostscript is not found
    const friendly =
      msg.includes("ENOENT") ||
      msg.includes("not found") ||
      msg.includes("not recognized")
        ? "Ghostscript not found. Please install it and make sure it is in your PATH."
        : msg;
    return NextResponse.json({ error: friendly }, { status: 500 });
  } finally {
    // Always clean up the temp input file
    if (tempInputPath) {
      try {
        unlinkSync(tempInputPath);
      } catch {
        /* ignore */
      }
    }
  }
}
