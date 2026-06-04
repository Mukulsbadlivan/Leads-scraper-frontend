"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Play, Square, MapPin, Tag, Globe, Loader2, CheckCircle2,
  XCircle, AlertCircle, Clock, Building2, Briefcase, Users, Activity,
  RefreshCw, Hash, Cpu, AlertTriangle, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SECTORS, SOURCES, formatDate, formatDuration } from "@/lib/utils";
import { LOCATION_CONFIG } from "@/shared/config/LocationConfig";
import { ScraperStatus } from "@/lib/types";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, status }: { value: number; status?: string }) {
  const color =
    status === "failed"
      ? "from-red-500 to-rose-500"
      : status === "completed"
      ? "from-emerald-500 to-teal-500"
      : status === "queued"
      ? "from-amber-500 to-yellow-500"
      : "from-blue-500 to-violet-500";

  return (
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (status === "queued")
    return (
      <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-400 border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Queued
      </Badge>
    );
  if (status === "running")
    return (
      <Badge variant="running" className="gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Running
      </Badge>
    );
  if (status === "completed")
    return (
      <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge className="gap-1.5 bg-red-500/10 text-red-400 border-red-500/20">
        <XCircle className="w-3 h-3" />
        Failed
      </Badge>
    );
  return <Badge variant="secondary">Idle</Badge>;
}

function StageStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          done
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : active
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            : "bg-secondary text-muted-foreground/40 border border-border"
        }`}
      >
        {done ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : active ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
      </div>
      <span
        className={`text-xs font-medium transition-colors ${
          done
            ? "text-emerald-400"
            : active
            ? "text-blue-400"
            : "text-muted-foreground/50"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

const STAGES = [
  "Queued in BullMQ",
  "Initializing Browser",
  "Connecting to Portals",
  "Scraping Job Portals",
  "Enriching & Scoring",
  "Saving Results",
];

const STAGE_MAP: Record<string, number> = {
  queued: 0,
  "initializing browser": 1,
  "connecting to portals": 2,
  "scraping job portals": 3,
  "enriching & scoring": 3,
  "enriching": 3,
  "saving results": 4,
  completed: 5,
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ScraperPage() {
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [sector, setSector] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(["indeed", "glassdoor"]);
  const [status, setStatus] = useState<ScraperStatus>({ isRunning: false });
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [customCountry, setCustomCountry] = useState("");
  const [customState, setCustomState] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [keywordsStr, setKeywordsStr] = useState("");
  const [maxPages, setMaxPages] = useState(3);
  const [jobType, setJobType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scraper/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    pollStatus();
    pollRef.current = setInterval(pollStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollStatus]);

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const handleStart = async () => {
    const finalCountry = country === "custom" ? customCountry : country;
    const finalState = country === "custom" ? customState : state;
    const finalCity = country === "custom" ? customCity : city;

    if (!finalCountry || !sector) {
      toast.error("Please select a target country and sector");
      return;
    }
    if (!selectedSources.length) {
      toast.error("Please select at least one source");
      return;
    }

    const keywords = keywordsStr ? keywordsStr.split(",").map((k) => k.trim()).filter(Boolean) : [];

    setIsStarting(true);
    try {
      const res = await fetch("/api/scraper/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: finalCountry,
          state: finalState,
          city: finalCity,
          sector,
          remoteOnly,
          jobType,
          selectedSources,
          maxPages,
          keywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      toast.success(
        `Scrape job queued! Run ID: ${(data.runId || data.scrapeRunId || "").slice(-6)}`
      );
      await pollStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start scraper");
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const res = await fetch("/api/scraper/stop", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to stop");
      toast.success("Scrape run stopped");
      await pollStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to stop scraper");
    } finally {
      setIsStopping(false);
    }
  };

  const isActive = status.isRunning || status.status === "queued";
  const progress = status.progress ?? status.progressPercent ?? 0;

  const currentStageIdx = STAGE_MAP[
    (status.currentStage || status.status || "").toLowerCase()
  ] ?? -1;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Scraper <span className="gradient-text">Control Center</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure and launch multi-source job portal scraping · Powered by BullMQ queue
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                Target Configuration
              </CardTitle>
              <CardDescription>
                Select region, sector, and job portals to scrape
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Country select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  Target Country
                </label>
                <select
                  id="country-select"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState("");
                    setCity("");
                    setCustomCountry("");
                    setCustomState("");
                    setCustomCity("");
                  }}
                  disabled={isActive}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a country...</option>
                  <option value="Remote">Remote 🌐</option>
                  {Object.keys(LOCATION_CONFIG).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="custom">Custom Location... ✏️</option>
                </select>
              </div>

              {/* Custom inputs */}
              {country === "custom" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      Custom Country Name
                    </label>
                    <input
                      type="text"
                      id="custom-country-input"
                      value={customCountry}
                      onChange={(e) => setCustomCountry(e.target.value)}
                      disabled={isActive}
                      placeholder="e.g. France, Japan, Spain"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Custom State / Province (Optional)
                    </label>
                    <input
                      type="text"
                      id="custom-state-input"
                      value={customState}
                      onChange={(e) => setCustomState(e.target.value)}
                      disabled={isActive}
                      placeholder="e.g. Île-de-France, Tokyo Prefecture"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Custom City Name (Optional)
                    </label>
                    <input
                      type="text"
                      id="custom-city-input"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      disabled={isActive}
                      placeholder="e.g. Paris, Tokyo, Madrid"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* State select */}
              {country && country !== "Remote" && country !== "custom" &&
                Object.keys(LOCATION_CONFIG[country]?.states || {}).length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    Target State / Province
                  </label>
                  <select
                    id="state-select"
                    value={state}
                    onChange={(e) => { setState(e.target.value); setCity(""); }}
                    disabled={isActive}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a state...</option>
                    {Object.keys(LOCATION_CONFIG[country].states || {}).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* City select */}
              {country && country !== "Remote" && country !== "custom" && (
                ((state && LOCATION_CONFIG[country]?.states?.[state]?.length) ||
                  LOCATION_CONFIG[country]?.cities?.length) ? (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Target City
                    </label>
                    <select
                      id="city-select"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isActive}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a city...</option>
                      {(state && LOCATION_CONFIG[country]?.states?.[state]
                        ? LOCATION_CONFIG[country].states[state]
                        : LOCATION_CONFIG[country]?.cities || []
                      ).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Target City (Optional)
                    </label>
                    <input
                      type="text"
                      id="city-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isActive}
                      placeholder="Enter city (e.g. Toronto, Munich...)"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )
              )}

              {/* Sector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  Target Sector
                </label>
                <select
                  id="sector-select"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  disabled={isActive}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a sector...</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  Target Keywords / Job Titles (Optional)
                </label>
                <input
                  type="text"
                  id="keywords-input"
                  value={keywordsStr}
                  onChange={(e) => setKeywordsStr(e.target.value)}
                  disabled={isActive}
                  placeholder="e.g. Software Engineer, React Developer (comma-separated)"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Max Pages */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Max Pages to Scrape
                  </label>
                  <select
                    id="max-pages-select"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 3)}
                    disabled={isActive}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="1">1 Page</option>
                    <option value="2">2 Pages</option>
                    <option value="3">3 Pages (Default)</option>
                    <option value="5">5 Pages</option>
                    <option value="10">10 Pages</option>
                  </select>
                </div>

                {/* Job Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    Job Type Filter
                  </label>
                  <select
                    id="job-type-select"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    disabled={isActive}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Any Job Type</option>
                    <option value="fulltime">Full-time</option>
                    <option value="parttime">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>
              </div>

              {/* Remote Only */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="remote-only-checkbox"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  disabled={isActive}
                  className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary"
                />
                <label htmlFor="remote-only-checkbox" className="text-sm font-medium text-foreground cursor-pointer">
                  Remote jobs only
                </label>
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  Job Portal Sources
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCES.map((source) => {
                    const isChecked = selectedSources.includes(source.id);
                    return (
                      <button
                        key={source.id}
                        id={`source-${source.id}`}
                        type="button"
                        disabled={isActive}
                        onClick={() => toggleSource(source.id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isChecked
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-border/80 hover:bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isChecked ? "bg-primary border-primary" : "border-border"
                          }`}
                        >
                          {isChecked && (
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        {source.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  id="btn-start-scraping"
                  onClick={handleStart}
                  disabled={isActive || isStarting || !country || !sector || !selectedSources.length}
                  className="flex-1"
                  size="lg"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Scraping
                    </>
                  )}
                </Button>
                <Button
                  id="btn-stop-scraping"
                  variant="danger"
                  size="lg"
                  onClick={handleStop}
                  disabled={!isActive || isStopping}
                  className="flex-1"
                >
                  {isStopping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      Stop
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Status Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Header */}
          <Card
            className={`border ${
              status.status === "running"
                ? "border-blue-500/30 bg-blue-500/5"
                : status.status === "queued"
                ? "border-amber-500/30 bg-amber-500/5"
                : status.status === "failed"
                ? "border-red-500/30 bg-red-500/5"
                : status.status === "completed"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live Status</CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={pollStatus}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <StatusBadge status={status.status || (status.isRunning ? "running" : undefined)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isActive || status.status === "completed" || status.status === "failed" ? (
                <>
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground capitalize">
                        {status.currentStage || status.status || "Processing..."}
                      </span>
                      <span className="font-mono text-primary">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} status={status.status} />
                  </div>

                  {/* Queue metadata */}
                  {(status.queueJobId || status.retryCount !== undefined) && (
                    <div className="flex flex-wrap gap-2">
                      {status.queueJobId && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground glass-card px-2 py-1 rounded-md">
                          <Hash className="w-2.5 h-2.5" />
                          Job {status.queueJobId}
                        </div>
                      )}
                      {(status.retryCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 glass-card px-2 py-1 rounded-md border border-amber-500/20">
                          <RefreshCw className="w-2.5 h-2.5" />
                          Retry #{status.retryCount}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Current Source", value: status.currentSource || "—", icon: Globe },
                      { label: "Companies", value: status.companiesFound ?? 0, icon: Building2 },
                      { label: "Jobs Found", value: status.jobsFound ?? 0, icon: Briefcase },
                      { label: "Leads Found", value: status.leadsFound ?? 0, icon: Users },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="glass-card p-3 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Target badges */}
                  {(status.region || status.sector) && (
                    <div className="flex flex-wrap gap-1.5">
                      {status.region && (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="w-2.5 h-2.5 mr-1" />
                          {status.region}
                        </Badge>
                      )}
                      {status.sector && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="w-2.5 h-2.5 mr-1" />
                          {status.sector}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Error message for failed runs */}
                  {status.status === "failed" && (
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        <p className="text-xs text-red-400 font-medium">Run Failed</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Check the History page for error details and retry options.
                      </p>
                    </div>
                  )}

                  {/* Started at */}
                  {status.startedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Started {formatDate(status.startedAt)}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">No active run</p>
                    <p className="text-xs text-muted-foreground/60">
                      Configure and start a scrape run
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Stages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                Pipeline Stages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {STAGES.map((stage, i) => (
                <StageStep
                  key={stage}
                  label={stage}
                  done={isActive ? i < currentStageIdx : status.status === "completed" ? true : false}
                  active={isActive && i === currentStageIdx}
                />
              ))}
            </CardContent>
          </Card>

          {/* BullMQ Queue Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                Queue Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: "Queue Engine", value: "BullMQ + Redis" },
                { label: "Max Retries", value: "3 × exponential backoff" },
                { label: "Retry Delays", value: "1min → 2min → 4min" },
                { label: "Worker Process", value: "npm run worker" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground font-mono text-[10px]">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
