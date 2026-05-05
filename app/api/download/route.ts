import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file");

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "downloads", safeFilename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = "application/octet-stream";
    
    if (ext === ".docx") {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (ext === ".xlsx") {
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".kml") {
      contentType = "application/vnd.google-earth.kml+xml";
    } else if (ext === ".kmz") {
      contentType = "application/vnd.google-earth.kmz";
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
