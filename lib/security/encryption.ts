import crypto from "crypto";

const PREFIX = "enc:v1:";

/**
 * Derives a 32-byte AES key from the MASTER_KEY environment variable using SHA-256.
 * Fails fast with a clear error message if MASTER_KEY is missing.
 */
function getMasterKey(): Buffer {
  const masterKey = process.env.MASTER_KEY;
  if (!masterKey || masterKey.trim() === "") {
    const errMsg =
      "[SECURITY ERROR] MASTER_KEY environment variable is missing. Encova cannot start without MASTER_KEY for credential encryption.";
    console.error(errMsg);
    throw new Error(errMsg);
  }
  return crypto.createHash("sha256").update(masterKey).digest();
}

/**
 * Checks if a string is encrypted using the enc:v1 format.
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  if (!value.startsWith(PREFIX)) return false;
  const parts = value.split(":");
  return parts.length === 5 && parts[0] === "enc" && parts[1] === "v1";
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random 12-byte IV.
 * Output format: enc:v1:<base64url(iv)>:<base64url(tag)>:<base64url(ciphertext)>
 */
export function encrypt(text: string): string {
  if (text === null || text === undefined || text === "") return text;
  if (isEncrypted(text)) return text; // Prevent double encryption

  const key = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit random IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const ivB64 = iv.toString("base64url");
  const tagB64 = tag.toString("base64url");
  const ciphertextB64 = encrypted.toString("base64url");

  return `${PREFIX}${ivB64}:${tagB64}:${ciphertextB64}`;
}

/**
 * Decrypts an encrypted string (enc:v1 format).
 * Returns the plaintext. If the string is not encrypted (e.g. legacy plain text),
 * it returns the input string as-is for backward compatibility.
 */
export function decrypt(cipherText: string): string {
  if (!cipherText || typeof cipherText !== "string") return cipherText;
  if (!isEncrypted(cipherText)) return cipherText; // Return plain text as-is (legacy fallback)

  try {
    const key = getMasterKey();
    const parts = cipherText.split(":");
    const iv = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const encryptedText = Buffer.from(parts[4], "base64url");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error: any) {
    console.error("[SECURITY ERROR] Decryption failed:", error.message);
    throw new Error("Failed to decrypt credentials. Check MASTER_KEY.");
  }
}

/**
 * Parses an RTSP URL into structured components.
 */
export interface ParsedRtspUrl {
  protocol: string;
  username: string;
  password: string;
  host: string;
  port: string;
  path: string;
}

export function parseRtspUrl(url: string): ParsedRtspUrl {
  const defaultRes: ParsedRtspUrl = {
    protocol: "rtsp",
    username: "",
    password: "",
    host: "",
    port: "554",
    path: "/",
  };

  if (!url || typeof url !== "string") return defaultRes;

  try {
    const protoMatch = url.match(/^([a-zA-Z0-9]+):\/\/(.*)$/);
    if (!protoMatch) return defaultRes;

    const protocol = protoMatch[1].toLowerCase();
    const mainBody = protoMatch[2];

    let userinfo = "";
    let hostAndPath = mainBody;

    // Separate userinfo from host/path
    const firstSlash = mainBody.indexOf("/");
    const searchArea = firstSlash === -1 ? mainBody : mainBody.slice(0, firstSlash);
    const lastAt = searchArea.lastIndexOf("@");

    if (lastAt !== -1) {
      userinfo = searchArea.slice(0, lastAt);
      hostAndPath = mainBody.slice(lastAt + 1);
    }

    let username = "";
    let password = "";
    if (userinfo) {
      const firstColon = userinfo.indexOf(":");
      if (firstColon !== -1) {
        username = userinfo.slice(0, firstColon);
        password = userinfo.slice(firstColon + 1);
      } else {
        username = userinfo;
      }
    }

    let host = "";
    let port = "554";
    let path = "/";

    const pathIndex = hostAndPath.indexOf("/");
    let hostAndPort = hostAndPath;
    if (pathIndex !== -1) {
      hostAndPort = hostAndPath.slice(0, pathIndex);
      path = hostAndPath.slice(pathIndex);
    }

    const colonIndex = hostAndPort.lastIndexOf(":");
    if (colonIndex !== -1 && !hostAndPort.endsWith("]")) {
      host = hostAndPort.slice(0, colonIndex);
      port = hostAndPort.slice(colonIndex + 1);
    } else {
      host = hostAndPort;
    }

    return { protocol, username, password, host, port, path };
  } catch {
    return defaultRes;
  }
}

/**
 * Reconstructs an RTSP URL from parsed components.
 */
export function buildRtspUrl(parsed: ParsedRtspUrl): string {
  const proto = parsed.protocol || "rtsp";
  let authStr = "";
  if (parsed.username) {
    if (parsed.password) {
      authStr = `${parsed.username}:${parsed.password}@`;
    } else {
      authStr = `${parsed.username}@`;
    }
  }

  const portStr = parsed.port && parsed.port !== "554" ? `:${parsed.port}` : ":554";
  let pathStr = parsed.path || "/";
  if (!pathStr.startsWith("/")) pathStr = "/" + pathStr;

  return `${proto}://${authStr}${parsed.host}${portStr}${pathStr}`;
}

/**
 * Encrypts ONLY the password inside an RTSP URL.
 * Input:  rtsp://admin:abcd1234@192.168.0.128:554/ch2/0
 * Output: rtsp://admin:enc:v1:xxxx@192.168.0.128:554/ch2/0
 */
export function encryptRtspUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (!url.toLowerCase().startsWith("rtsp://") && !url.toLowerCase().startsWith("rtmp://") && !url.toLowerCase().startsWith("http://") && !url.toLowerCase().startsWith("https://")) {
    return url;
  }

  const parsed = parseRtspUrl(url);
  if (!parsed.password) return url;
  if (isEncrypted(parsed.password)) return url;

  parsed.password = encrypt(parsed.password);
  return buildRtspUrl(parsed);
}

/**
 * Decrypts the password inside an RTSP URL to produce a plaintext URL for runtime (e.g. FFmpeg).
 */
export function decryptRtspUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  const parsed = parseRtspUrl(url);
  if (!parsed.password || !isEncrypted(parsed.password)) return url;

  parsed.password = decrypt(parsed.password);
  return buildRtspUrl(parsed);
}

/**
 * Masks the password inside an RTSP URL for safe logging.
 * Example: rtsp://admin:********@192.168.0.128:554/ch1/0
 */
export function maskRtspUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  const parsed = parseRtspUrl(url);
  if (!parsed.password) return url;

  parsed.password = "********";
  return buildRtspUrl(parsed);
}
