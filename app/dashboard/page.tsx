"use client";

import { useEffect, useState, useCallback } from "react";
import { useFilters } from "@/lib/FilterContext";
import {
  Building2,
  Users,
  Briefcase,
  Zap,
  Activity,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardMetrics } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#84cc16",
];

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
  loading?: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (loading) return;
    let start = 0;
    const step = value / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(start));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [value, loading]);

  return (
    <Card className="metric-card animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-8 w-24 shimmer rounded" />
            <div className="h-4 w-32 shimmer rounded" />
          </div>
        ) : (
          <>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {formatNumber(displayed)}
            </p>
            <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ title }: { title: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">No data yet</p>
        <p className="text-xs text-muted-foreground/60">
          Start a scrape run to populate {title}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { country, state, city, sector } = useFilters();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(sector && { sector }),
      });
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const data = await res.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [country, state, city, sector]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const metricCards = [
    {
      title: "Total Companies",
      value: metrics?.totalCompanies || 0,
      icon: Building2,
      color: "bg-blue-500/10 text-blue-400",
      subtitle: "Discovered & enriched",
    },
    {
      title: "Total Leads",
      value: metrics?.totalLeads || 0,
      icon: Users,
      color: "bg-violet-500/10 text-violet-400",
      subtitle: "Qualified contacts",
    },
    {
      title: "Total Jobs",
      value: metrics?.totalJobs || 0,
      icon: Briefcase,
      color: "bg-cyan-500/10 text-cyan-400",
      subtitle: "Posted positions",
    },
    {
      title: "Signals Detected",
      value: metrics?.totalSignals || 0,
      icon: Zap,
      color: "bg-amber-500/10 text-amber-400",
      subtitle: "Buying intent signals",
    },
    {
      title: "Active Scrapes",
      value: metrics?.activeScrapeRuns || 0,
      icon: Activity,
      color: "bg-emerald-500/10 text-emerald-400",
      subtitle: "Currently running",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Intelligence{" "}
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time metrics from your ICP lead intelligence platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated{" "}
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {metrics?.activeScrapeRuns ? (
            <Badge variant="running" className="gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {metrics.activeScrapeRuns} Running
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Failed to load metrics</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={fetchMetrics}
              className="ml-auto"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metricCards.map((card) => (
          <MetricCard key={card.title} {...card} loading={loading} />
        ))}
      </div>

      {/* Data Quality & Deduplication Widget */}
      <Card className="border-emerald-500/10 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Data Quality & Deduplication Layer
              </CardTitle>
              <CardDescription>
                Real-time merge logs and background cleanup metrics
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-28 shimmer rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Companies Card */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Companies</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold text-foreground">
                    {formatNumber(metrics?.totalCompanies || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (from {formatNumber((metrics?.totalCompanies || 0) + (metrics?.companiesMerged || 0))} raw)
                  </span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${((metrics?.totalCompanies || 0) / Math.max(1, (metrics?.totalCompanies || 0) + (metrics?.companiesMerged || 0))) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  ✓ {formatNumber(metrics?.companiesMerged || 0)} duplicate companies merged
                </p>
              </div>

              {/* Leads Card */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leads</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold text-foreground">
                    {formatNumber(metrics?.totalLeads || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (from {formatNumber((metrics?.totalLeads || 0) + (metrics?.leadsMerged || 0))} raw)
                  </span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${((metrics?.totalLeads || 0) / Math.max(1, (metrics?.totalLeads || 0) + (metrics?.leadsMerged || 0))) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  ✓ {formatNumber(metrics?.leadsMerged || 0)} duplicate leads merged
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/50 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Duplicates Removed</p>
                  <p className="text-4xl font-extrabold text-emerald-400 mt-2 tabular-nums">
                    {formatNumber(metrics?.duplicatesRemoved || 0)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  Multi-pass data cleansing pipeline runs automatically after each scrape.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Region */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Region</CardTitle>
            <CardDescription>Geographic distribution of leads</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 shimmer rounded-lg" />
            ) : metrics?.leadsByRegion?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.leadsByRegion} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    cursor={{ fill: "hsl(217 30% 18%)" }}
                    formatter={(v) => [formatNumber(v as number), "Leads"]}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart title="regional data" />
            )}
          </CardContent>
        </Card>

        {/* Leads by Sector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Sector</CardTitle>
            <CardDescription>Industry vertical breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 shimmer rounded-lg" />
            ) : metrics?.leadsBySector?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={metrics.leadsBySector}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {metrics.leadsBySector.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatNumber(v as number), "Leads"]} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ color: "hsl(215 20% 70%)", fontSize: 11 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart title="sector data" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs by Source</CardTitle>
            <CardDescription>Jobs & leads per scraper portal</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 shimmer rounded-lg" />
            ) : metrics?.jobsBySource?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.jobsBySource}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [formatNumber(v as number), "Jobs"]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {metrics.jobsBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart title="source data" />
            )}
          </CardContent>
        </Card>

        {/* Daily Scrape Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Scrape Activity</CardTitle>
            <CardDescription>Scrape runs & leads over last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 shimmer rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={metrics?.dailyScrapeActivity || []}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorLeads)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="runs"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorRuns)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
