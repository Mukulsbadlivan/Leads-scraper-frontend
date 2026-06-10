"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Rocket,
  Search,
  Filter,
  Users,
  Briefcase,
  Zap,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  X,
  Building2,
  Shield,
  Clock,
  BriefcaseIcon,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

// Types
interface StartupCompany {
  _id: string;
  companyName: string;
  website?: string;
  linkedinUrl?: string;
  foundingYear?: number;
  foundedDate?: string;
  isYCBacked?: boolean;
  ycBatch?: string;
  wellfoundUrl?: string;
  crunchbaseUrl?: string;
  industry?: string;
  sector?: string;
  companyStage?: string;
  companySize?: string;
  headcount?: number;
  hqLocation?: string;
  country?: string;
  jobLinks?: string[];
  hiringRoles?: string[];
  hiringSignals?: string[];
  growthSignals?: string[];
  techStack?: string[];
  dataQualityScore?: number;
  lastEnrichedAt?: string;
  executivesCount?: number;
  newsCount?: number;
}

interface StartupLead {
  _id: string;
  startupCompanyId: string;
  companyName?: string;
  website?: string;
  companyStage?: string;
  hiringRoles?: string[];
  jobLinks?: string[];
  startupScore?: number;
  growthTier?: "Hot" | "Warm" | "Cold";
  hiringSignalStrength?: number;
  growthSignalStrength?: number;
  discoverySource?: string;
  createdAt?: string;
}

interface StartupExecutive {
  _id: string;
  startupCompanyId: string;
  companyName?: string;
  name?: string;
  role: string;
  title?: string;
  linkedinUrl?: string;
}

interface StartupDashboardData {
  totalStartups: number;
  totalExecutives: number;
  totalStartupLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  byStage: { _id: string; count: number }[];
  bySector: { _id: string; count: number }[];
  ycBacked: number;
  recentlyEnriched: number;
  totalFundingEvents: number;
  totalHiringEvents: number;
  totalGrowthEvents: number;
}

interface JobProgress {
  jobId: string;
  status: "active" | "completed" | "failed" | "delayed" | "waiting";
  progress: number;
  currentStage: string;
  companiesDiscovered: number;
  companiesEnriched: number;
  executivesFound: number;
  startedAt: string | null;
}

