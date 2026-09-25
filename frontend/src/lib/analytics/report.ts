export type AnalyticsCount = { label: string; count: number };

export type AnalyticsReport = {
  totals: {
    devices: number;
    visits: number;
    pageViews: number;
    events: number;
    devicesToday: number;
    visitsToday: number;
  };
  deviceTypes: AnalyticsCount[];
  displayModes: AnalyticsCount[];
  topPages: AnalyticsCount[];
  topEvents: AnalyticsCount[];
  recentVisits: Array<{
    id: number;
    landingPath: string;
    firstSeenAt: string;
    lastSeenAt: string;
    pageViews: number;
    deviceType: string;
    displayMode: string;
  }>;
  generatedAt: string;
};

export async function getAnalyticsReport(): Promise<AnalyticsReport> {
  const response = await fetch("/api/admin/analytics", { credentials: "include" });
  const payload = await response.json() as AnalyticsReport & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Visitor reporting is unavailable.");
  return payload;
}
