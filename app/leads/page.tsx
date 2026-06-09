"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFilters } from "@/lib/FilterContext";
import {
  Search, Filter, ExternalLink, Mail, Phone, Download,
  ChevronLeft, ChevronRight, RefreshCw, Users, AlertCircle, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lead, PaginatedResponse } from "@/lib/types";
import { formatNumber, getScoreColor, REGIONS, SECTORS } from "@/lib/utils";

function getValidUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "—" ||
    trimmed.toLowerCase() === "n/a" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return null;
  }
  if (!trimmed.includes(".") && !trimmed.startsWith("http")) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getValidEmail(email: string | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (
    !trimmed ||
    trimmed === "—" ||
    trimmed.toLowerCase() === "n/a" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return null;
  }
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

function ScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <div className={`score-ring border-current ${color} text-xs`}>
      {score}
    </div>
  );
}

export default function LeadsPage() {
  const { country, state, city, sector } = useFilters();
  const [data, setData] = useState<PaginatedResponse<Lead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [icpTier, setIcpTier] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search && { search }),
        ...(icpTier && { icpTier }),
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(sector && { sector }),
      });
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, search, icpTier, country, state, city, sector]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setIcpTier("");
    setPage(1);
  };

  const hasFilters = search || icpTier;

  const exportCsv = () => {
    if (!data?.data) return;
    const headers = [
      "Company", "Contact Name", "Designation", "Email", "Phone",
      "LinkedIn", "ICP Score", "ICP Tier", "Sector", "Location", "Job Title", "Source",
    ];
    const rows = data.data.map((l) => [
      l.companyName || "",
      l.contactName || l.ceoName || "",
      l.designation || "",
      l.email || "",
      l.phoneNumber || "",
      l.linkedinUrl || "",
      l.icpScore || 0,
      l.icpTier || "",
      l.sector || "",
      l.location || l.country || "",
      l.jobTitle || "",
      l.source || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Lead <span className="gradient-text">Explorer</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${formatNumber(data.total)} enriched leads` : "Loading leads..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.data?.length}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filters
            {hasFilters && (
              <span className="ml-1 w-4 h-4 rounded-full bg-primary/30 text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="lead-search"
              type="text"
              placeholder="Search by company, name, email, job title..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Row */}
          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <select
                value={icpTier}
                onChange={(e) => { setIcpTier(e.target.value); setPage(1); }}
                className="h-8 px-3 rounded-lg border border-border bg-secondary text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All ICP Tiers</option>
                <option value="Hot">Hot 🔥</option>
                <option value="Warm">Warm 🟡</option>
                <option value="Cold">Cold 🔵</option>
              </select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear Local
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="danger" size="sm" onClick={fetchLeads} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Company", "Contact", "Designation", "LinkedIn / Email", "Phone", "ICP Score", "Tier", "Source"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 shimmer rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.length ? (
                data.data.map((lead) => (
                  <tr key={lead._id} className="border-b border-border/30 table-row-hover">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground max-w-[140px] truncate">
                        {lead.companyName || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {lead.sector || lead.industry || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80 max-w-[120px] truncate">
                      {lead.contactName || lead.ceoName || lead.ctoName || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate text-xs">
                      {lead.designation || lead.jobTitle || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const linkedin = getValidUrl(lead.linkedinUrl || lead.linkedinProfileUrl);
                          const email = getValidEmail(lead.email);

                          if (!linkedin && !email) {
                            return <span className="text-muted-foreground/40 text-xs">—</span>;
                          }

                          return (
                            <>
                              {linkedin && (
                                <a
                                  href={linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors focus-visible:underline focus-visible:outline-none"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  LinkedIn
                                </a>
                              )}
                              {email && (
                                <a
                                  href={`mailto:${email}`}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors focus-visible:underline focus-visible:outline-none"
                                >
                                  <Mail className="w-3 h-3 text-primary" />
                                  <span className="max-w-[120px] truncate" title={email}>{email}</span>
                                </a>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.phoneNumber ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {lead.phoneNumber}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreRing score={lead.icpScore || 0} />
                    </td>
                    <td className="px-4 py-3">
                      {lead.icpTier ? (
                        <Badge
                          variant={
                            lead.icpTier === "Hot"
                              ? "hot"
                              : lead.icpTier === "Warm"
                              ? "warm"
                              : "cold"
                          }
                        >
                          {lead.icpTier === "Hot" ? "🔥" : lead.icpTier === "Warm" ? "🟡" : "🔵"}{" "}
                          {lead.icpTier}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const sourceUrl = getValidUrl(lead.jobLink);
                        if (sourceUrl) {
                          return (
                            <a
                              href={sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block transition-transform hover:scale-105 active:scale-95"
                              title={`Open original job posting on ${lead.source || "source"}`}
                            >
                              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 flex items-center gap-1 hover:text-primary transition-colors">
                                {lead.source || "Link"}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Badge>
                            </a>
                          );
                        }
                        return (
                          <Badge variant="secondary" className="text-xs opacity-60">
                            {lead.source || "—"}
                          </Badge>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No leads found</p>
                        <p className="text-xs text-muted-foreground/60">
                          {hasFilters ? "Try adjusting your filters" : "Start a scrape run to populate leads"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} of{" "}
              {formatNumber(data.total)} leads
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-foreground px-2">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