export default function StartupIntelligencePage() {
  const [activeTab, setActiveTab] = useState<"startups" | "leads" | "executives">("startups");
  const [dashboard, setDashboard] = useState<StartupDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Discovery Trigger States
  const [showTriggerPanel, setShowTriggerPanel] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(["yc", "existing_companies", "rss"]);
  const [maxCompanies, setMaxCompanies] = useState<number>(100);
  const [enrichExecutives, setEnrichExecutives] = useState(true);
  const [enrichNews, setEnrichNews] = useState(true);
  
  // Job Running States
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [triggeringJob, setTriggeringJob] = useState(false);
  
  // Paginated Lists States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterYC, setFilterYC] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Data lists
  const [startups, setStartups] = useState<StartupCompany[]>([]);
  const [leads, setLeads] = useState<StartupLead[]>([]);
  const [executives, setExecutives] = useState<StartupExecutive[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Company Details Modal
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<(StartupCompany & { executives: StartupExecutive[], recentNews: any[] }) | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Dashboard Summary Metrics
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      setDashboardError(null);
      const res = await fetch("/api/startup/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const data = await res.json();
      setDashboard(data);
    } catch (err: any) {
      setDashboardError(err.message);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Poll Job Status
  const startPollingJob = useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    // Express returns job id in startup:uuid format, queue status wants just the bull jobId
    const queueJobId = jobId.startsWith("startup:") ? jobId.replace("startup:", "") : jobId;
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/startup/status/${jobId}`);
        if (!res.ok) return;
        const progressData: JobProgress = await res.json();
        setJobProgress(progressData);
        
        if (progressData.status === "completed" || progressData.status === "failed") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // Refresh dashboard & lists
          fetchDashboardMetrics();
          refreshActiveList();
          setTimeout(() => {
            setJobProgress(null);
            setActiveJobId(null);
          }, 5000); // clear progress card after 5s
        }
      } catch (err) {
        console.error("Error polling job status:", err);
      }
    };

    poll(); // run once immediately
    pollIntervalRef.current = setInterval(poll, 3000);
  }, [fetchDashboardMetrics]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Fetch paginated active tab data
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

      if (activeTab === "startups") {
        if (filterSector) params.append("sector", filterSector);
        if (filterStage) params.append("stage", filterStage);
        if (filterYC === "true") params.append("isYCBacked", "true");
        if (filterYC === "false") params.append("isYCBacked", "false");
        
        const res = await fetch(`/api/startup/companies?${params}`);
        if (!res.ok) throw new Error("Failed to fetch startup companies");
        const json = await res.json();
        setStartups(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      } else if (activeTab === "leads") {
        if (filterStage) params.append("growthTier", filterStage); // use stage filter input for growth tier in leads tab
        
        const res = await fetch(`/api/startup/leads?${params}`);
        if (!res.ok) throw new Error("Failed to fetch startup leads");
        const json = await res.json();
        setLeads(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      } else if (activeTab === "executives") {
        const res = await fetch(`/api/startup/executives?${params}`);
        if (!res.ok) throw new Error("Failed to fetch startup executives");
        const json = await res.json();
        setExecutives(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setTotalCount(json.total ?? 0);
      }
    } catch (err: any) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [activeTab, currentPage, searchQuery, filterSector, filterStage, filterYC]);

  // Refresh lists helper
  const refreshActiveList = () => {
    setCurrentPage(1);
    fetchTabData();
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Fetch Single Company Details
  useEffect(() => {
    if (!selectedCompanyId) {
      setCompanyDetails(null);
      return;
    }
    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const res = await fetch(`/api/startup/company/${selectedCompanyId}`);
        if (!res.ok) throw new Error("Failed to fetch company details");
        const json = await res.json();
        setCompanyDetails(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedCompanyId]);

  // Handle Trigger Discovery
  const handleTriggerDiscovery = async () => {
    setTriggeringJob(true);
    try {
      const res = await fetch("/api/startup/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: selectedSources,
          filters: {
            maxCompanies,
          },
          enrichOptions: {
            enrichExecutives,
            enrichNews,
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to trigger discovery job");
      
      setActiveJobId(data.queueJobId); // Use BullMQ jobId to monitor
      setShowTriggerPanel(false);
      startPollingJob(data.queueJobId);
    } catch (err: any) {
      alert(`Error starting job: ${err.message}`);
    } finally {
      setTriggeringJob(false);
    }
  };

  const handleSourceToggle = (src: string) => {
    setSelectedSources(prev => 
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Startup <span className="gradient-text">Intelligence Engine</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover and enrich hyper-growth startup companies, identify key executives, and scoring buying intent signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchDashboardMetrics(); fetchTabData(); }} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowTriggerPanel(true)} className="gap-1.5 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Discover Startups
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.totalStartups ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Discovered Startups</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.totalExecutives ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Enriched Founders/CEOs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.totalStartupLeads ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Actionable Signals</p>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingDashboard ? "..." : formatNumber(dashboard?.ycBacked ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">YC Backed Companies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discovery Active Job Status Overlay */}
      {jobProgress && (
        <Card className="border-primary/30 bg-primary/5 shadow-2xl relative overflow-hidden animate-pulse">
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-violet-600 transition-all duration-300" style={{ width: `${jobProgress.progress}%` }} />
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center animate-spin">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Discovery Job Running: {jobProgress.currentStage}</p>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Found: <strong className="text-foreground">{jobProgress.companiesDiscovered} companies</strong></span>
                  <span>Enriched: <strong className="text-foreground">{jobProgress.companiesEnriched}</strong></span>
                  <span>Execs: <strong className="text-foreground">{jobProgress.executivesFound}</strong></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-semibold uppercase">{jobProgress.status} ({jobProgress.progress}%)</span>
              <div className="w-32 bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${jobProgress.progress}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discovery Configuration Dialog */}
      {showTriggerPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                Configure Startup Discovery Pipeline
              </h2>
              <button onClick={() => setShowTriggerPanel(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discovery Sources</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "yc", name: "YC Directory (T2)" },
                    { id: "existing_companies", name: "Hiring Leads (T1)" },
                    { id: "rss", name: "Tech News RSS (T2)" },
                    { id: "wellfound", name: "Wellfound (AngelList) (T2)" },
                    { id: "crunchbase", name: "Crunchbase API (T3)" },
                  ].map(src => {
                    const selected = selectedSources.includes(src.id);
                    return (
                      <button
                        key={src.id}
                        onClick={() => handleSourceToggle(src.id)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Companies</label>
                  <input
                    type="number"
                    value={maxCompanies}
                    onChange={(e) => setMaxCompanies(parseInt(e.target.value) || 50)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center gap-2 h-9">
                    <input
                      type="checkbox"
                      id="exec-check"
                      checked={enrichExecutives}
                      onChange={(e) => setEnrichExecutives(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="exec-check" className="text-xs font-semibold text-foreground cursor-pointer">Enrich Exec LinkedIn</label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="news-check"
                  checked={enrichNews}
                  onChange={(e) => setEnrichNews(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="news-check" className="text-xs font-semibold text-foreground cursor-pointer">Collect Recent Company News</label>
              </div>

              <div className="text-[11px] text-muted-foreground/60 leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/30">
                🔒 <strong>Isolated Run:</strong> This pipeline uses dedicated queue mechanisms and operates entirely on isolated database collections. Existing leads, companies, and jobs are read-only and will not be overwritten.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3 bg-secondary/10">
              <Button variant="outline" size="sm" onClick={() => setShowTriggerPanel(false)}>Cancel</Button>
              <Button variant="default" size="sm" onClick={handleTriggerDiscovery} disabled={triggeringJob || selectedSources.length === 0} className="gap-1.5">
                {triggeringJob ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Trigger Discovery
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs & Table Area */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/50 pb-px gap-4">
          <div className="flex gap-2">
            {[
              { id: "startups", name: "Discovered Startups", count: dashboard?.totalStartups },
              { id: "leads", name: "Signals & Leads", count: dashboard?.totalStartupLeads },
              { id: "executives", name: "Executive Directory", count: dashboard?.totalExecutives },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); setSearchQuery(""); setFilterSector(""); setFilterStage(""); setFilterYC(""); }}
                className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all relative ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.name}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                    {tab.count}
                  </span>
                )}
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

            {activeTab === "startups" && (
              <>
                <select
                  value={filterSector}
                  onChange={(e) => { setFilterSector(e.target.value); setCurrentPage(1); }}
                  className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Sectors</option>
                  <option value="SaaS">SaaS</option>
                  <option value="AI">AI / ML</option>
                  <option value="FinTech">FinTech</option>
                  <option value="HealthTech">HealthTech</option>
                  <option value="Developer Tools">Developer Tools</option>
                </select>

                <select
                  value={filterStage}
                  onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
                  className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Stages</option>
                  <option value="Pre-Seed">Pre-Seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                </select>

                <select
                  value={filterYC}
                  onChange={(e) => { setFilterYC(e.target.value); setCurrentPage(1); }}
                  className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">YC Backed</option>
                  <option value="true">YC Backed 🔥</option>
                  <option value="false">Non YC</option>
                </select>
              </>
            )}

            {activeTab === "leads" && (
              <select
                value={filterStage}
                onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
                className="h-8 px-2 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Tiers</option>
                <option value="Hot">Hot 🔥</option>
                <option value="Warm">Warm 🟡</option>
                <option value="Cold">Cold 🔵</option>
              </select>
            )}
          </div>
        </div>

        {/* Tab Lists Implementation */}
        <Card className="overflow-hidden border-border/50">
          <div className="overflow-x-auto">
            {activeTab === "startups" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Company", "HQ Location", "Sector & Industry", "Stage", "YC Batch", "Job Links", "Quality Score", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : startups.length ? (
                    startups.map(co => (
                      <tr key={co._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{co.companyName}</div>
                          {co.website && (
                            <a href={co.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                              {co.website.replace(/^https?:\/\/(www\.)?/, "")}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{co.hqLocation || co.country || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="text-foreground/80">{co.sector || "—"}</div>
                          <div className="text-[10px] text-muted-foreground">{co.industry || ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] bg-secondary/40">{co.companyStage || "Undisclosed"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {co.isYCBacked ? (
                            <Badge variant="warning" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20 font-bold">
                              YC {co.ycBatch || "Active"}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {co.jobLinks?.length ? (
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {co.jobLinks.length} roles hiring
                            </Badge>
                          ) : (
                            <span className="opacity-40">None found</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          <span className={co.dataQualityScore && co.dataQualityScore >= 80 ? "text-emerald-400" : co.dataQualityScore && co.dataQualityScore >= 50 ? "text-amber-400" : "text-slate-400"}>
                            {co.dataQualityScore || "—"}/100
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px]" onClick={() => setSelectedCompanyId(co._id)}>
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">No startup companies found. Click "Discover Startups" to search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "leads" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Company Name", "Intent Score", "Hiring Score", "Growth Score", "Lead Tier", "Open Roles", "Discovery Source", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 shimmer rounded w-24" /></td>
                        ))}
                      </tr>
                    ))
                  ) : leads.length ? (
                    leads.map(lead => (
                      <tr key={lead._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3 font-semibold text-foreground">{lead.companyName}</td>
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center font-bold text-primary font-mono">
                            {lead.startupScore || 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{lead.hiringSignalStrength || 0}/100</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{lead.growthSignalStrength || 0}/100</td>
                        <td className="px-4 py-3">
                          <Badge variant={lead.growthTier === "Hot" ? "hot" : lead.growthTier === "Warm" ? "warm" : "cold"}>
                            {lead.growthTier === "Hot" ? "🔥 Hot" : lead.growthTier === "Warm" ? "🟡 Warm" : "🔵 Cold"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {lead.hiringRoles?.length ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {lead.hiringRoles.slice(0, 2).map((role, idx) => (
                                <Badge key={idx} variant="outline" className="text-[9px] truncate max-w-[100px]">{role}</Badge>
                              ))}
                              {lead.hiringRoles.length > 2 && <span className="text-[9px] text-muted-foreground">+{lead.hiringRoles.length - 2} more</span>}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 uppercase text-[10px] font-semibold text-muted-foreground">{lead.discoverySource || "Other"}</td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px]" onClick={() => setSelectedCompanyId(lead.startupCompanyId)}>
                            View Startup
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">No startup leads or signals discovered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "executives" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/20">
                    {["Executive Name", "Title / Role", "Associated Company", "LinkedIn Profile", "Actions"].map(h => (
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
                  ) : executives.length ? (
                    executives.map(exec => (
                      <tr key={exec._id} className="border-b border-border/20 table-row-hover text-xs">
                        <td className="px-4 py-3 font-semibold text-foreground">{exec.name || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] capitalize bg-secondary/30">{exec.role}</Badge>
                          <span className="ml-2 text-muted-foreground text-[11px]">{exec.title || ""}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{exec.companyName || "—"}</td>
                        <td className="px-4 py-3">
                          {exec.linkedinUrl ? (
                            <a href={exec.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
                              LinkedIn <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px]" onClick={() => setSelectedCompanyId(exec.startupCompanyId)}>
                            View Company
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">No executive records in directory.</td>
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

      {/* Startup Company Details Modal Dialog */}
      {selectedCompanyId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-scale-up">
            {loadingDetails ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading details and cross-references...</p>
              </div>
            ) : companyDetails ? (
              <>
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-border/50 flex justify-between items-start bg-secondary/30">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-foreground">{companyDetails.companyName}</h2>
                      {companyDetails.isYCBacked && (
                        <Badge variant="warning" className="bg-orange-500/10 text-orange-400 border-orange-500/20 font-bold">
                          YC {companyDetails.ycBatch}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {companyDetails.website && (
                        <a href={companyDetails.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary inline-flex items-center gap-1 font-medium">
                          {companyDetails.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span>•</span>
                      <span>HQ: {companyDetails.hqLocation || "Undisclosed"}</span>
                      {companyDetails.companySize && (
                        <>
                          <span>•</span>
                          <span>Size: {companyDetails.companySize} employees</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedCompanyId(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Sector, Tech, Stage Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-secondary/20 rounded-xl border border-border/30">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sector & stage</span>
                      <p className="text-sm font-semibold text-foreground mt-1">{companyDetails.sector || "Undisclosed"}</p>
                      <p className="text-xs text-muted-foreground">{companyDetails.companyStage || "Early Stage"}</p>
                    </div>
                    <div className="p-3 bg-secondary/20 rounded-xl border border-border/30">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Data Freshness</span>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {companyDetails.lastEnrichedAt ? new Date(companyDetails.lastEnrichedAt).toLocaleDateString() : "Never enriched"}
                      </p>
                      <p className="text-xs text-muted-foreground">Intell Score: {companyDetails.dataQualityScore || 0}/100</p>
                    </div>
                    <div className="p-3 bg-secondary/20 rounded-xl border border-border/30">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tech Stack</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {companyDetails.techStack?.length ? (
                          companyDetails.techStack.slice(0, 3).map((tech, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[9px]">{tech}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No tech stack signals</span>
                        )}
                        {companyDetails.techStack && companyDetails.techStack.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{companyDetails.techStack.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Executives */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Key Founders & Executives
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {companyDetails.executives?.length ? (
                        companyDetails.executives.map(exec => (
                          <div key={exec._id} className="p-3 bg-secondary/40 border border-border/20 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <p className="font-semibold text-foreground">{exec.name || "—"}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{exec.role} • {exec.title || ""}</p>
                            </div>
                            {exec.linkedinUrl && (
                              <a href={exec.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">No key executives enriched yet for this startup.</p>
                      )}
                    </div>
                  </div>

                  {/* Active Job Openings */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      Hiring Roles & Signals
                    </h3>
                    <div className="p-4 bg-secondary/20 rounded-xl border border-border/20 space-y-3">
                      {companyDetails.hiringRoles?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {companyDetails.hiringRoles.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-background/50">{role}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">No recent job openings listed in discovery records.</p>
                      )}

                      {companyDetails.jobLinks?.length ? (
                        <div className="space-y-1.5 border-t border-border/20 pt-2.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Discovered Job Links</p>
                          {companyDetails.jobLinks.slice(0, 3).map((link, idx) => (
                            <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 truncate max-w-full">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              {link}
                            </a>
                          ))}
                          {companyDetails.jobLinks.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium block">+{companyDetails.jobLinks.length - 3} additional job URLs</span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Recent News & Classification Events */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Recent News & Market Intelligence
                    </h3>
                    <div className="space-y-2.5">
                      {companyDetails.recentNews?.length ? (
                        companyDetails.recentNews.map((news, idx) => (
                          <div key={idx} className="p-3 bg-secondary/30 border border-border/20 rounded-xl flex items-start justify-between gap-4 text-xs">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-background/40">{news.eventType}</Badge>
                              <a href={news.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary block leading-tight">
                                {news.title}
                              </a>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                <span>{news.source || "Web"}</span>
                                <span>•</span>
                                <span>{news.publishedAt ? new Date(news.publishedAt).toLocaleDateString() : ""}</span>
                              </div>
                            </div>
                            <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground p-1">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">No press releases or news records associated with this startup yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-border/50 flex justify-end bg-secondary/10">
                  <Button variant="outline" size="sm" onClick={() => setSelectedCompanyId(null)}>Close</Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
