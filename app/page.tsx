"use client";

import Link from "next/link";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Video,
  FileArchive,
  ArrowRight,
  BookOpen,
  Users,
  LogOut,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const EncovaLandingPage = () => {
  const { hasPermission, session, logout } = useAuth();

  const allFeatures = [
    {
      id: "cctv-encode",
      title: "CCTV Encode",
      description:
        "Configure and optimize CCTV encoding parameters for efficient long-term storage.",
      href: "/cctv-encode",
      icon: <Video className="h-8 w-8 text-primary" />,
      tag: "Video Processing",
    },
    {
      id: "file-compress",
      title: "File Compress",
      description:
        "Compress various file formats efficiently while maintaining original structure and usability.",
      href: "/file-compress",
      icon: <FileArchive className="h-8 w-8 text-primary" />,
      tag: "Optimization",
    },
    {
      id: "video-compress",
      title: "Video Compression",
      description:
        "Compress video files with industry standards in one platform.",
      href: "/video-compress",
      icon: <Video className="h-8 w-8 text-primary" />,
      tag: "Optimization",
    },
    {
      id: "api-docs",
      title: "API Documentation",
      description:
        "Explore all compression API endpoints with live Try-it-out powered by Swagger UI.",
      href: "/api-docs",
      icon: <BookOpen className="h-8 w-8 text-primary" />,
      tag: "Developer",
    },
    {
      id: "accounts",
      title: "Account Management",
      description: "Manage system users, roles, and module permissions.",
      href: "/accounts",
      icon: <Users className="h-8 w-8 text-primary" />,
      tag: "Administration",
      adminOnly: true,
    },
  ];

  const visibleFeatures = allFeatures.filter((feature) => {
    if (feature.adminOnly && session?.user.role !== "admin") return false;
    return hasPermission(feature.id) || feature.id === "accounts";
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">
        {/* Logout Button */}
        <div className="absolute top-6 right-6">
          <Button
            variant="outline"
            onClick={logout}
            className="flex items-center gap-2 hover:cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        <div className="max-w-4xl w-full space-y-12">
          {/* Header & Description (Centered) */}
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-4">
              <img src="images/logo.png" alt="Logo" className="w-24 h-auto" />
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  ASISGO ENCOVA
                </h1>
                <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                  Integrated media management solution. Configure video encoding
                  parameters and compress files with industry standards in one
                  platform.
                </p>
                {session?.user && (
                  <p className="text-sm font-medium text-blue-600">
                    Welcome back, {session.user.username}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {visibleFeatures.map((feature, index) => (
              <Link href={feature.href} key={index} className="group">
                <Card className="h-full border-border/50 bg-white/80 backdrop-blur-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-primary/50">
                  <CardHeader>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 group-hover:text-white transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                        {feature.tag}
                      </span>
                      <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-base text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                    <div className="flex items-center text-sm font-semibold text-primary">
                      Open Feature{" "}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Footer info singkat */}
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Asisgo Encova. Part of Asisgo
            Ecosystem.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default EncovaLandingPage;
