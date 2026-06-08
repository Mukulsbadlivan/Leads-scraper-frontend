"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Play,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  History,
  Zap,
  TrendingUp,
  ChevronRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & metrics",
  },
  {
    title: "Scraper Control",
    href: "/scraper",
    icon: Play,
    description: "Start & monitor scrapes",
  },
  {
    title: "Leads",
    href: "/leads",
    icon: Users,
    description: "Explore enriched leads",
  },
  {
    title: "Companies",
    href: "/companies",
    icon: Building2,
    description: "Company intelligence",
  },
  {
    title: "Jobs Explorer",
    href: "/jobs",
    icon: Briefcase,
    description: "View scraped job listings",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Market intelligence reports",
  },
  {
    title: "History",
    href: "/history",
    icon: History,
    description: "Scrape run history",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 h-screen flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-tight">
              ICP Intelligence
            </p>
            <p className="text-xs text-muted-foreground">Lead Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-link group relative",
                isActive && "active"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary/50 text-muted-foreground group-hover:bg-secondary group-hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-primary" : "text-foreground/80"
                  )}
                >
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border/50 space-y-3">
        <div className="glass-card p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-foreground">System Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Backend API Connected</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">v1.0.0</p>
            <p className="text-[10px] text-muted-foreground">Production</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
