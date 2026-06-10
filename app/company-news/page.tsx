"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Newspaper,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  UserPlus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  X,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Link,
  FileText,
  BadgeCent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

// Types
interface NewsArticle {
  _id: string;
  startupCompanyId?: string;
  existingCompanyId?: string;
  companyName?: string;
  title: string;
  url: string;
  publishedAt?: string;
  source?: string;
  summary?: string;
  eventType: "funding" | "hiring" | "growth" | "technology" | "acquisition" | "other";
  eventSubtype?: string;
  classificationConfidence?: number;
}

interface FundingEvent {
  _id: string;
  companyName: string;
  round: string;
  amount?: number;
  amountRaw?: string;
  currency?: string;
  investors?: string[];
  announcedAt?: string;
  pressReleaseUrl?: string;
}

interface HiringEvent {
  _id: string;
  companyName: string;
  eventType: string;
  personName?: string;
  personLinkedin?: string;
  newRole?: string;
  announcedAt?: string;
}

interface GrowthEvent {
  _id: string;
  companyName: string;
  eventType: string;
  detail?: string;
  announcedAt?: string;
  metrics?: {
    headcountAdded?: number;
    newMarkets?: string[];
  };
}

interface NewsDashboardData {
  totalStartups: number;
  totalStartupLeads: number;
  totalFundingEvents: number;
  totalHiringEvents: number;
  totalGrowthEvents: number;
  // Express backend returns dashboard details
  ycBacked?: number;
}

interface JobProgress {
  jobId: string;
  status: "active" | "completed" | "failed" | "delayed" | "waiting";
  currentStage: string;
  count: number;
  startedAt: string | null;
}

