"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Lock } from "lucide-react";
import React from "react";
import { useLogin } from "./useLogin";

const Login = () => {
  const { username, setUsername, password, setPassword, error, loading, handleLogin } = useLogin();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Header & Description (Centered) */}
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center gap-4">
            <img src="/images/logo.png" alt="Logo" className="w-24 h-auto" />
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                ASISGO ENCOVA
              </h1>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                Sign in to your account
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Administrator Login
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Enter your credentials to access the secure dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input type="text" id="username" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input type="password" id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full mt-6" disabled={loading}>
                <Lock className="w-4 h-4 mr-2" />
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info singkat */}
        <p className="text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Asisgo Encova. Part of Asisgo
          Ecosystem.
        </p>
      </div>
    </div>
  );
};

export default Login;
