import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { compressOffice, sanitizeFilename } from "@/lib/compress/office";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Allowed types ─────────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([".docx", ".xlsx"]);
const ALLOWED_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ── POST /api/compress/office ─────────────────────────────────────────────────
/**
 * @swagger
 * /api/compress/office:
 *   post:
 *     tags:
 *       - Office Compression
 *     summary: Compress DOCX and XLSX files using LibreOffice
 *     description: |
 *       Accepts multiple DOCX or XLSX files via multipart/form-data.
 *       Each file is processed using LibreOffice in headless mode.
 *       The output format is identical to the input format.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: One or more DOCX or XLSX files to compress
 *               compressionLevel:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Compression level (reserved for future tuning)
 *     responses:
 *       200:
 *         description: Compression results for all uploaded files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OfficeCompressResponse'
 *       400:
 *         description: No files provided or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server or LibreOffice error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(req: Request) {
  let tempPaths: string[] = [];

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    // Also accept a single field named "file" for compatibility
    const singleFile = formData.get("file") as File | null;
    const allFiles = singleFile ? [...files, singleFile] : files;

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Send files via the 'files' field." },
        { status: 400 }
      );
    }

    // ── Ensure output dir ──────────────────────────────────────────────────────
    const downloadsDir = path.join(process.cwd(), "public", "downloads");
    if (!existsSync(downloadsDir)) {
      await mkdir(downloadsDir, { recursive: true });
    }

    // ── Process each file ──────────────────────────────────────────────────────
    const results: object[] = [];

    for (const file of allFiles) {
      const ext = path.extname(file.name).toLowerCase();
      const safeName = sanitizeFilename(file.name);

      // Validate type
      if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME.has(file.type)) {
        results.push({
          filename: file.name,
          status: "failed",
          error: `Unsupported file format: '${ext}'. Only .docx and .xlsx are accepted.`,
        });
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        results.push({
          filename: file.name,
          status: "failed",
          error: `File exceeds the 50 MB limit (size: ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
        });
        continue;
      }

      // Save to temp
      const uniqueId = crypto.randomUUID();
      const tempInput = path.join(os.tmpdir(), `encova_${uniqueId}${ext}`);
      tempPaths.push(tempInput);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const originalSize = buffer.length;
      await writeFile(tempInput, buffer);

      // LibreOffice writes to a temp subdir (to avoid name collisions)
      const tempOutDir = path.join(os.tmpdir(), `encova_out_${uniqueId}`);
      const outputFilename = `${uniqueId}_${safeName}`;
      const outputPath = path.join(downloadsDir, outputFilename);

      try {
        await compressOffice(tempInput, tempOutDir, outputPath);
        const compressedSize = statSync(outputPath).size;
        const reduction = originalSize > 0
          ? `${Math.round(((originalSize - compressedSize) / originalSize) * 100)}%`
          : "0%";

        results.push({
          filename: file.name,
          originalSize,
          compressedSize,
          reduction,
          downloadUrl: `/downloads/${outputFilename}`,
          status: "completed",
        });
      } catch (err: any) {
        console.error(`Office compress error [${file.name}]:`, err);
        results.push({
          filename: file.name,
          status: "failed",
          error: err?.message ?? "LibreOffice compression failed",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("POST /api/compress/office error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  } finally {
    // Clean up temp input files
    for (const p of tempPaths) {
      try { await unlink(p); } catch { /* ignore */ }
    }
  }
}
