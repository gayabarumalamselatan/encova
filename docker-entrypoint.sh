#!/bin/sh
# =============================================================================
# docker-entrypoint.sh
# Starts all required background processes, then runs the Next.js server
# in the foreground so Docker can manage the container lifecycle correctly.
# =============================================================================

set -e

echo "============================================"
echo "  Encova Production Container Starting..."
echo "============================================"

# ── settings.json bootstrap ───────────────────────────────────────────────────
# If a real settings.json is NOT volume-mounted (e.g. first run or local test),
# fall back to the safe default template baked into the image.
# When docker-compose mounts ./settings.json:/app/settings.json the real file
# will take precedence and this block is skipped.
if [ ! -f /app/settings.json ]; then
    echo "[config] No settings.json found — copying default template..."
    cp /app/settings.default.json /app/settings.json
    echo "[config] settings.json created from default template."
    echo "[config] WARNING: Using placeholder camera config. Mount your real"
    echo "[config]          settings.json via docker-compose volume to use live CCTV."
else
    echo "[config] settings.json found (volume-mounted or pre-existing)."
fi

# ── Verify system dependencies ────────────────────────────────────────────────
echo "[check] LibreOffice  : $(libreoffice --version 2>/dev/null || echo 'NOT FOUND')"
echo "[check] Ghostscript  : $(gs --version 2>/dev/null || echo 'NOT FOUND')"
echo "[check] FFmpeg       : $(ffmpeg -version 2>/dev/null | head -1 || echo 'NOT FOUND')"
echo "[check] MediaMTX     : $(mediamtx --version 2>/dev/null || echo 'NOT FOUND')"

# ── Start MediaMTX (RTSP/RTMP/HLS server) in the background ──────────────────
if command -v mediamtx > /dev/null 2>&1; then
    echo "[start] Starting MediaMTX..."
    mediamtx &
    MEDIAMTX_PID=$!
    echo "[start] MediaMTX started with PID ${MEDIAMTX_PID}"
else
    echo "[warn] MediaMTX not found, skipping..."
fi

# ── Start Next.js application (foreground) ────────────────────────────────────
echo "[start] Starting Next.js on port ${PORT:-3000}..."
exec node server.js
