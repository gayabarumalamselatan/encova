import { NextResponse } from "next/server";
import swaggerSpec from "@/lib/swagger";

export const dynamic = "force-dynamic";

/** GET /api/docs/spec — returns the raw OpenAPI JSON */
export async function GET() {
  return NextResponse.json(swaggerSpec);
}
