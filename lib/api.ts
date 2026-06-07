// In production (Vercel), Next.js API routes are on the same origin — use relative paths.
// In development, NEXT_PUBLIC_APP_URL points to http://localhost:3001.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || "API Error");
  }

  return res.json();
}

export const api = {
  dashboard: {
    getMetrics: () => fetchApi<import("./types").DashboardMetrics>("/api/dashboard"),
  },
  scraper: {
    start: (body: { region: string; sector: string; sources: string[] }) =>
      fetchApi<{ runId: string; message: string }>("/api/scraper/start", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    stop: () =>
      fetchApi<{ message: string }>("/api/scraper/stop", { method: "POST" }),
    status: () => fetchApi<import("./types").ScraperStatus>("/api/scraper/status"),
  },
  leads: {
    list: (params: Record<string, string | number>) => {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== "" && v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString();
      return fetchApi<import("./types").PaginatedResponse<import("./types").Lead>>(
        `/api/leads?${qs}`
      );
    },
  },
  companies: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== "" && v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : "";
      return fetchApi<import("./types").PaginatedResponse<import("./types").Company>>(
        `/api/companies?${qs}`
      );
    },
    getById: (id: string) =>
      fetchApi<import("./types").CompanyDetail>(`/api/company/${id}`),
  },
  history: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== "" && v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : "";
      return fetchApi<import("./types").PaginatedResponse<import("./types").ScrapeRun>>(
        `/api/history?${qs}`
      );
    },
  },
  jobs: {
    list: (params?: Record<string, string | number>) => {
      const qs = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== "" && v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : "";
      return fetchApi<import("./types").PaginatedResponse<import("./types").Job>>(
        `/api/jobs?${qs}`
      );
    },
  },
  reports: {
    get: (params?: Record<string, string | number>) => {
      const qs = params
        ? new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== "" && v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : "";
      return fetchApi<any>(`/api/reports?${qs}`);
    },
  },
};
