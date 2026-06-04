import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null): string {
  if (num == null) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(start: Date | string, end?: Date | string): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = e - s;
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "running": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "completed": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "failed": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "partial": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  }
}

export function getIcpTierColor(tier: string): string {
  switch (tier) {
    case "Hot": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "Warm": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Cold": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  if (score >= 25) return "text-orange-400";
  return "text-red-400";
}

export const REGIONS = [
  "Hyderabad",
  "Bangalore",
  "Pune",
  "Mumbai",
  "Delhi NCR",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Noida",
  "Gurugram",
];

export const SECTORS = [
  "SaaS",
  "FinTech",
  "HealthTech",
  "EdTech",
  "AI",
  "Cybersecurity",
  "IT Services",
  "E-Commerce",
  "DeepTech",
  "CleanTech",
];

export const SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "indeed", label: "Indeed" },
  { id: "glassdoor", label: "Glassdoor" },
  { id: "reddit", label: "Reddit" },
  { id: "upwork", label: "Upwork" },
];
