import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Filter, Document } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const country = searchParams.get("country") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const sector = searchParams.get("sector") || "";
    const source = searchParams.get("source") || "";
    const company = searchParams.get("company") || "";

    const db = await getDb();

    // Build filter
    const filter: Filter<Document> = {};

    if (search) {
      filter.$or = [
        { jobTitle: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    if (country) {
      filter.country = { $regex: country, $options: "i" };
    }

    if (state) {
      filter.state = { $regex: state, $options: "i" };
    }

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    if (sector) {
      filter.sector = { $regex: sector, $options: "i" };
    }

    if (source) {
      filter.source = { $regex: source, $options: "i" };
    }

    if (company) {
      filter.companyName = { $regex: company, $options: "i" };
    }

    const [data, total] = await Promise.all([
      db
        .collection("jobs")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("jobs").countDocuments(filter),
    ]);

    const serialized = data.map((doc) => ({
      ...doc,
      _id: doc._id.toString(),
      companyId: doc.companyId?.toString(),
      scrapeRunId: doc.scrapeRunId?.toString(),
    }));

    return NextResponse.json({
      data: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("[GET /api/jobs]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch jobs", message },
      { status: 500 }
    );
  }
}
