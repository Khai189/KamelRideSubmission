import type { AnalyticsEvent, MetricKey } from "@/lib/analytics/types";

type TrendPoint = {
  label: string;
  value: number;
};

type MetricCard = {
  label: string;
  total: string;
  delta: string;
  context: string;
  trend: TrendPoint[];
};

export type DashboardData = {
  totalEvents: number;
  totalSessions: number;
  bounceRateAverage: string;
  metricCards: Record<MetricKey, MetricCard>;
  bounceRateSeries: TrendPoint[];
  exitJourney: TrendPoint[];
  topPages: Array<{
    page: string;
    visits: number;
    share: number;
  }>;
  finance: {
    margin: string;
    revenue: MetricCard;
    profit: MetricCard;
  };
};

type DailyAggregate = {
  label: string;
  clicks: number;
  impressions: number;
  revenue: number;
  profit: number;
};

type SessionSnapshot = {
  pages: string[];
  day: string;
};

function formatDay(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(timestamp));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function calculateDelta(current: number, previous: number) {
  if (previous === 0) {
    return "+0.0%";
  }

  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";

  return `${sign}${delta.toFixed(1)}%`;
}

function sumMetric(
  bucket: DailyAggregate[],
  key: "clicks" | "impressions" | "revenue" | "profit"
) {
  return bucket.reduce((total, entry) => total + entry[key], 0);
}

function buildMetricCard(
  label: string,
  trend: TrendPoint[],
  total: string,
  delta: string,
  context: string
) {
  return {
    label,
    total,
    delta,
    context,
    trend
  };
}

