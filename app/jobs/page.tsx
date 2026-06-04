"use client";

import { useEffect, useState, useCallback } from "react";
import { useFilters } from "@/lib/FilterContext";
import {
  Search, Filter, ExternalLink, Download,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle, X, Briefcase, MapPin, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Job, PaginatedResponse } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export default function JobsPage() {
  const { country, state, city, sector } = useFilters();
  const [data, setData] = useState<PaginatedResponse<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search && { search }),
        ...(source && { source }),
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(sector && { sector }),
      });
      const res = await fetch(`/api/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, search, source, country, state, city, sector]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSource("");
    setPage(1);
  };

  const hasFilters = search || source;

  const exportCsv = () => {
    if (!data?.data) return;
    const headers = [
      "Job Title", "Company", "Location", "Source", "Salary", "Sector", "Job URL", "Scraped At"
    ];
    const rows = data.data.map((j) => {
      let salaryStr = "N/A";
      if (j.minSalary || j.maxSalary) {
        const cur = j.currency || "$";
        const min = j.minSalary ? `${cur}${formatNumber(j.minSalary)}` : "";
        const max = j.maxSalary ? `${cur}${formatNumber(j.maxSalary)}` : "";
        salaryStr = min && max ? `${min} - ${max}` : min || max;
      } else if (j.salary) {
        salaryStr = j.salary;
      }
      return [
        j.jobTitle || "",
        j.companyName || "",
        j.location || "",
        j.source || "",
        salaryStr,
        j.sector || "",
        j.jobUrl || "",
        j.createdAt || "",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSourceBadgeColor = (src: string) => {
    switch (src?.toLowerCase()) {
      case "indeed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "glassdoor":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "linkedin":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "upwork":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "reddit":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Jobs <span className="gradient-text">Explorer</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${formatNumber(data.total)} active job postings` : "Loading jobs..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
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
              <span className="ml-1 w-4 h-4 rounded-full bg-primary/30 text-xs flex items-center justify-center font-bold">
                !
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="job-search"
              type="text"
              placeholder="Search by job title, company name, or location..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3">
              <select
                value={source}
                onChange={(e) => { setSource(e.target.value); setPage(1); }}
                className="h-8 px-3 rounded-lg border border-border bg-secondary text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Sources</option>
                <option value="Indeed">Indeed</option>
                <option value="Glassdoor">Glassdoor</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Upwork">Upwork</option>
                <option value="Reddit">Reddit</option>
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
            <Button variant="outline" size="sm" onClick={fetchJobs} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-muted-foreground font-medium text-left">
                <th className="p-4 font-semibold">Job Title</th>
                <th className="p-4 font-semibold">Company</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Sector</th>
                <th className="p-4 font-semibold">Source</th>
                <th className="p-4 font-semibold">Salary Range</th>
                <th className="p-4 font-semibold">Scraped At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Fetching latest jobs...
                  </td>
                </tr>
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No jobs found matching your criteria. Try adjusting the global or local filters.
                  </td>
                </tr>
              ) : (
                data.data.map((job) => {
                  let salaryText = "Not specified";
                  if (job.minSalary || job.maxSalary) {
                    const cur = job.currency || "$";
                    const min = job.minSalary ? `${cur}${formatNumber(job.minSalary)}` : "";
                    const max = job.maxSalary ? `${cur}${formatNumber(job.maxSalary)}` : "";
                    salaryText = min && max ? `${min} - ${max}` : min || max;
                  } else if (job.salary) {
                    salaryText = job.salary;
                  }

                  return (
                    <tr key={job._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">{job.jobTitle || "Untitled Role"}</span>
                          {job.jobUrl && (
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-foreground font-medium">{job.companyName || "N/A"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>{job.location || "Remote"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {job.sector ? (
                          <Badge variant="outline" className="text-xs">
                            {job.sector}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={`text-xs border ${getSourceBadgeColor(job.source || "")}`}>
                          {job.source || "Unknown"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-foreground">
                          <DollarSign className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          <span>{salaryText}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        }) : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Showing page {data.page} of {data.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
