import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Filter, Document } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status") || "";
    const country = searchParams.get("country") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const sector = searchParams.get("sector") || "";

    const db = await getDb();
    const filter: Filter<Document> = {};
    if (status) filter.status = status;
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (sector) filter.sector = sector;

    const [data, total] = await Promise.all([
      db
        .collection("scrape_runs")
        .find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("scrape_runs").countDocuments(filter),
    ]);

    const serialized = data.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
    }));

    return NextResponse.json({
      data: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("[GET /api/history]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch history", message }, { status: 500 });
  }
}
