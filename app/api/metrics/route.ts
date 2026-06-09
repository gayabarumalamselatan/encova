import { NextResponse } from "next/server";
import { ffmpegManager } from "@/lib/ffmpeg";
import { nasManager } from "@/lib/nas";
import fs from "fs";
import path from "path";

export async function GET() {
  const ffmpegMetrics = ffmpegManager.getMetrics();
  const storageMetrics = await nasManager.getStorageMetrics();
  
  let activeCameras = 0;
  let activeOutputs = 0;

  try {
    const settingsPath = path.join(process.cwd(), "data", "settings", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      activeCameras = (data.cameras || []).filter((c: any) => c.enabled).length;
      activeOutputs = (data.outputs || []).filter((o: any) => o.enabled && o.cameraMappings && o.cameraMappings.length > 0).length;
    } else {
      activeCameras = ffmpegMetrics.activeInputs;
      activeOutputs = ffmpegMetrics.activeOutputs;
    }
  } catch (e) {
    activeCameras = ffmpegMetrics.activeInputs;
    activeOutputs = ffmpegMetrics.activeOutputs;
  }

  const metrics = [
    `# HELP encova_active_cameras Number of enabled cameras`,
    `# TYPE encova_active_cameras gauge`,
    `encova_active_cameras ${activeCameras}`,
    
    `# HELP encova_active_outputs Number of enabled outputs`,
    `# TYPE encova_active_outputs gauge`,
    `encova_active_outputs ${activeOutputs}`,
    
    `# HELP encova_ffmpeg_processes Number of running ffmpeg processes`,
    `# TYPE encova_ffmpeg_processes gauge`,
    `encova_ffmpeg_processes ${ffmpegMetrics.processCount}`,
    
    `# HELP encova_encoder_status Status of the encoder (1 = running, 0 = stopped/error)`,
    `# TYPE encova_encoder_status gauge`,
    `encova_encoder_status ${ffmpegMetrics.status}`,
    
    `# HELP encova_storage_total_bytes Total capacity of the storage path in bytes`,
    `# TYPE encova_storage_total_bytes gauge`,
    `encova_storage_total_bytes ${storageMetrics.totalBytes}`,
    
    `# HELP encova_storage_used_bytes Used capacity of the storage path in bytes`,
    `# TYPE encova_storage_used_bytes gauge`,
    `encova_storage_used_bytes ${storageMetrics.usedBytes}`,
    
    `# HELP encova_storage_free_bytes Free capacity of the storage path in bytes`,
    `# TYPE encova_storage_free_bytes gauge`,
    `encova_storage_free_bytes ${storageMetrics.freeBytes}`,
    
    `# HELP encova_recording_files_total Total number of recording files in the storage path`,
    `# TYPE encova_recording_files_total gauge`,
    `encova_recording_files_total ${storageMetrics.recordingFiles}`
  ].join("\\n");

  return new NextResponse(metrics + "\\n", {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
