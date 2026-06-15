import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settingsManager";
import { Account, AvailableModule } from "@/lib/types/auth";
import { generateId } from "@/lib/utils";

const defaultModules: AvailableModule[] = [
  { id: "cctv-encode", name: "CCTV Encode" },
  { id: "file-compress", name: "File Compress" },
  { id: "video-compress", name: "Video Compression" },
  { id: "api-docs", name: "API Documentation" }
];

export async function GET() {
  try {
    const settings = readSettings();
    
    // Initialize defaults if they don't exist
    let updated = false;
    if (!settings.availableModules || settings.availableModules.length === 0) {
      settings.availableModules = defaultModules;
      updated = true;
    }
    
    if (!settings.accounts || settings.accounts.length === 0) {
      const defaultAdmin: Account = {
        id: generateId(),
        username: "admin",
        password: "admin123", // In a real app this should be hashed
        role: "admin",
        enabled: true,
        modules: ["all"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      settings.accounts = [defaultAdmin];
      updated = true;
    }

    if (updated) {
      writeSettings(settings);
    }

    // Don't send passwords to frontend
    const safeAccounts = settings.accounts.map((acc: Account) => {
      const { password, ...rest } = acc;
      return rest;
    });

    return NextResponse.json({
      accounts: safeAccounts,
      availableModules: settings.availableModules
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settings = readSettings();
    
    const newAccount: Account = {
      id: generateId(),
      username: body.username,
      password: body.password,
      role: body.role,
      enabled: body.enabled ?? true,
      modules: body.modules || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!settings.accounts) settings.accounts = [];
    
    // Check if username exists
    if (settings.accounts.find((a: Account) => a.username === newAccount.username)) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    settings.accounts.push(newAccount);
    writeSettings(settings);

    const { password, ...safeAccount } = newAccount;
    return NextResponse.json(safeAccount);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const settings = readSettings();
    
    if (!settings.accounts) return NextResponse.json({ error: "No accounts found" }, { status: 404 });
    
    const index = settings.accounts.findIndex((a: Account) => a.id === body.id);
    if (index === -1) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const account = settings.accounts[index];
    
    // Update fields
    if (body.username) account.username = body.username;
    if (body.password) account.password = body.password; // Update if provided
    if (body.role) account.role = body.role;
    if (body.enabled !== undefined) account.enabled = body.enabled;
    if (body.modules) account.modules = body.modules;
    
    account.updatedAt = new Date().toISOString();

    settings.accounts[index] = account;
    writeSettings(settings);

    const { password, ...safeAccount } = account;
    return NextResponse.json(safeAccount);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 });
    
    const settings = readSettings();
    if (!settings.accounts) return NextResponse.json({ error: "No accounts found" }, { status: 404 });

    const initialLength = settings.accounts.length;
    settings.accounts = settings.accounts.filter((a: Account) => a.id !== id && a.id !== Number(id));

    if (settings.accounts.length === initialLength) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    writeSettings(settings);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
