#!/bin/sh
set -e

# =============================================================================
# docker-entrypoint.sh
# =============================================================================

echo "============================================"
echo "  Configuring Hardware Permissions..."
echo "============================================"

if [ -e /dev/dri/renderD128 ]; then
    RENDER_GID=$(stat -c '%g' /dev/dri/renderD128)
    echo "[info] Found /dev/dri/renderD128 with GID $RENDER_GID"
    
    if ! getent group "$RENDER_GID" >/dev/null 2>&1; then
        echo "[info] Group with GID $RENDER_GID does not exist, creating 'render_dynamic'..."
        groupadd -g "$RENDER_GID" render_dynamic
    else
        EXISTING_GROUP=$(getent group "$RENDER_GID" | cut -d: -f1)
        echo "[info] Group with GID $RENDER_GID already exists as '$EXISTING_GROUP'."
    fi

    echo "[info] Adding nextjs to group with GID $RENDER_GID..."
    usermod -aG "$RENDER_GID" nextjs
else
    echo "[warn] /dev/dri/renderD128 not found. Hardware acceleration may not work."
fi

echo "============================================"
echo "  Encova Production Container Starting..."
echo "  Running as user: $(gosu nextjs id -un) (UID: $(gosu nextjs id -u))"
echo "  Groups: $(gosu nextjs id -Gn)"
echo "============================================"

# ── Verify system dependencies ────────────────────────────────────────────────
echo "[check] LibreOffice  : $(gosu nextjs libreoffice --version 2>/dev/null || echo 'NOT FOUND')"
echo "[check] Ghostscript  : $(gosu nextjs gs --version 2>/dev/null || echo 'NOT FOUND')"
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
hwaccels=$(gosu nextjs ffmpeg -hide_banner -hwaccels 2>/dev/null || echo "")
if echo "$hwaccels" | grep -q "qsv"; then echo "✓ qsv"; else echo "✗ qsv"; fi
if echo "$hwaccels" | grep -q "vaapi"; then echo "✓ vaapi"; else echo "✗ vaapi"; fi
if echo "$hwaccels" | grep -q "cuda"; then echo "✓ cuda"; else echo "✗ cuda"; fi

echo ""
echo "Encoders:"
encoders=$(gosu nextjs ffmpeg -hide_banner -encoders 2>/dev/null || echo "")
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
    if gosu nextjs vainfo --display drm > /dev/null 2>&1; then
        echo "Intel Quick Sync READY"
        echo "Running QSV encode test..."
        if gosu nextjs ffmpeg -v error -init_hw_device vaapi=va:/dev/dri/renderD128 -f lavfi -i testsrc=size=1280x720:rate=30 -vf format=nv12,hwupload -c:v h264_qsv -f null - -t 1; then
            echo "QSV encode test PASSED"
        else
            echo "QSV encode test FAILED"
        fi
    else
        echo "Intel Quick Sync NOT READY"
    fi
else
    echo "vainfo not installed"
fi
echo "========================================"

echo "[check] FFmpeg       : $(gosu nextjs ffmpeg -version 2>/dev/null | head -1 || echo 'NOT FOUND')"
echo "[check] MediaMTX     : $(gosu nextjs mediamtx --version 2>/dev/null || echo 'NOT FOUND')"

# Ensure application files are owned by nextjs in case mounted volumes changed permissions
chown -R nextjs:nodejs /app/public/downloads /app/settings 2>/dev/null || true

# ── Start MediaMTX (RTSP/RTMP/HLS server) in the background ──────────────────
if command -v mediamtx > /dev/null 2>&1; then
    echo "[start] Starting MediaMTX with /app/mediamtx.yml..."
    gosu nextjs mediamtx /app/mediamtx.yml &
    MEDIAMTX_PID=$!
    echo "[start] MediaMTX started with PID ${MEDIAMTX_PID}"
else
    echo "[warn] MediaMTX not found, skipping..."
fi

# ── Start Next.js application (foreground) ────────────────────────────────────
echo "[start] Starting Next.js on port ${PORT:-3000}..."
exec gosu nextjs node server.js
