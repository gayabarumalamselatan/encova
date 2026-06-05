import { NextResponse } from "next/server";
import { nasManager } from "@/lib/nas";

export async function POST(req: Request) {
  try {
    const config = await req.json();
    const result = await nasManager.testConnection(config);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
