"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Globe, MapPin, Users,
  Briefcase, Zap, History, ExternalLink, AlertCircle, Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyDetail } from "@/lib/types";
import { formatDate, getStatusColor, getScoreColor, getIcpTierColor } from "@/lib/utils";

type TabKey = "jobs" | "leads" | "signals" | "history";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("jobs");

  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/company/${id}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Company not found" : "Failed to load");
        setCompany(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCompany();
  }, [id]);

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: "jobs", label: "Jobs", icon: Briefcase, count: company?.jobs?.length },
    { key: "leads", label: "Leads", icon: Users, count: company?.leads?.length },
    { key: "signals", label: "Signals", icon: Zap, count: company?.signals?.length },
    { key: "history", label: "History", icon: History, count: company?.scrapeHistory?.length },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 shimmer rounded" />
        <div className="h-40 shimmer rounded-xl" />
        <div className="h-80 shimmer rounded-xl" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center gap-4 mt-20">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 font-medium">{error || "Company not found"}</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Companies
      </Button>

      {/* Company Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-border/50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  {company.companyName}
                </h1>
                {company.sector && (
                  <Badge variant="default">{company.sector}</Badge>
                )}
                {company.isB2BSaaS && (
                  <Badge variant="success">B2B SaaS</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {company.country && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {company.country}
                  </span>
                )}
                {company.numberOfEmployees && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {company.numberOfEmployees} employees
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {company.website.replace(/^https?:\/\//, "").slice(0, 30)}
                  </a>
                )}
                {company.linkedinUrl && (
                  <a
                    href={company.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="hidden lg:flex gap-4">
              {[
                { label: "Jobs", value: company.jobsCount || company.jobs?.length || 0 },
                { label: "Leads", value: company.leadsCount || company.leads?.length || 0 },
                { label: "Signals", value: company.signals?.length || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="text-center px-4 py-2 glass-card rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-secondary text-xs">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-0">
          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div>
              {company.jobs?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Job Title", "Location", "Salary", "Source", "Posted"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {company.jobs.map((job) => (
                      <tr key={job._id} className="border-b border-border/30 table-row-hover">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{job.jobTitle || "—"}</div>
                          {job.jobUrl && (
                            <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />View
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{job.location || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{job.salary || "—"}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{job.source}</Badge></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(job.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No jobs found for this company</p>
                </div>
              )}
            </div>
          )}

          {/* Leads Tab */}
          {activeTab === "leads" && (
            <div>
              {company.leads?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Contact", "Designation", "Email / LinkedIn", "ICP Score", "Tier"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {company.leads.map((lead) => (
                      <tr key={lead._id} className="border-b border-border/30 table-row-hover">
                        <td className="px-4 py-3 font-medium text-foreground">{lead.contactName || lead.ceoName || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{lead.designation || lead.jobTitle || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {lead.email && <span className="text-xs text-muted-foreground">{lead.email}</span>}
                            {lead.linkedinUrl && (
                              <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">LinkedIn</a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${getScoreColor(lead.icpScore || 0)}`}>
                            {lead.icpScore || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lead.icpTier ? (
                            <Badge variant={lead.icpTier === "Hot" ? "hot" : lead.icpTier === "Warm" ? "warm" : "cold"}>
                              {lead.icpTier}
                            </Badge>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No leads for this company</p>
                </div>
              )}
            </div>
          )}

          {/* Signals Tab */}
          {activeTab === "signals" && (
            <div>
              {company.signals?.length ? (
                <div className="divide-y divide-border/30">
                  {company.signals.map((signal) => (
                    <div key={signal._id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{signal.headline || signal.signalType || signal.category}</p>
                          <Badge variant="secondary" className="text-xs">{signal.category}</Badge>
                          {signal.confidence && (
                            <span className={`text-xs font-medium ${getScoreColor(signal.confidence)}`}>
                              {signal.confidence}% confidence
                            </span>
                          )}
                        </div>
                        {signal.detail && <p className="text-xs text-muted-foreground mt-0.5">{signal.detail}</p>}
                        <p className="text-xs text-muted-foreground/60 mt-1">{formatDate(signal.detectedAt || signal.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No signals detected</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div>
              {company.scrapeHistory?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Run ID", "Status", "Started", "Completed", "Leads"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {company.scrapeHistory.map((run) => (
                      <tr key={run._id} className="border-b border-border/30 table-row-hover">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{run._id.slice(-8)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={run.status as "running" | "completed" | "failed" | "partial"}>{run.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(run.startedAt)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(run.completedAt)}</td>
                        <td className="px-4 py-3 text-xs">{run.filteredLeads || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No scrape history</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
