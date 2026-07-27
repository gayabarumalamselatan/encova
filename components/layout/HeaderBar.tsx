"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Video,
  FileArchive,
  BookOpen,
  Users,
  LogOut,
  ArrowLeft,
  Home,
} from "lucide-react";
import { allFeatures } from "@/lib/module.list";

export interface ModuleInfo {
  id: string;
  title: string;
  description: string;
  tag: string;
  href: string;
}

export const MODULE_FEATURES: Record<string, ModuleInfo> = {
  dashboard: {
    id: "dashboard",
    title: "Dashboard Monitoring",
    description:
      "Pantau status kamera, engine encoding FFmpeg, GPU, dan MediaMTX secara real-time.",
    tag: "Pemantauan",
    href: "/dashboard",
  },
  "cctv-encode": {
    id: "cctv-encode",
    title: "CCTV Encode",
    description:
      "Konfigurasikan dan optimalkan parameter encoding CCTV untuk penyimpanan jangka panjang yang efisien.",
    tag: "Pemrosesan Video",
    href: "/cctv-encode",
  },
  "file-compress": {
    id: "file-compress",
    title: "File Compress",
    description:
      "Kompres berbagai format file secara efisien sambil tetap mempertahankan struktur dan fungsionalitas aslinya.",
    tag: "Optimasi File",
    href: "/file-compress",
  },
  "video-compress": {
    id: "video-compress",
    title: "Video Compression",
    description:
      "Kompres file video dengan standar industri dalam satu platform.",
    tag: "Optimasi Video",
    href: "/video-compress",
  },
  accounts: {
    id: "accounts",
    title: "Manajemen Akun",
    description: "Kelola pengguna sistem, peran, dan hak akses modul.",
    tag: "Administrasi",
    href: "/accounts",
  },
};

export default function HeaderBar() {
  const pathname = usePathname();
  const { session, logout } = useAuth();

  // Extract active module key from pathname (e.g. "/cctv-encode" -> "cctv-encode")
  const activeKey = pathname.replace(/^\//, "").split("/")[0] || "dashboard";
  const currentModule = MODULE_FEATURES[activeKey] || MODULE_FEATURES.dashboard;

  return (
    <header className="border-b border-border/60 bg-card/90 backdrop-blur-md sticky top-0 z-40 shadow-sm w-full">
      <div className="mx-auto px-4 py-3 flex items-center">
        {/* Left */}
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/images/logo.png"
              alt="Encova Logo"
              className="w-8 h-auto"
            />

            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-foreground">
                ASISGO ENCOVA
              </h1>

              {/* <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase font-semibold"
              >
                {currentModule.tag}
              </Badge> */}
            </div>
          </Link>
        </div>

        {/* Center */}
        <div className="hidden lg:flex flex-1 justify-center">
          <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border/40 text-xs">
            <Link href="/">
              <Button
                variant={pathname === "/" ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 text-xs gap-1.5 font-medium transition-all ${
                  pathname === "/"
                    ? "bg-primary hover:bg-primary/50 text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Home
              </Button>
            </Link>
            {allFeatures.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link href={link.href} key={link.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-7 text-xs gap-1.5 font-medium transition-all ${
                      isActive
                        ? "bg-primary hover:bg-primary/50 text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                    }`}
                  >
                    {link.icon}
                    {link.title}
                  </Button>
                </Link>
              );
            })}

            {/* {session?.user?.role === "admin" && (
              <Link href="/accounts">
                <Button
                  variant={pathname === "/accounts" ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 text-xs gap-1.5 font-medium transition-all ${
                    pathname === "/accounts"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Akun
                </Button>
              </Link>
            )} */}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-1 justify-end items-center gap-3">
          {session?.user && (
            <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
              {session.user.username} ({session.user.role})
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="h-8 text-xs gap-1.5 border-border/80 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </Button>
        </div>
      </div>
    </header>
  );
}
