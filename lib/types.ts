// ─── MongoDB Document Types (mirrored from backend) ─────────────────────────

export interface Company {
  _id: string;
  companyName: string;
  website?: string;
  companyProfileUrl?: string;
  linkedinUrl?: string;
  sector?: string;
  industry?: string;
  companyType?: string;
  country?: string;
  fundingStage?: string;
  isB2BSaaS?: boolean;
  numberOfEmployees?: string;
  employeeSize?: string;
  techStack?: string;
  fundingInfo?: string;
  recentFundingSignal?: boolean;
  linkedinFollowers?: number;
  linkedinConfidence?: number;
  createdAt?: string;
  updatedAt?: string;
  // Aggregated
  jobsCount?: number;
  leadsCount?: number;
  hiringScore?: number;
}

export interface Lead {
  _id: string;
  companyName?: string;
  contactName?: string;
  designation?: string;
  ceoName?: string;
  ctoName?: string;
  email?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  linkedinProfileUrl?: string;
  website?: string;
  sector?: string;
  industry?: string;
  country?: string;
  fundingStage?: string;
  numberOfEmployees?: string;
  icpScore?: number;
  icpTier?: "Hot" | "Warm" | "Cold";
  intents?: Intent[];
  source?: string;
  jobTitle?: string;
  location?: string;
  companyId?: string;
  scrapeRunId?: string;
  hiringVelocity?: {
    last30days: number;
    last60days: number;
    trend: string;
    topRoles: string[];
  };
  emailConfidenceScore?: number;
  linkedinConfidence?: number;
  scrapeTimestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Intent {
  id: string;
  name: string;
  description?: string;
  confidence?: number;
}

export interface Job {
  _id: string;
  source: string;
  jobUrl: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  salary?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  companyRating?: number;
  companyId?: string;
  scrapeRunId?: string;
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  scrapeTimestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Signal {
  _id: string;
  category: string;
  signalType?: string;
  headline?: string;
  detail?: string;
  confidence?: number;
  companyId: string;
  leadId?: string;
  scrapeRunId?: string;
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  detectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrapeRun {
  _id: string;
  status: "queued" | "running" | "completed" | "failed" | "partial";
  startedAt: string;
  completedAt?: string;
  portals?: string[];
  searchQueries?: string[];
  locations?: string[];
  outputFile?: string;
  region?: string;
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  sources?: string[];
  /** BullMQ queue job ID */
  queueJobId?: string;
  /** 0–100 percent completion */
  progress?: number;
  currentStage?: string;
  currentSource?: string;
  jobsFound?: number;
  companiesFound?: number;
  leadsFound?: number;
  /** Number of BullMQ retry attempts made */
  retryCount?: number;
  rawLeadsFound?: number;
  uniqueCompanies?: number;
  enrichedLeads?: number;
  filteredLeads?: number;
  hotLeads?: number;
  warmLeads?: number;
  coldLeads?: number;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardMetrics {
  totalCompanies: number;
  totalLeads: number;
  totalJobs: number;
  totalSignals: number;
  activeScrapeRuns: number;
  leadsByRegion: ChartData[];
  leadsBySector: ChartData[];
  jobsBySource: ChartData[];
  dailyScrapeActivity: DailyActivity[];
  companiesMerged?: number;
  leadsMerged?: number;
  duplicatesRemoved?: number;
}

export interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface DailyActivity {
  date: string;
  runs: number;
  leads: number;
  companies: number;
}

export interface ScraperStatus {
  isRunning: boolean;
  runId?: string;
  scrapeRunId?: string;
  queueJobId?: string;
  status?: "queued" | "running" | "completed" | "failed" | "partial";
  currentSource?: string;
  companiesFound?: number;
  jobsFound?: number;
  leadsFound?: number;
  progress?: number;
  progressPercent?: number;
  currentStage?: string;
  startedAt?: string;
  region?: string;
  sector?: string;
  country?: string;
  state?: string;
  city?: string;
  retryCount?: number;
  selectedSources?: string[];
}

export interface CompanyDetail extends Company {
  jobs: Job[];
  leads: Lead[];
  signals: Signal[];
  scrapeHistory: ScrapeRun[];
}

export interface ApiError {
  error: string;
  message?: string;
}
