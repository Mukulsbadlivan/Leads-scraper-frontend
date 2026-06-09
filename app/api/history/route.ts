/**
 * /api/history/route.ts
 *
 * Proxy → Render backend /api/history
 * All query params are forwarded as-is.
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://leads-scraper-backend-x2zc.onrender.com";

export async function GET(req: NextRequest) {
  try {
    const qs = new URL(req.url).search;
    const res = await fetch(`${BACKEND}/api/scraper/history${qs}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[GET /api/history] Proxy error:", message);
    return NextResponse.json(
      { error: "Backend unreachable", message },
      { status: 503 }
    );
  }
}
