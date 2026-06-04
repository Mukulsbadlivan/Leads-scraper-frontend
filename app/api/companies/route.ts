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
    const sector = searchParams.get("sector") || "";
    const country = searchParams.get("country") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";

    const db = await getDb();

    const filter: Filter<Document> = {};
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { website: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
      ];
    }
    if (sector) filter.sector = { $regex: sector, $options: "i" };
    if (country) filter.country = { $regex: country, $options: "i" };
    if (state) filter.state = { $regex: state, $options: "i" };
    if (city) filter.city = { $regex: city, $options: "i" };

    const [companies, total] = await Promise.all([
      db.collection("companies").find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("companies").countDocuments(filter),
    ]);

    // Aggregate job and lead counts for each company
    const companyIds = companies.map((c) => c._id);

    const [jobCounts, leadCounts] = await Promise.all([
      db.collection("jobs").aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $group: { _id: "$companyId", count: { $sum: 1 } } },
      ]).toArray(),
      db.collection("leads").aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $group: { _id: "$companyId", count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    const jobCountMap = new Map(jobCounts.map((j) => [j._id.toString(), j.count]));
    const leadCountMap = new Map(leadCounts.map((l) => [l._id.toString(), l.count]));

    const enriched = companies.map((c) => {
      const id = c._id.toString();
      const jobsCount = jobCountMap.get(id) || 0;
      const leadsCount = leadCountMap.get(id) || 0;
      // Simple hiring score based on employee count and jobs
      const empNum = parseInt(String(c.numberOfEmployees || "0").replace(/[^0-9]/g, "")) || 0;
      const hiringScore = Math.min(100, Math.round((jobsCount / Math.max(empNum / 100, 1)) * 10 + leadsCount * 2));
      return {
        ...c,
        _id: id,
        jobsCount,
        leadsCount,
        hiringScore,
      };
    });

    return NextResponse.json({
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("[GET /api/companies]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch companies", message }, { status: 500 });
  }
}
