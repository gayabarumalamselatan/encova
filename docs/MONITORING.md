# Encova Monitoring

This document describes the monitoring stack integrated into the Encova platform.

## Architecture
The monitoring stack consists of the following components running as Docker containers:
- **Prometheus** (Port 9090): Time-series database for scraping and storing metrics.
- **Grafana** (Port 3001): Visualization platform for exploring metrics via dashboards.
- **Node Exporter** (Port 9100): Exposes hardware and OS metrics (CPU, RAM, Disk, Network).
- **cAdvisor** (Port 8080): Exposes Docker container metrics.
- **Encova App** (Port 3000): Exposes custom metrics at `/api/metrics` about FFmpeg encoder status, NAS storage, cameras, and outputs.

## Docker Services
The monitoring services are defined in the `docker-compose.yml` file alongside the main `encova` service. They share the same Docker network for seamless communication.
Grafana data is persisted using a Docker volume (`grafana-data`).

## Ports
| Service | Port |
| --- | --- |
| Grafana | 3001 |
| Prometheus | 9090 |
| Node Exporter | 9100 |
| cAdvisor | 8080 |

## Metrics
The `/api/metrics` endpoint in Encova exposes the following custom metrics in Prometheus format:
- `encova_active_cameras`: Number of enabled cameras
- `encova_active_outputs`: Number of active outputs
- `encova_ffmpeg_processes`: Number of FFmpeg processes currently running
- `encova_encoder_status`: Status of the encoder (1 for running, 0 for stopped/error)
- `encova_storage_total_bytes`: Total capacity of the storage
- `encova_storage_used_bytes`: Used capacity of the storage
- `encova_storage_free_bytes`: Free capacity of the storage
- `encova_recording_files_total`: Total number of MP4 recording files

## Dashboard
A default Grafana dashboard named **Encova Monitoring** is provisioned automatically. It contains panels for:
- **System**: CPU, RAM, Disk, and Network usage via Node Exporter.
- **Docker**: Container CPU and RAM usage via cAdvisor.
- **Encova**: Active cameras, outputs, FFmpeg status.
- **NAS Storage**: Total, Used, Free capacity, and Recording files statistics.

To access Grafana, navigate to `http://<host-ip>:3001`. Default credentials are not required if anonymous access is enabled, otherwise use `admin`/`admin`.

## Troubleshooting
- **No metrics in Grafana**: Check if Prometheus is successfully scraping targets by navigating to `http://<host-ip>:9090/targets`.
- **Encova Metrics Down**: Ensure the Encova container is running and accessible at `http://encova-app:3000/api/metrics` from the Prometheus container.
- **NAS Metrics Unavailable**: Check if the storage path is correctly mounted in the Encova container and that NAS Manager has necessary permissions.