export default function CompanyNewsPage() {
  const [activeTab, setActiveTab] = useState<"articles" | "funding" | "hiring" | "growth">("articles");
  const [dashboard, setDashboard] = useState<NewsDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Trigger Panel States
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [sources, setSources] = useState<string[]>(["rss", "google_news"]);
  const [lookbackDays, setLookbackDays] = useState<number>(14);
  const [triggeringJob, setTriggeringJob] = useState(false);
  
  // Job progress polling
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Data Lists
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [funding, setFunding] = useState<FundingEvent[]>([]);
  const [hiring, setHiring] = useState<HiringEvent[]>([]);
  const [growth, setGrowth] = useState<GrowthEvent[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      setDashboardError(null);
      // Retrieve stats from the startup dashboard endpoint which counts news and funding events
      const res = await fetch("/api/startup/dashboard");
      if (!res.ok) throw new Error("Failed to load news dashboard metrics");
      const data = await res.json();
      setDashboard(data);
    } catch (err: any) {
      setDashboardError(err.message);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Poll Job Progress status
  const startPollingJob = useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/company-news/status/${jobId}`);
        if (!res.ok) return;
        const progressData: JobProgress = await res.json();
        setJobProgress(progressData);

        if (progressData.status === "completed" || progressData.status === "failed") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          fetchDashboardStats();
          refreshActiveList();
          setTimeout(() => {
            setJobProgress(null);
            setActiveJobId(null);
          }, 5000);
        }
      } catch (err) {
        console.error(err);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 3000);
  }, [fetchDashboardStats]);

  // Fetch list data based on active tab
  const fetchTabData = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const limit = "25";
      const params = new URLSearchParams({
        page: String(currentPage),
        limit,
      });

      if (searchQuery) params.append("search", searchQuery);

      if (activeTab === "articles") {
        if (filterType) params.append("eventType", filterType);
        const res = await fetch(`/api/company-news/articles?${params}`);
        if (!res.ok) throw new Error("Failed to fetch articles");
        const json = await res.json();
        setArticles(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      } else if (activeTab === "funding") {
        if (filterType) params.append("round", filterType); // round filter in funding tab
        const res = await fetch(`/api/company-news/funding?${params}`);
        if (!res.ok) throw new Error("Failed to fetch funding events");
        const json = await res.json();
        setFunding(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      } else if (activeTab === "hiring") {
        if (filterType) params.append("eventType", filterType);
        const res = await fetch(`/api/company-news/hiring?${params}`);
        if (!res.ok) throw new Error("Failed to fetch hiring events");
        const json = await res.json();
        setHiring(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      } else if (activeTab === "growth") {
        if (filterType) params.append("eventType", filterType);
        const res = await fetch(`/api/company-news/growth?${params}`);
        if (!res.ok) throw new Error("Failed to fetch growth events");
        const json = await res.json();
        setGrowth(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      }
    } catch (err: any) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [activeTab, currentPage, searchQuery, filterType]);

  const refreshActiveList = () => {
    setCurrentPage(1);
    fetchTabData();
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Clean up polling
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Handle Trigger News Collection
  const handleTriggerCollect = async () => {
    setTriggeringJob(true);
    try {
      const res = await fetch("/api/company-news/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources,
          lookbackDays,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to trigger news collection");

      setActiveJobId(data.queueJobId);
      setShowCollectPanel(false);
      startPollingJob(data.queueJobId);
    } catch (err: any) {
      alert(`Error starting collection: ${err.message}`);
    } finally {
      setTriggeringJob(false);
    }
  };

  const handleSourceToggle = (src: string) => {
    setSources(prev => 
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case "funding": return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
      case "hiring": return "border-blue-500/20 bg-blue-500/10 text-blue-400";
      case "growth": return "border-purple-500/20 bg-purple-500/10 text-purple-400";
      case "technology": return "border-cyan-500/20 bg-cyan-500/10 text-cyan-400";
      case "acquisition": return "border-red-500/20 bg-red-500/10 text-red-400";
      default: return "border-secondary bg-secondary/50 text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Company News <span className="gradient-text">Intelligence Feed</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate and classify recent press releases, funding rounds, executive hires, product launches, and growth events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchDashboardStats(); fetchTabData(); }} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowCollectPanel(true)} className="gap-1.5 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Collect News
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber((dashboard?.totalFundingEvents ?? 0) + (dashboard?.totalHiringEvents ?? 0) + (dashboard?.totalGrowthEvents ?? 0))}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Classified Articles</p>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.totalFundingEvents ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Funding Events</p>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.totalHiringEvents ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Executive Hires</p>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.totalGrowthEvents ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Expansion & launches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collect Active Job Status Overlay */}
      {jobProgress && (
        <Card className="border-primary/30 bg-primary/5 shadow-2xl relative overflow-hidden animate-pulse">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center animate-spin">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">News Collection Job Running: {jobProgress.currentStage}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Processed: <strong className="text-foreground">{jobProgress.count} articles</strong></span>
                  <span>Started At: <strong className="text-foreground">{jobProgress.startedAt ? new Date(jobProgress.startedAt).toLocaleTimeString() : "Pending"}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-semibold uppercase">{jobProgress.status}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trigger Configuration Dialog */}
      {showCollectPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-primary" />
                Configure News Collection Job
              </h2>
              <button onClick={() => setShowCollectPanel(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">News Sources</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "rss", name: "RSS Feeds" },
                    { id: "google_news", name: "Google News" },
                    { id: "newsapi", name: "NewsAPI (Paid)" },
                  ].map(src => {
                    const selected = sources.includes(src.id);
                    return (
                      <button
                        key={src.id}
                        onClick={() => handleSourceToggle(src.id)}
                        className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                          selected 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {src.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lookback window (Days)</label>
                <select
                  value={lookbackDays}
                  onChange={(e) => setLookbackDays(parseInt(e.target.value) || 14)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>

              <div className="text-[11px] text-muted-foreground/60 leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/30">
                🚀 <strong>Auto-Classification:</strong> Discovered news articles are automatically run through a heuristic natural language parser to categorize them into funding rounds, executive changes, product launches, or acquisitions.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3 bg-secondary/10">
              <Button variant="outline" size="sm" onClick={() => setShowCollectPanel(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleTriggerCollect} disabled={triggeringJob || sources.length === 0} className="gap-1.5">
                {triggeringJob ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Trigger Collection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Data Tables */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/50 pb-px gap-4">
          <div className="flex gap-2">
            {[
              { id: "articles", name: "News Articles" },
              { id: "funding", name: "Funding Rounds" },
              { id: "hiring", name: "Leadership Changes" },
              { id: "growth", name: "Product & Growth" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); setSearchQuery(""); setFilterType(""); }}
                className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all relative ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Quick Search & Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="h-8 pl-8 pr-3 w-48 rounded-lg border border-border bg-secondary/50 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-secondary"
              />
            </div>

            {activeTab === "articles" && (
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Events</option>
                <option value="funding">Funding Rounds</option>
                <option value="hiring">Executive Hiring</option>
                <option value="growth">Growth Signals</option>
                <option value="acquisition">Acquisitions</option>
                <option value="technology">Technology Changes</option>
              </select>
            )}

            {activeTab === "funding" && (
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Rounds</option>
                <option value="seed">Seed</option>
                <option value="series_a">Series A</option>
                <option value="series_b">Series B</option>
                <option value="series_c">Series C</option>
                <option value="pre_seed">Pre-Seed</option>
                <option value="acquisition">Acquisitions</option>
              </select>
            )}

            {activeTab === "hiring" && (
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All leadership</option>
                <option value="new_ceo">New CEO</option>
                <option value="new_cto">New CTO</option>
                <option value="new_cfo">New CFO</option>
                <option value="new_coo">New COO</option>
                <option value="new_exec">Other Executives</option>
              </select>
            )}

            {activeTab === "growth" && (
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All growth types</option>
                <option value="product_launch">Product Launches</option>
                <option value="geo_expansion">Geo Expansions</option>
                <option value="team_expansion">Team Expansion</option>
                <option value="new_office">Office Openings</option>
                <option value="partnership">Partnerships</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab Data Implementation */}
        <Card className="overflow-hidden border-border/50">
          <div className="overflow-x-auto">
            {activeTab === "articles" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Published At", "Event Category", "Article Headline", "Source", "Classified Company", "Confidence", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : articles.length ? (
                    articles.map(art => (
                      <tr key={art._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3 text-muted-foreground w-28">
                          {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getEventBadgeColor(art.eventType)}`}>
                            {art.eventType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground max-w-sm truncate" title={art.title}>
                          {art.title}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{art.source || "Feed"}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{art.companyName || "—"}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-muted-foreground">
                          {art.classificationConfidence ? `${Math.round(art.classificationConfidence)}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <a href={art.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] gap-1">
                              Read <ExternalLink className="w-2.5 h-2.5" />
                            </Button>
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">No articles collected yet. Click "Collect News" to scrape feed.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "funding" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Announced At", "Company Name", "Round", "Amount", "Key Investors", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : funding.length ? (
                    funding.map(fund => (
                      <tr key={fund._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3 text-muted-foreground w-28">
                          {fund.announcedAt ? new Date(fund.announcedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{fund.companyName}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-secondary/30">
                            {fund.round.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-400 font-mono">
                          {fund.amountRaw || (fund.amount ? `$${formatNumber(fund.amount)}` : "Undisclosed")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                          {fund.investors?.length ? fund.investors.join(", ") : "Undisclosed"}
                        </td>
                        <td className="px-4 py-3">
                          {fund.pressReleaseUrl ? (
                            <a href={fund.pressReleaseUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] gap-1">
                                Press Release <ExternalLink className="w-2.5 h-2.5" />
                              </Button>
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">No structured funding events classified yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "hiring" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Announced At", "Company Name", "Leadership Change", "Executive Name", "Profile"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : hiring.length ? (
                    hiring.map(hire => (
                      <tr key={hire._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3 text-muted-foreground w-28">
                          {hire.announcedAt ? new Date(hire.announcedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{hire.companyName}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {hire.eventType.replace("_", " ")}
                          </Badge>
                          {hire.newRole && <span className="ml-2 text-muted-foreground">({hire.newRole})</span>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{hire.personName || "—"}</td>
                        <td className="px-4 py-3">
                          {hire.personLinkedin ? (
                            <a href={hire.personLinkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
                              LinkedIn <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">No executive hire events classified yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "growth" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Announced At", "Company Name", "Growth Signal Type", "Details & Metrics"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : growth.length ? (
                    growth.map(gro => (
                      <tr key={gro._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3 text-muted-foreground w-28">
                          {gro.announcedAt ? new Date(gro.announcedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{gro.companyName}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-purple-500/10 text-purple-400 border-purple-500/20">
                            {gro.eventType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-md">
                          <div>{gro.detail || "Growth signal detected"}</div>
                          {gro.metrics?.headcountAdded && (
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              📈 Added {gro.metrics.headcountAdded} headcount
                            </div>
                          )}
                          {gro.metrics?.newMarkets?.length && (
                            <div className="text-[10px] text-cyan-400 font-semibold mt-0.5">
                              🌍 Expanded to: {gro.metrics.newMarkets.join(", ")}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">No product or growth signals classified yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-secondary/5">
              <p className="text-xs text-muted-foreground">Showing {totalCount > 0 ? (currentPage - 1) * 25 + 1 : 0}–{Math.min(currentPage * 25, totalCount)} of {formatNumber(totalCount)} items</p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loadingList}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-foreground px-2 font-medium">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loadingList}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
