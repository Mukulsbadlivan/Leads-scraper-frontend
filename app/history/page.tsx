"use client";

import { useEffect, useState, useCallback } from "react";
import { useFilters } from "@/lib/FilterContext";
import {
  History, RefreshCw, ChevronLeft, ChevronRight, AlertCircle,
  Clock, CheckCircle2, XCircle, AlertTriangle, Eye, Calendar,
  Hash, RefreshCcw, Layers, Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrapeRun, PaginatedResponse } from "@/lib/types";
import { formatDate, formatDuration, formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_ICONS = {
  queued: Clock,
  running: Clock,
  completed: CheckCircle2,
  failed: XCircle,
  partial: AlertTriangle,
};

const STATUS_COLORS = {
  queued: "text-amber-400",
  running: "text-blue-400 animate-spin",
  completed: "text-emerald-400",
  failed: "text-red-400",
  partial: "text-amber-400",
};

// ─── Run Detail Modal ─────────────────────────────────────────────────────────

function RunDetailModal({
  run,
  onClose,
  onRetry,
}: {
  run: ScrapeRun;
  onClose: () => void;
  onRetry: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-xl p-6 max-w-lg w-full shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Run Details</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{run._id}</p>
          </div>
          <Badge variant={run.status as "running" | "completed" | "failed" | "partial"}>
            {run.status}
          </Badge>
        </div>

        {/* Queue Info */}
        {(run.queueJobId || run.retryCount !== undefined) && (
          <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Queue Information
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {run.queueJobId && (
                <div>
                  <p className="text-muted-foreground">Job ID</p>
                  <p className="font-mono text-foreground">{run.queueJobId}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Retry Attempts</p>
                <p className="font-medium text-foreground">{run.retryCount ?? 0} / 3</p>
              </div>
              {run.progress !== undefined && (
                <div>
                  <p className="text-muted-foreground">Final Progress</p>
                  <p className="font-medium text-foreground">{run.progress}%</p>
                </div>
              )}
              {run.currentStage && (
                <div>
                  <p className="text-muted-foreground">Last Stage</p>
                  <p className="font-medium text-foreground capitalize">{run.currentStage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Run Config */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Country", value: run.country || "—" },
            { label: "State", value: run.state || "—" },
            { label: "City", value: run.city || "—" },
            { label: "Sector", value: run.sector || (run.searchQueries || [])[0] || "—" },
            { label: "Sources", value: (run.sources || run.portals || []).join(", ") || "—" },
            { label: "Started", value: formatDate(run.startedAt) },
            { label: "Completed", value: formatDate(run.completedAt) },
            { label: "Duration", value: run.completedAt ? formatDuration(run.startedAt, run.completedAt) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-sm font-medium text-foreground truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Raw Leads", value: run.rawLeadsFound || 0 },
            { label: "Companies", value: run.uniqueCompanies || 0 },
            { label: "Enriched", value: run.enrichedLeads || 0 },
            { label: "Filtered", value: run.filteredLeads || 0 },
            { label: "🔥 Hot", value: run.hotLeads || 0 },
            { label: "🟡 Warm", value: run.warmLeads || 0 },
            { label: "🔵 Cold", value: run.coldLeads || 0 },
            { label: "Jobs Found", value: run.jobsFound || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card p-2.5 rounded-lg text-center">
              <p className="text-lg font-bold text-foreground">{formatNumber(value)}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {run.errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-xs text-red-400 font-medium mb-1 flex items-center gap-1.5">
              <XCircle className="w-3 h-3" />
              Error Details
            </p>
            <p className="text-xs text-muted-foreground">{run.errorMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {run.status === "failed" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => { onRetry(run._id); onClose(); }}
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Retry Run
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { country, state, city, sector } = useFilters();
  const [data, setData] = useState<PaginatedResponse<ScrapeRun> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedRun, setSelectedRun] = useState<ScrapeRun | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(sector && { sector }),
      });
      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, country, state, city, sector]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/scraper/retry/${id}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry");
      toast.success(`Retry queued! Job ID: ${data.queueJobId}`);
      await fetchHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to retry run");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Scrape <span className="gradient-text">History</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `${formatNumber(data.total)} total scrape runs` : "Loading history..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="danger" size="sm" onClick={fetchHistory} className="ml-auto">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {[
                  "Run ID", "Queue Job", "Country", "Sector", "Sources",
                  "Started", "Duration", "Status", "Retries", "Leads", "Companies", ""
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 shimmer rounded" style={{ width: `${40 + Math.random() * 60}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.length ? (
                data.data.map((run) => {
                  const StatusIcon = STATUS_ICONS[run.status] || Clock;
                  const iconColor = STATUS_COLORS[run.status] || "text-muted-foreground";
                  const sources = (run.sources || run.portals || []).join(", ") || "—";
                  const duration = run.completedAt
                    ? formatDuration(run.startedAt, run.completedAt)
                    : run.status === "running" || run.status === "queued"
                    ? formatDuration(run.startedAt)
                    : "—";

                  return (
                    <tr key={run._id} className="border-b border-border/30 table-row-hover group">
                      {/* Run ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {run._id.slice(-8)}
                        </span>
                      </td>

                      {/* Queue Job ID */}
                      <td className="px-4 py-3">
                        {run.queueJobId ? (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Hash className="w-2.5 h-2.5" />
                            <span className="font-mono">{run.queueJobId.slice(0, 8)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3 text-xs font-medium text-foreground truncate max-w-[120px]">
                        {[run.city, run.state, run.country].filter(Boolean).join(", ") || "—"}
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[100px]">
                        {run.sector || (run.searchQueries || [])[0] || "—"}
                      </td>

                      {/* Sources */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(run.sources || run.portals || []).slice(0, 3).map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px] capitalize">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      {/* Started */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(run.startedAt)}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">{duration}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                          <Badge variant={run.status as "running" | "completed" | "failed" | "partial"}>
                            {run.status}
                          </Badge>
                        </div>
                      </td>

                      {/* Retries */}
                      <td className="px-4 py-3">
                        {(run.retryCount ?? 0) > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-amber-400">
                            <RefreshCcw className="w-2.5 h-2.5" />
                            {run.retryCount}×
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {formatNumber(run.filteredLeads || run.leadsFound || 0)}
                      </td>

                      {/* Companies */}
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {formatNumber(run.uniqueCompanies || run.companiesFound || 0)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {run.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={retryingId === run._id}
                              onClick={() => handleRetry(run._id)}
                              className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            >
                              {retryingId === run._id ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <RefreshCcw className="w-3 h-3 mr-1" />
                              )}
                              Retry
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRun(run)}
                            className="h-7 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                        <History className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No scrape history yet</p>
                        <p className="text-xs text-muted-foreground/60">
                          Start a scrape run to see history here
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
              Page {page} of {data.totalPages} · {formatNumber(data.total)} runs total
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
              <span className="text-xs px-2">
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

      {/* Detail Modal */}
      {selectedRun && (
        <RunDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
