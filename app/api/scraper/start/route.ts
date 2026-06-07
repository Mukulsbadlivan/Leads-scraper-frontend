/**
 * /api/scraper/start/route.ts
 *
 * Proxies the scrape start request to the standalone Express API server.
 * The Express API creates the MongoDB record and enqueues the BullMQ job.
 * This route returns immediately with { scrapeRunId, queueJobId }.
 *
 * NO scraping logic executes here.
 */
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://leads-scraper-backend-x2zc.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${API_BASE}/api/scraper/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Return scrapeRunId as runId for backward-compat with the existing frontend
    return NextResponse.json({
      ...data,
      runId: data.scrapeRunId, // legacy field name
    });
  } catch (error: unknown) {
    console.error("[POST /api/scraper/start] Proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Graceful fallback: if the backend API is down, inform the user clearly
    return NextResponse.json(
      {
        error: "Backend API server is not reachable",
        message: `Could not connect to ${API_BASE}. Is the Express server running? (npm run api)`,
        detail: message,
      },
      { status: 503 }
    );
  }
}
