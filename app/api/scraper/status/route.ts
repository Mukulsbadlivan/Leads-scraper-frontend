/**
 * /api/scraper/status/route.ts
 *
 * Proxies to the Express API's status endpoint.
 * Returns real-time progress from MongoDB (updated by the BullMQ worker).
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://leads-scraper-backend-x2zc.onrender.com";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/api/scraper/status`, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Map backend response fields to what the existing scraper page expects
    return NextResponse.json({
      ...data,
      // Legacy compat fields the existing page uses
      progressPercent: data.progress ?? 0,
      region: data.region ?? [data.city, data.state, data.country].filter(Boolean).join(", "),
    });
  } catch {
    // Backend API unreachable — return idle state so frontend doesn't break
    return NextResponse.json({ isRunning: false });
  }
}
