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
    const company = searchParams.get("company") || "";
    const jobTitle = searchParams.get("jobTitle") || "";
    const minIcp = searchParams.get("minIcp") ? parseInt(searchParams.get("minIcp")!) : undefined;
    const maxIcp = searchParams.get("maxIcp") ? parseInt(searchParams.get("maxIcp")!) : undefined;
    const icpTier = searchParams.get("icpTier") || "";

    const db = await getDb();

    // Build filter
    const filter: Filter<Document> = {};

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
        { jobTitle: { $regex: search, $options: "i" } },
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

    if (company) {
      filter.companyName = { $regex: company, $options: "i" };
    }

    if (jobTitle) {
      filter.jobTitle = { $regex: jobTitle, $options: "i" };
    }

    if (icpTier) {
      filter.icpTier = icpTier;
    }

    if (minIcp !== undefined || maxIcp !== undefined) {
      filter.icpScore = {};
      if (minIcp !== undefined) (filter.icpScore as Record<string, number>).$gte = minIcp;
      if (maxIcp !== undefined) (filter.icpScore as Record<string, number>).$lte = maxIcp;
    }

    const [data, total] = await Promise.all([
      db
        .collection("leads")
        .find(filter)
        .sort({ icpScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("leads").countDocuments(filter),
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
    console.error("[GET /api/leads]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch leads", message },
      { status: 500 }
    );
  }
}
