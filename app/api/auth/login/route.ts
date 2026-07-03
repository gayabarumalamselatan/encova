import { NextResponse } from "next/server";
import { readSettings } from "@/lib/settingsManager";
import { Account } from "@/lib/types/auth";
import { signToken, setToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const settings = readSettings();
    let userToAuth: Omit<Account, "password"> | null = null;

    if (!settings.accounts || settings.accounts.length === 0) {
      // Setup a default admin if there's literally no accounts
      if (username === "admin" && password === "admin123") {
        userToAuth = {
          id: "default-admin",
          username: "admin",
          role: "admin",
          enabled: true,
          modules: ["all"],
        };
      }
    } else {
      const account = settings.accounts.find(
        (a: Account) => a.username === username,
      );

      if (!account || account.password !== password) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 },
        );
      }

      if (!account.enabled) {
        return NextResponse.json(
          { error: "Account is disabled. Please contact administrator." },
          { status: 403 },
        );
      }

      const { password: _, ...safeAccount } = account;
      userToAuth = safeAccount;
    }

    if (!userToAuth) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const token = await signToken({ user: userToAuth });
    await setToken(token);

    return NextResponse.json({
      user: userToAuth,
      token, // Kept for backwards compatibility if frontend still relies on it, though we use cookies now
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
