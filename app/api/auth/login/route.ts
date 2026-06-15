import { NextResponse } from "next/server";
import { readSettings } from "@/lib/settingsManager";
import { Account } from "@/lib/types/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const settings = readSettings();
    
    if (!settings.accounts || settings.accounts.length === 0) {
      // Setup a default admin if there's literally no accounts, though GET /api/accounts should do it
      if (username === "admin" && password === "admin123") {
         return NextResponse.json({
           user: {
             id: "default-admin",
             username: "admin",
             role: "admin",
             enabled: true,
             modules: ["all"]
           },
           token: "admin-session-token"
         });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const account = settings.accounts.find((a: Account) => a.username === username);

    if (!account) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (account.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!account.enabled) {
      return NextResponse.json({ error: "Account is disabled. Please contact administrator." }, { status: 403 });
    }

    // Create a safe account object to return
    const { password: _, ...safeAccount } = account;

    return NextResponse.json({
      user: safeAccount,
      token: `${account.id}-${Date.now()}` // Simple session token for demo purposes
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
