import { NextResponse } from "next/server";
import { nasManager } from "@/lib/nas";

export async function GET() {
  try {
    const storage = await nasManager.getStorageInfo();
    return NextResponse.json(storage);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve storage status" },
      { status: 500 }
    );
  }
}
