import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

function streamFile(filePath: string): ReadableStream {
  const readStream = createReadStream(filePath);
  return new ReadableStream({
    start(controller) {
      readStream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      readStream.on("end", () => controller.close());
      readStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      readStream.destroy();
    },
  });
}

export async function GET(req: Request, { params }: { params: { filename: string } }) {
  const filename = params.filename;
  if (!filename) {
    return new NextResponse("Filename is required", { status: 400 });
  }

  const videosDir = path.resolve(process.env.VIDEO_STORAGE_PATH || "/home/videos");
  const filePath = path.resolve(videosDir, filename);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(videosDir)) {
    return new NextResponse("Invalid file path", { status: 403 });
  }

  if (!existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const stat = statSync(filePath);
    const fileSize = stat.size;
    
    // Check if it's a range request
    const range = req.headers.get("range");
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const fileStream = createReadStream(filePath, { start, end });
      
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        }
      });
      
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": "video/mp4",
      };
      
      return new NextResponse(stream, { status: 206, headers: head });
    } else {
      const head = {
        "Content-Length": fileSize.toString(),
        "Content-Type": "video/mp4",
      };
      
      return new NextResponse(streamFile(filePath), { headers: head });
    }
  } catch (err) {
    console.error("Error serving video:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
