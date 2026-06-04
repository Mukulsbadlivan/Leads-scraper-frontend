import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { Filter, Document } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || "";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const sector = searchParams.get("sector") || "";

    const db = await getDb();

    // Build filter
    const filter: Filter<Document> = {};
    if (country) filter.country = { $regex: country, $options: "i" };
    if (state) filter.state = { $regex: state, $options: "i" };
    if (city) filter.city = { $regex: city, $options: "i" };
    if (sector) filter.sector = { $regex: sector, $options: "i" };

    // 1. Sector Volumes (Leads vs Jobs per Sector)
    const [leadsBySector, jobsBySector] = await Promise.all([
      db.collection("leads").aggregate([
        { $match: { ...filter, sector: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$sector", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),
      db.collection("jobs").aggregate([
        { $match: { ...filter, sector: { $exists: true, $nin: [null, ""] } } },
        { $group: { _id: "$sector", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
    ]);

    // 2. Lead Contact Info Discovery Rates
    const [totalLeads, leadsWithEmail, leadsWithPhone, leadsWithBoth] = await Promise.all([
      db.collection("leads").countDocuments(filter),
      db.collection("leads").countDocuments({ ...filter, email: { $exists: true, $ne: "" } }),
      db.collection("leads").countDocuments({ ...filter, phoneNumber: { $exists: true, $ne: "" } }),
      db.collection("leads").countDocuments({
        ...filter,
        email: { $exists: true, $ne: "" },
        phoneNumber: { $exists: true, $ne: "" }
      })
    ]);

    // 3. Jobs by Source
    const jobsBySource = await db.collection("jobs").aggregate([
      { $match: { ...filter, source: { $exists: true, $nin: [null, ""] } } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // 4. Aggregated list of top hiring companies
    const topHiringCompanies = await db.collection("jobs").aggregate([
      { $match: { ...filter, companyName: { $exists: true, $ne: "" } } },
      { $group: { _id: "$companyName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    return NextResponse.json({
      sectorVolumes: {
        leads: leadsBySector.map(s => ({ name: s._id, value: s.count })),
        jobs: jobsBySector.map(s => ({ name: s._id, value: s.count }))
      },
      discoveryRates: {
        total: totalLeads,
        withEmail: leadsWithEmail,
        withPhone: leadsWithPhone,
        withBoth: leadsWithBoth,
        emailRate: totalLeads > 0 ? Math.round((leadsWithEmail / totalLeads) * 100) : 0,
        phoneRate: totalLeads > 0 ? Math.round((leadsWithPhone / totalLeads) * 100) : 0,
        bothRate: totalLeads > 0 ? Math.round((leadsWithBoth / totalLeads) * 100) : 0
      },
      jobsBySource: jobsBySource.map(s => ({ name: s._id, value: s.count })),
      topHiringCompanies: topHiringCompanies.map(c => ({ name: c._id, count: c.count }))
    });
  } catch (error: unknown) {
    console.error("[GET /api/reports]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch report metrics", message },
      { status: 500 }
    );
  }
}
