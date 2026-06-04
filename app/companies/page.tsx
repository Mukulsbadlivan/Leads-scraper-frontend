"use client";

import { useEffect, useState, useCallback } from "react";
import { useFilters } from "@/lib/FilterContext";
import Link from "next/link";
import {
  Search, ExternalLink, ChevronLeft, ChevronRight,
  RefreshCw, Building2, AlertCircle, ChevronRight as Arrow,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Company, PaginatedResponse } from "@/lib/types";
import { formatNumber, getScoreColor } from "@/lib/utils";

export default function CompaniesPage() {
  const { country, state, city, sector } = useFilters();
  const [data, setData] = useState<PaginatedResponse<Company> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search && { search }),
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(sector && { sector }),
      });
      const res = await fetch(`/api/companies?${params}`);
      if (!res.ok) throw new Error("Failed to fetch companies");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, search, country, state, city, sector]);

  useEffect(() => {
    const t = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(t);
  }, [fetchCompanies]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Company <span className="gradient-text">Explorer</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${formatNumber(data.total)} companies discovered` : "Loading..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchCompanies} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="company-search"
              type="text"
              placeholder="Search companies by name, website, industry..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="danger" size="sm" onClick={fetchCompanies} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Company", "Industry / Sector", "Size", "Website", "Jobs", "Leads", "Hiring Score", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 shimmer rounded" style={{ width: `${50 + Math.random() * 50}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.length ? (
                data.data.map((company) => (
                  <tr key={company._id} className="border-b border-border/30 table-row-hover group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-border/50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground max-w-[160px] truncate">
                            {company.companyName || "Unknown"}
                          </p>
                          {company.country && (
                            <p className="text-xs text-muted-foreground">{company.country}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {company.sector && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            {company.sector}
                          </Badge>
                        )}
                        {company.industry && (
                          <span className="text-xs text-muted-foreground">{company.industry}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {company.numberOfEmployees || company.employeeSize || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {company.website ? (
                        <a
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {company.website.replace(/^https?:\/\//, "").slice(0, 20)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {company.jobsCount || 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {company.leadsCount || 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[60px]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                            style={{ width: `${company.hiringScore || 0}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getScoreColor(company.hiringScore || 0)}`}>
                          {company.hiringScore || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${company._id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Details
                        <Arrow className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No companies found</p>
                        <p className="text-xs text-muted-foreground/60">
                          {search ? "Try a different search query" : "Start a scrape run to discover companies"}
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
              Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} of {formatNumber(data.total)}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs px-2">{page} / {data.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages || loading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
