/**
 * /api/scraper/stop/route.ts
 *
 * Proxies to the Express API's stop endpoint.
 */
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://leads-scraper-backend-x2zc.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const response = await fetch(`${API_BASE}/api/scraper/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to stop scraper", message }, { status: 503 });
  }
}
