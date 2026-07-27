import {
  LayoutDashboard,
  Video,
  FileArchive,
  BookOpen,
  Users,
} from "lucide-react";

export const allFeatures = [
  {
    id: "dashboard",
    title: "Dashboard Monitoring",
    description:
      "Pantau status kamera, engine encoding FFmpeg, GPU, dan MediaMTX secara real-time.",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-8 w-8" />,
    tag: "Pemantauan",
  },
  {
    id: "cctv-encode",
    title: "CCTV Encode",
    description:
      "Konfigurasikan dan optimalkan parameter encoding CCTV untuk penyimpanan jangka panjang yang efisien.",
    href: "/cctv-encode",
    icon: <Video className="h-8 w-8 " />,
    tag: "Pemrosesan Video",
  },
  {
    id: "file-compress",
    title: "Kompresi File",
    description:
      "Kompres berbagai format file secara efisien sambil tetap mempertahankan struktur dan fungsionalitas aslinya.",
    href: "/file-compress",
    icon: <FileArchive className="h-8 w-8 " />,
    tag: "Optimasi File",
  },
  {
    id: "video-compress",
    title: "Kompresi Video",
    description:
      "Kompres file video dengan standar industri dalam satu platform.",
    href: "/video-compress",
    icon: <Video className="h-8 w-8 " />,
    tag: "Optimasi Video",
  },
  {
    id: "api-docs",
    title: "Dokumentasi API",
    description:
      "Jelajahi semua endpoint API kompresi dengan Try-it-out langsung yang didukung oleh Swagger UI.",
    href: "/api-docs",
    icon: <BookOpen className="h-8 w-8 " />,
    tag: "Dokumentasi API",
  },
  {
    id: "video-pooler",
    title: "Kompresi Video Batch",
    description:
      "Kompres file video sesuai standar industri dalam satu platform.",
    href: process.env.NEXT_PUBLIC_VIDEO_POOLER_BASE_URL || "#",
    icon: <Video className="h-8 w-8 " />,
    tag: "Optimasi Video",
  },
  {
    id: "accounts",
    title: "Manajemen Akun",
    description: "Kelola pengguna sistem, peran, dan hak akses modul.",
    href: "/accounts",
    icon: <Users className="h-8 w-8 " />,
    tag: "Administrasi",
    adminOnly: true,
  },
];
