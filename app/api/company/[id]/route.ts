import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
    }

    const db = await getDb();
    const objectId = new ObjectId(id);

    const [company, jobs, leads, signals, scrapeHistory] = await Promise.all([
      db.collection("companies").findOne({ _id: objectId }),
      db.collection("jobs").find({ companyId: objectId }).sort({ createdAt: -1 }).limit(20).toArray(),
      db.collection("leads").find({ companyId: objectId }).sort({ icpScore: -1 }).limit(20).toArray(),
      db.collection("signals").find({ companyId: objectId }).sort({ detectedAt: -1 }).limit(20).toArray(),
      db.collection("scrape_runs").find({}).sort({ startedAt: -1 }).limit(10).toArray(),
    ]);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const serialize = (doc: Record<string, unknown>) => ({
      ...doc,
      _id: doc._id?.toString(),
      companyId: (doc.companyId as ObjectId)?.toString(),
      scrapeRunId: (doc.scrapeRunId as ObjectId)?.toString(),
      leadId: (doc.leadId as ObjectId)?.toString(),
    });

    return NextResponse.json({
      ...serialize(company as Record<string, unknown>),
      jobs: jobs.map(serialize),
      leads: leads.map(serialize),
      signals: signals.map(serialize),
      scrapeHistory: scrapeHistory.map((r) => ({
        ...r,
        _id: r._id.toString(),
      })),
    });
  } catch (error: unknown) {
    console.error("[GET /api/company/:id]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to fetch company", message }, { status: 500 });
  }
}
