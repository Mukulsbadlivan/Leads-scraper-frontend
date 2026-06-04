"use client";

import { useEffect, useState, useCallback } from "react";
import { useFilters } from "@/lib/FilterContext";
import {
  RefreshCw, AlertCircle, Mail, Phone, Database, CheckCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

interface ReportData {
  sectorVolumes: {
    leads: { name: string; value: number }[];
    jobs: { name: string; value: number }[];
  };
  discoveryRates: {
    total: number;
    withEmail: number;
    withPhone: number;
    withBoth: number;
    emailRate: number;
    phoneRate: number;
    bothRate: number;
  };
  jobsBySource: { name: string; value: number }[];
  topHiringCompanies: { name: string; count: number }[];
}

export default function ReportsPage() {
  const { country, state, city, sector } = useFilters();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ...(country && { country }),
        ...(state && { state }),
        ...(city && { city }),
        ...(sector && { sector }),
      });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch report data");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [country, state, city, sector]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Transform Sector Volumes into a combined list for charting
  const getSectorChartData = () => {
    if (!data) return [];
    const sectorMap = new Map<string, { name: string; leads: number; jobs: number }>();
    
    data.sectorVolumes.leads.forEach((s) => {
      sectorMap.set(s.name, { name: s.name, leads: s.value, jobs: 0 });
    });
    
    data.sectorVolumes.jobs.forEach((s) => {
      const existing = sectorMap.get(s.name);
      if (existing) {
        existing.jobs = s.value;
      } else {
        sectorMap.set(s.name, { name: s.name, leads: 0, jobs: s.value });
      }
    });

    return Array.from(sectorMap.values()).slice(0, 8);
  };

  const getDiscoveryPieData = () => {
    if (!data) return [];
    const { total, withEmail, withPhone, withBoth } = data.discoveryRates;
    const emailOnly = Math.max(0, withEmail - withBoth);
    const phoneOnly = Math.max(0, withPhone - withBoth);
    const none = Math.max(0, total - emailOnly - phoneOnly - withBoth);

    return [
      { name: "Email & Phone", value: withBoth },
      { name: "Email Only", value: emailOnly },
      { name: "Phone Only", value: phoneOnly },
      { name: "No Direct Contact", value: none },
    ].filter(item => item.value > 0);
  };

  const sectorChartData = getSectorChartData();
  const discoveryPieData = getDiscoveryPieData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hiring & Intelligence <span className="gradient-text">Reports</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global market insights, contact discovery rates, and sector activity volumes
          </p>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Report
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchReports} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-96">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="h-6 w-1/3 bg-secondary/50 rounded animate-pulse" />
                <div className="h-64 w-full bg-secondary/35 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data || data.discoveryRates.total === 0 ? (
        <Card className="border-dashed border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No reports available</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
            We couldn&apos;t find any data matching your current filters. Start a scraper run for the selected region and sector to see reports.
          </p>
        </Card>
      ) : (
        <>
          {/* Key Metric Strips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{data.discoveryRates.emailRate}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Discovery Rate</p>
                  <p className="text-[10px] text-muted-foreground/60">{formatNumber(data.discoveryRates.withEmail)} / {formatNumber(data.discoveryRates.total)} leads</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{data.discoveryRates.phoneRate}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone Discovery Rate</p>
                  <p className="text-[10px] text-muted-foreground/60">{formatNumber(data.discoveryRates.withPhone)} / {formatNumber(data.discoveryRates.total)} leads</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{data.discoveryRates.bothRate}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Complete Info Rate</p>
                  <p className="text-[10px] text-muted-foreground/60">{formatNumber(data.discoveryRates.withBoth)} / {formatNumber(data.discoveryRates.total)} leads</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector Volume Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Sector Activity Volume</CardTitle>
                <CardDescription>Comparison of qualified leads vs active job posts across top sectors</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {sectorChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                        labelStyle={{ color: "#f4f4f5", fontWeight: "bold" }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar name="Leads" dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Jobs" dataKey="jobs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No sector data to display.</div>
                )}
              </CardContent>
            </Card>

            {/* Lead Contact Details Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Quality Breakdown</CardTitle>
                <CardDescription>Distribution of contact details available on qualified ICP leads</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {discoveryPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={discoveryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {discoveryPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                        itemStyle={{ color: "#f4f4f5" }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No contact data to display.</div>
                )}
              </CardContent>
            </Card>

            {/* Jobs by Source */}
            <Card>
              <CardHeader>
                <CardTitle>Job Source Distribution</CardTitle>
                <CardDescription>Where active job postings were scraped from</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {data.jobsBySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.jobsBySource}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        dataKey="value"
                      >
                        {data.jobsBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                        itemStyle={{ color: "#f4f4f5" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No job source data to display.</div>
                )}
              </CardContent>
            </Card>

            {/* Top Hiring Companies */}
            <Card>
              <CardHeader>
                <CardTitle>Top Hiring Companies</CardTitle>
                <CardDescription>Organizations with the highest volume of active job posts</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {data.topHiringCompanies.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topHiringCompanies}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis type="number" stroke="#71717a" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                        labelStyle={{ color: "#f4f4f5", fontWeight: "bold" }}
                      />
                      <Bar name="Job Posts" dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No hiring activity data to display.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
