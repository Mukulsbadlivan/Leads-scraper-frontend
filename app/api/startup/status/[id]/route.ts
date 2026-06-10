/**
 * /api/startup/status/[id]/route.ts
 * Proxy → Express Backend /api/startup/status/:jobId
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://leads-scraper-backend-x2zc.onrender.com";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${BACKEND}/api/startup/status/${id}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[GET /api/startup/status/:id] Proxy error:", message);
    return NextResponse.json(
      { error: "Backend unreachable", message },
      { status: 503 }
    );
  }
}
