import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import checkDiskSpace from "check-disk-space";
import { ScanDirectory } from "./scandir";
const execPromise = util.promisify(exec);

function isDocker(): boolean {
  return process.env.DOCKER === "true" || fs.existsSync("/.dockerenv");
}

export interface NasConfig {
  storageMode: "stream" | "record";
  type: "smb" | "nfs";
  address: string;
  sharePath: string;
  username?: string;
  password?: string;
  retentionDays: number;
  segmentDuration: number;
  folderPattern: string;
}

function formatBytes(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export class NasManager {
  private currentConfig: NasConfig | null = null;
  private status: "Connected" | "Disconnected" = "Disconnected";
  private cache = {
    timestamp: 0,
    recordingUsedSpace: "0 Bytes",
    lastRecordingFile: null as any,
  };

  setCurrentConfig(config: NasConfig) {
    this.currentConfig = config;
  }

  getCurrentConfig(): NasConfig | null {
    return this.currentConfig;
  }

  async mount(config: NasConfig): Promise<boolean> {
    this.setCurrentConfig(config);
    if (config.storageMode !== "record") return true;
    try {
      const basePath = this.getBasePath(config);

      if (!isDocker() && process.platform === "win32" && config.type === "smb" && config.username) {
        try {
          const pass = config.password ? ` ${config.password}` : "";
          const user = `/user:${config.username}`;
          await execPromise(`net use "${basePath}"${pass} ${user}`);
        } catch (e) {}
      }
      
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }
      this.status = "Connected";
      return true;
    } catch (err) {
      console.error("Mount check failed:", err);
      this.status = "Disconnected";
      return false;
    }
  }

  getBasePath(config?: NasConfig): string {
    if (!isDocker()) {
      if (process.platform === "win32" && config) {
        if (config.type === "smb") {
          const share = config.sharePath.replace(/\//g, "\\").replace(/^\\+/, "");
          return `\\\\${config.address}\\${share}`;
        }
        return "C:\\encova_nas";
      }
      return config ? config.sharePath : (process.env.STORAGE_PATH || "/storage");
    }
    return process.env.STORAGE_PATH || "/storage";
  }

  getStatus() {
    return this.status;
  }

  async testConnection(
    config: NasConfig,
  ): Promise<{ success: boolean; message: string }> {
    this.setCurrentConfig(config);
    try {
      const basePath = this.getBasePath(config);

      if (!isDocker() && process.platform === "win32" && config.type === "smb" && config.username) {
        try {
          const pass = config.password ? ` ${config.password}` : "";
          const user = `/user:${config.username}`;
          await execPromise(`net use "${basePath}"${pass} ${user}`);
        } catch (e) {
          // Ignore
        }
      }

      if (!fs.existsSync(basePath)) {
        if (!isDocker()) {
          fs.mkdirSync(basePath, { recursive: true });
        } else {
          return { success: false, message: `Storage path ${basePath} does not exist.` };
        }
      }

      const testFile = path.join(basePath, ".encova-test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      this.status = "Connected";
      return {
        success: true,
        message: "Storage is writable",
      };
    } catch (e: any) {
      this.status = "Disconnected";
      return { success: false, message: e.message };
    }
  }

  async validateAndCreateFolder(
    config: NasConfig,
    folderPath: string,
  ): Promise<boolean> {
    this.setCurrentConfig(config);
    try {
      const basePath = this.getBasePath(config);

      if (!isDocker()) {
        if (process.platform === "win32" && config.type === "smb" && config.username) {
          try {
            const pass = config.password ? ` ${config.password}` : "";
            const user = `/user:${config.username}`;
            await execPromise(`net use "${basePath}"${pass} ${user}`);
          } catch (e) {}
        }
      } else {
        const resolvedFolder = path.resolve(folderPath);
        const resolvedBase = path.resolve(basePath);
        if (!resolvedFolder.startsWith(resolvedBase)) {
          throw new Error("Cannot create folder outside mounted storage path");
        }
      }

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      this.status = "Connected";
      return true;
    } catch (err) {
      console.error("Storage validation failed:", err);
      this.status = "Disconnected";
      throw new Error(`Storage validation failed: ${err}`);
    }
  }

  async cleanup(config: NasConfig) {
    if (config.storageMode !== "record") return;
    const basePath = this.getBasePath(config);

    try {
      if (process.platform === "win32") {
        // Simplified cleanup for Windows
        const days = config.retentionDays || 30;
        const ms = days * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const walk = (dir: string) => {
          if (!fs.existsSync(dir)) return;
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filepath = path.join(dir, file);
            const stat = fs.statSync(filepath);
            if (stat.isDirectory()) {
              walk(filepath);
            } else if (file.endsWith(".mp4") && now - stat.mtimeMs > ms) {
              fs.unlinkSync(filepath);
            }
          }
        };
        walk(basePath);
      } else {
        const days = config.retentionDays || 30;
        await execPromise(
          `find ${basePath} -type f -name "*.mp4" -mtime +${days} -exec rm {} \\;`,
        );
      }
    } catch (err) {
      console.error("Cleanup failed:", err);
    }
  }

  async getStorageInfo(config?: NasConfig) {
    const targetConfig = config || this.currentConfig;
    if (!targetConfig) {
      return {
        status: "Disconnected",
        totalSpace: "Unknown",
        availableSpace: "Unknown",
        usedSpace: "Unknown",
        recordingUsedSpace: "0 Bytes",
        lastRecordingFile: null,
      };
    }

    try {
      const basePath = this.getBasePath(targetConfig);

      let diskInfo = null;
      try {
        // Use Node's native statfs which supports UNC paths natively
        const statfsPath = basePath.replace(/\\/g, "/");
        if (fs.promises && typeof fs.promises.statfs === "function") {
          const s = await fs.promises.statfs(statfsPath);
          diskInfo = { size: s.bsize * s.blocks, free: s.bsize * s.bfree };
        } else {
          diskInfo = await checkDiskSpace(basePath);
        }
      } catch (err) {
        // If statfs fails or isn't available, try checkDiskSpace as fallback
        try {
          diskInfo = await checkDiskSpace(basePath);
        } catch (fallbackErr) {
          console.error("Failed to get disk info:", fallbackErr);
        }
      }

      const now = Date.now();
      // Cache duration = 30 seconds
      if (now - this.cache.timestamp > 30000 || this.cache.timestamp === 0) {
        try {
          const recordingInfo = await ScanDirectory(basePath);
          let latestFileInfo = null;

          if (recordingInfo.latestFile) {
            const stat = fs.statSync(recordingInfo.latestFile);
            let relativeName = recordingInfo.latestFile.replace(basePath, "");

            // Remove leading slashes/backslashes
            if (relativeName.startsWith("\\") || relativeName.startsWith("/")) {
              relativeName = relativeName.substring(1);
            }
            // Replace backslashes with forward slashes for cross-platform consistency
            relativeName = relativeName.replace(/\\/g, "/");

            latestFileInfo = {
              filename: relativeName,
              timestamp: new Date(recordingInfo.latestMtime).toISOString(),
              size: formatBytes(stat.size),
            };
          }

          this.cache.recordingUsedSpace = formatBytes(recordingInfo.totalSize);
          this.cache.lastRecordingFile = latestFileInfo;
          this.cache.timestamp = now;
        } catch (err) {
          console.error("Failed to scan directory:", err);
          if (this.cache.timestamp === 0) {
            this.cache.recordingUsedSpace = "0 Bytes";
            this.cache.lastRecordingFile = null;
          }
        }
      }

      return {
        status: this.getStatus(),
        totalSpace: diskInfo ? formatBytes(diskInfo.size) : "Unknown",
        availableSpace: diskInfo ? formatBytes(diskInfo.free) : "Unknown",
        usedSpace: diskInfo
          ? formatBytes(diskInfo.size - diskInfo.free)
          : "Unknown",
        recordingUsedSpace: this.cache.recordingUsedSpace,
        lastRecordingFile: this.cache.lastRecordingFile,
      };
    } catch (err) {
      console.error("Unhandled error in getStorageInfo:", err);
      return {
        status: "Disconnected",
        totalSpace: "Unknown",
        availableSpace: "Unknown",
        usedSpace: "Unknown",
        recordingUsedSpace: "0 Bytes",
        lastRecordingFile: null,
      };
    }
  }
}

export const nasManager = new NasManager();
