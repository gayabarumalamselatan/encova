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

# ── Verify system dependencies ────────────────────────────────────────────────
echo "[check] LibreOffice  : $(libreoffice --version 2>/dev/null || echo 'NOT FOUND')"
echo "[check] Ghostscript  : $(gs --version 2>/dev/null || echo 'NOT FOUND')"
echo "========== Hardware Detection =========="
echo ""
echo "FFmpeg:"
if command -v ffmpeg > /dev/null 2>&1; then
    echo "✓ Installed"
else
    echo "✗ Not Installed"
fi

echo ""
echo "Hardware Accelerators:"
hwaccels=$(ffmpeg -hide_banner -hwaccels 2>/dev/null || echo "")
if echo "$hwaccels" | grep -q "qsv"; then echo "✓ qsv"; else echo "✗ qsv"; fi
if echo "$hwaccels" | grep -q "vaapi"; then echo "✓ vaapi"; else echo "✗ vaapi"; fi
if echo "$hwaccels" | grep -q "cuda"; then echo "✓ cuda"; else echo "✗ cuda"; fi

echo ""
echo "Encoders:"
encoders=$(ffmpeg -hide_banner -encoders 2>/dev/null || echo "")
if echo "$encoders" | grep -q "h264_qsv"; then echo "✓ h264_qsv"; else echo "✗ h264_qsv"; fi
if echo "$encoders" | grep -q "hevc_qsv"; then echo "✓ hevc_qsv"; else echo "✗ hevc_qsv"; fi
if echo "$encoders" | grep -q "h264_nvenc"; then echo "✓ h264_nvenc"; else echo "✗ h264_nvenc"; fi

echo ""
echo "GPU Devices:"
ls -1 /dev/dri/card* 2>/dev/null || true
ls -1 /dev/dri/renderD128 2>/dev/null || true

echo ""
echo "VAAPI Driver:"
echo "${LIBVA_DRIVER_NAME:-Unknown}"

echo ""
echo "Result:"
if command -v vainfo > /dev/null 2>&1; then
    if vainfo --display drm > /dev/null 2>&1; then
        echo "Intel Quick Sync READY"
    else
        echo "Intel Quick Sync NOT READY"
    fi
else
    echo "vainfo not installed"
fi
echo "========================================"

echo "[check] FFmpeg       : $(ffmpeg -version 2>/dev/null | head -1 || echo 'NOT FOUND')"
echo "[check] MediaMTX     : $(mediamtx --version 2>/dev/null || echo 'NOT FOUND')"

# ── Start MediaMTX (RTSP/RTMP/HLS server) in the background ──────────────────
if command -v mediamtx > /dev/null 2>&1; then
    echo "[start] Starting MediaMTX with /app/mediamtx.yml..."
    mediamtx /app/mediamtx.yml &
    MEDIAMTX_PID=$!
    echo "[start] MediaMTX started with PID ${MEDIAMTX_PID}"
else
    echo "[warn] MediaMTX not found, skipping..."
fi

# ── Start Next.js application (foreground) ────────────────────────────────────
echo "[start] Starting Next.js on port ${PORT:-3000}..."
exec node server.js
