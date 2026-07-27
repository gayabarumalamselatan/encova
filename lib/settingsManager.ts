import fs from "fs";
import path from "path";
import {
  encrypt,
  decrypt,
  encryptRtspUrl,
  decryptRtspUrl,
  isEncrypted,
  parseRtspUrl,
} from "./security/encryption";

function isDocker(): boolean {
  return process.env.DOCKER === "true" || fs.existsSync("/.dockerenv");
}

function getSettingsPath() {
  if (isDocker()) {
    return path.join(process.cwd(), "data", "settings", "settings.json");
  }
  return path.join(process.cwd(), "settings", "settings.json");
}

/**
 * Encrypts all sensitive fields (RTSP camera passwords & user account passwords)
 * before persisting settings to disk.
 */
export function writeSettings(data: any) {
  const settingsFile = getSettingsPath();
  const settingsDir = path.dirname(settingsFile);

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  // Deep clone data to avoid mutating caller object
  const encryptedData = JSON.parse(JSON.stringify(data));

  // 1. Encrypt camera RTSP passwords
  if (Array.isArray(encryptedData.cameras)) {
    encryptedData.cameras = encryptedData.cameras.map((cam: any) => {
      if (cam.url) {
        return { ...cam, url: encryptRtspUrl(cam.url) };
      }
      return cam;
    });
  }

  // 2. Encrypt account passwords
  if (Array.isArray(encryptedData.accounts)) {
    encryptedData.accounts = encryptedData.accounts.map((acc: any) => {
      if (acc.password) {
        return { ...acc, password: encrypt(acc.password) };
      }
      return acc;
    });
  }

  fs.writeFileSync(
    settingsFile,
    JSON.stringify(encryptedData, null, 2),
    "utf-8",
  );
}

/**
 * Reads settings from disk and transparently decrypts sensitive fields for runtime usage.
 * Automatically performs migration if plain text passwords are detected.
 */
export function readSettings() {
  const settingsFile = getSettingsPath();

  let rawData: any = null;

  if (!fs.existsSync(settingsFile)) {
    if (isDocker()) {
      const defaultSettingsFile = path.join(
        process.cwd(),
        "settings",
        "settings.json",
      );
      if (fs.existsSync(defaultSettingsFile)) {
        try {
          const raw = fs.readFileSync(defaultSettingsFile, "utf-8");
          rawData = JSON.parse(raw);
        } catch {
          /* fallback to defaults */
        }
      }
    }
    if (!rawData) {
      return {
        cameras: [],
        outputs: [],
        streamSettings: null,
        nasConfig: null,
        accounts: [],
        availableModules: [],
      };
    }
  } else {
    try {
      const raw = fs.readFileSync(settingsFile, "utf-8");
      rawData = JSON.parse(raw);
    } catch {
      return {
        cameras: [],
        outputs: [],
        streamSettings: null,
        nasConfig: null,
        accounts: [],
        availableModules: [],
      };
    }
  }

  let needsMigration = false;

  // Process cameras: check for unencrypted RTSP passwords & decrypt for runtime
  if (Array.isArray(rawData.cameras)) {
    rawData.cameras = rawData.cameras.map((cam: any) => {
      if (cam.url) {
        const parsed = parseRtspUrl(cam.url);
        if (parsed.password && !isEncrypted(parsed.password)) {
          needsMigration = true;
        }
        return { ...cam, url: decryptRtspUrl(cam.url) };
      }
      return cam;
    });
  }

  // Process accounts: check for unencrypted account passwords & decrypt for runtime
  if (Array.isArray(rawData.accounts)) {
    rawData.accounts = rawData.accounts.map((acc: any) => {
      if (acc.password) {
        if (!isEncrypted(acc.password)) {
          needsMigration = true;
        }
        return { ...acc, password: decrypt(acc.password) };
      }
      return acc;
    });
  }

  // Perform automatic migration if plain text passwords were found
  if (needsMigration) {
    console.log(
      "[SECURITY] Plaintext credentials detected in settings. Performing automatic transparent migration to AES-256-GCM encryption...",
    );
    writeSettings(rawData);
  }

  return rawData;
}
