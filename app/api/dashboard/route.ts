import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const sector = searchParams.get("sector") || "";

    const db = await getDb();

    // Build filter
    const filter: any = {};
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;
    if (sector) filter.sector = sector;

    // ── Parallel collection counts ─────────────────────────────────────────
    const [
      totalCompanies,
      totalLeads,
      totalJobs,
      totalSignals,
      activeScrapeRuns,
      companiesMerged,
      leadsMerged,
    ] = await Promise.all([
      db.collection("companies").countDocuments(filter),
      db.collection("leads").countDocuments(filter),
      db.collection("jobs").countDocuments(filter),
      db.collection("signals").countDocuments(filter),
      db.collection("scrape_runs").countDocuments({ ...filter, status: "running" }),
      db.collection("duplicate_audit").countDocuments({ sourceCollection: "companies" }),
      db.collection("duplicate_audit").countDocuments({ sourceCollection: "leads" }),
    ]);

    // ── Leads by Region ────────────────────────────────────────────────────
    const leadsByRegionRaw = await db
      .collection("leads")
      .aggregate([
        { $match: { ...filter, country: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$country", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    // Also group by location if country is sparse
    const leadsByLocationRaw = await db
      .collection("leads")
      .aggregate([
        { $match: { ...filter, location: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$location", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    const leadsByRegion =
      leadsByRegionRaw.length > 0
        ? leadsByRegionRaw.map((d) => ({ name: d._id, value: d.value }))
        : leadsByLocationRaw.length > 0
        ? leadsByLocationRaw.map((d) => ({ name: d._id, value: d.value }))
        : [
            { name: "Hyderabad", value: 0 },
            { name: "Bangalore", value: 0 },
            { name: "Mumbai", value: 0 },
          ];

    // ── Leads by Sector ────────────────────────────────────────────────────
    const leadsBySectorRaw = await db
      .collection("leads")
      .aggregate([
        { $match: { ...filter, sector: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$sector", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    const leadsBySector =
      leadsBySectorRaw.length > 0
        ? leadsBySectorRaw.map((d) => ({ name: d._id, value: d.value }))
        : [
            { name: "SaaS", value: 0 },
            { name: "FinTech", value: 0 },
            { name: "HealthTech", value: 0 },
          ];

    // ── Jobs by Source ─────────────────────────────────────────────────────
    const jobsBySourceRaw = await db
      .collection("jobs")
      .aggregate([
        { $match: { ...filter, source: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$source", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ])
      .toArray();

    // Also check leads source
    const leadsBySourceRaw = await db
      .collection("leads")
      .aggregate([
        { $match: { ...filter, source: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$source", value: { $sum: 1 } } },
        { $sort: { value: -1 } },
      ])
      .toArray();

    const sourceMap = new Map<string, number>();
    for (const d of [...jobsBySourceRaw, ...leadsBySourceRaw]) {
      sourceMap.set(d._id, (sourceMap.get(d._id) || 0) + d.value);
    }
    const jobsBySource =
      sourceMap.size > 0
        ? Array.from(sourceMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }))
        : [
            { name: "Indeed", value: 0 },
            { name: "Glassdoor", value: 0 },
            { name: "Upwork", value: 0 },
            { name: "LinkedIn", value: 0 },
          ];

    // ── Daily Scrape Activity (last 14 days) ───────────────────────────────
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyRunsRaw = await db
      .collection("scrape_runs")
      .aggregate([
        { $match: { ...filter, startedAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$startedAt" },
            },
            runs: { $sum: 1 },
            leads: { $sum: { $ifNull: ["$filteredLeads", 0] } },
            companies: { $sum: { $ifNull: ["$uniqueCompanies", 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Fill in last 14 days (even if no data)
    const dailyActivity = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = dailyRunsRaw.find((r) => r._id === dateStr);
      dailyActivity.push({
        date: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        runs: found?.runs || 0,
        leads: found?.leads || 0,
        companies: found?.companies || 0,
      });
    }

    return NextResponse.json({
      totalCompanies,
      totalLeads,
      totalJobs,
      totalSignals,
      activeScrapeRuns,
      leadsByRegion,
      leadsBySector,
      jobsBySource,
      dailyScrapeActivity: dailyActivity,
      companiesMerged,
      leadsMerged,
      duplicatesRemoved: companiesMerged + leadsMerged,
    });
  } catch (error: unknown) {
    console.error("[GET /api/dashboard]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics", message },
      { status: 500 }
    );
  }
}