export function buildDashboardData(events: AnalyticsEvent[]): DashboardData {
  const dailyMap = new Map<string, DailyAggregate>();
  const pageVisits = new Map<string, number>();
  const sessions = new Map<string, SessionSnapshot>();

  for (const event of events) {
    const dayLabel = formatDay(event.timestamp);
    const existingDay =
      dailyMap.get(dayLabel) ??
      {
        label: dayLabel,
        clicks: 0,
        impressions: 0,
        revenue: 0,
        profit: 0
      };

    dailyMap.set(dayLabel, existingDay);

    const existingSession =
      sessions.get(event.sessionId) ??
      {
        pages: [],
        day: dayLabel
      };

    if (event.type === "page_view") {
      existingSession.pages[event.sequence - 1] = event.page;
      pageVisits.set(event.page, (pageVisits.get(event.page) ?? 0) + 1);
    }

    if (event.type === "click") {
      existingDay.clicks += event.count;
    }

    if (event.type === "impression") {
      existingDay.impressions += event.count;
    }

    if (event.type === "purchase") {
      existingDay.revenue += event.revenue;
      existingDay.profit += event.profit;
    }

    sessions.set(event.sessionId, existingSession);
  }

  const daily = Array.from(dailyMap.values());
  const dailyMidpoint = Math.max(Math.floor(daily.length / 2), 1);
  const previousDays = daily.slice(0, dailyMidpoint);
  const currentDays = daily.slice(dailyMidpoint);

  const clickTrend = daily.map((entry) => ({
    label: entry.label,
    value: entry.clicks
  }));

  const impressionTrend = daily.map((entry) => ({
    label: entry.label,
    value: entry.impressions
  }));

  const ctrTrend = daily.map((entry) => ({
    label: entry.label,
    value: entry.impressions === 0 ? 0 : (entry.clicks / entry.impressions) * 100
  }));

  const revenueTrend = daily.map((entry) => ({
    label: entry.label,
    value: entry.revenue
  }));

  const profitTrend = daily.map((entry) => ({
    label: entry.label,
    value: entry.profit
  }));

  const clickTotal = sumMetric(daily, "clicks");
  const impressionTotal = sumMetric(daily, "impressions");
  const ctrTotal = impressionTotal === 0 ? 0 : (clickTotal / impressionTotal) * 100;
  const revenueTotal = sumMetric(daily, "revenue");
  const profitTotal = sumMetric(daily, "profit");
  const margin = revenueTotal === 0 ? 0 : (profitTotal / revenueTotal) * 100;

  const previousClicks = sumMetric(previousDays, "clicks");
  const currentClicks = sumMetric(currentDays, "clicks");
  const previousImpressions = sumMetric(previousDays, "impressions");
  const currentImpressions = sumMetric(currentDays, "impressions");
  const previousCtr =
    previousImpressions === 0 ? 0 : (previousClicks / previousImpressions) * 100;
  const currentCtr =
    currentImpressions === 0 ? 0 : (currentClicks / currentImpressions) * 100;
  const previousRevenue = sumMetric(previousDays, "revenue");
  const currentRevenue = sumMetric(currentDays, "revenue");
  const previousProfit = sumMetric(previousDays, "profit");
  const currentProfit = sumMetric(currentDays, "profit");

  const sessionEntries = Array.from(sessions.values());
  const bounceByDay = new Map<string, { total: number; bounced: number }>();
  const exitBuckets = new Map<number, number>();

  for (const session of sessionEntries) {
    const pageDepth = session.pages.filter(Boolean).length;
    const existingDay = bounceByDay.get(session.day) ?? { total: 0, bounced: 0 };
    existingDay.total += 1;

    if (pageDepth <= 1) {
      existingDay.bounced += 1;
    }

    bounceByDay.set(session.day, existingDay);
    exitBuckets.set(pageDepth, (exitBuckets.get(pageDepth) ?? 0) + 1);
  }

  const bounceRateSeries = daily.map((entry) => {
    const bounce = bounceByDay.get(entry.label) ?? { total: 0, bounced: 0 };
    const value = bounce.total === 0 ? 0 : (bounce.bounced / bounce.total) * 100;

    return {
      label: entry.label,
      value
    };
  });

  const averageBounceRate =
    bounceRateSeries.reduce((total, point) => total + point.value, 0) /
    Math.max(bounceRateSeries.length, 1);

  const exitJourney = Array.from({ length: 5 }, (_, index) => {
    const pageCount = index + 1;
    return {
      label: `${pageCount} page${pageCount === 1 ? "" : "s"}`,
      value: exitBuckets.get(pageCount) ?? 0
    };
  });

  const totalPageViews = Array.from(pageVisits.values()).reduce(
    (total, visits) => total + visits,
    0
  );

  const topPages = Array.from(pageVisits.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([page, visits]) => ({
      page,
      visits,
      share: Number(((visits / Math.max(totalPageViews, 1)) * 100).toFixed(1))
    }));

  return {
    totalEvents: events.length,
    totalSessions: sessionEntries.length,
    bounceRateAverage: formatPercent(averageBounceRate),
    metricCards: {
      clicks: buildMetricCard(
        "Web Clicks",
        clickTrend,
        formatCompactNumber(clickTotal),
        calculateDelta(currentClicks, previousClicks),
        "Total click volume across tracked sessions"
      ),
      impressions: buildMetricCard(
        "Impressions",
        impressionTrend,
        formatCompactNumber(impressionTotal),
        calculateDelta(currentImpressions, previousImpressions),
        "Served views for all pages and CTAs"
      ),
      ctr: buildMetricCard(
        "Click-through Rate",
        ctrTrend,
        formatPercent(ctrTotal),
        calculateDelta(currentCtr, previousCtr),
        "Clicks divided by impressions over the active window"
      )
    },
    bounceRateSeries,
    exitJourney,
    topPages,
    finance: {
      margin: `${formatPercent(margin)} margin`,
      revenue: buildMetricCard(
        "Revenue",
        revenueTrend,
        formatCurrency(revenueTotal),
        calculateDelta(currentRevenue, previousRevenue),
        "Gross earnings produced by mock purchases"
      ),
      profit: buildMetricCard(
        "Profit",
        profitTrend,
        formatCurrency(profitTotal),
        calculateDelta(currentProfit, previousProfit),
        "Net return after estimated ride-service costs"
      )
    }
  };
}

export type { MetricKey };
