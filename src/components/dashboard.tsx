"use client";

import { useState } from "react";
import type {
  DashboardData,
  MetricKey
} from "@/lib/analytics/dashboard";

type DashboardProps = {
  data: DashboardData;
};

type TrendSeriesPoint = DashboardData["bounceRateSeries"][number];

type TimeSeriesChartProps = {
  points: TrendSeriesPoint[];
  lineColor: string;
  fillColor: string;
  valueFormatter: (value: number) => string;
};

const metricLabels: Record<MetricKey, string> = {
  clicks: "Web Clicks",
  impressions: "Impressions",
  ctr: "CTR"
};

const metricKeys: MetricKey[] = ["clicks", "impressions", "ctr"];

const panelClass =
  "rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_22px_55px_rgba(24,33,45,0.12)] backdrop-blur-md sm:p-6";

const eyebrowClass =
  "mb-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500";

const badgeClass =
  "inline-flex whitespace-nowrap rounded-full px-3 py-2 text-[0.82rem] font-semibold";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function averageValue(points: DashboardData["bounceRateSeries"]) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return total / Math.max(points.length, 1);
}

function peakPoint(points: DashboardData["bounceRateSeries"]) {
  return points.reduce((peak, point) =>
    point.value > peak.value ? point : peak
  );
}

function formatMetricValue(metric: MetricKey, value: number) {
  if (metric === "ctr") {
    return `${value.toFixed(1)}%`;
  }

  return compactNumberFormatter.format(value);
}

function formatPercentValue(value: number) {
  return `${value.toFixed(1)}%`;
}

function TimeSeriesChart({
  points,
  lineColor,
  fillColor,
  valueFormatter
}: TimeSeriesChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const left = 6;
  const right = 2;
  const top = 10;
  const bottom = 14;
  const chartWidth = 100 - left - right;
  const chartHeight = 100 - top - bottom;

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1 ? left : left + (index / (points.length - 1)) * chartWidth;
    const y = top + chartHeight - (point.value / maxValue) * chartHeight;

    return { ...point, x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x} ${100 - bottom} L ${firstPoint.x} ${100 - bottom} Z`;
  const yTicks = [maxValue, maxValue * 0.66, maxValue * 0.33, 0];
  const xTickIndices = Array.from(
    new Set([
      0,
      Math.floor((points.length - 1) / 3),
      Math.floor((2 * (points.length - 1)) / 3),
      points.length - 1
    ])
  );

  return (
    <div className="rounded-[24px] border border-slate-900/8 bg-slate-50/80 p-4">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex h-[220px] flex-col justify-between pb-8 text-[0.7rem] font-medium text-slate-400">
          {yTicks.map((tick, index) => (
            <span key={`${tick}-${index}`}>{valueFormatter(tick)}</span>
          ))}
        </div>

        <div>
          <div className="relative h-[220px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {yTicks.map((tick, index) => {
                const y = top + chartHeight - (tick / maxValue) * chartHeight;

                return (
                  <line
                    key={`grid-${index}`}
                    x1={left}
                    y1={y}
                    x2={100 - right}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeWidth="0.8"
                    strokeDasharray={index === yTicks.length - 1 ? "0" : "2.5 3.5"}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <path d={areaPath} fill={fillColor} opacity="0.18" />
              <path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {coordinates.map((point) => (
                <circle
                  key={point.label}
                  cx={point.x}
                  cy={point.y}
                  r="1.35"
                  fill={lineColor}
                />
              ))}

              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="2.4"
                fill={lineColor}
                stroke="white"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-between text-[0.72rem] font-medium text-slate-500">
            {xTickIndices.map((index) => (
              <span key={`${points[index]?.label}-${index}`}>{points[index]?.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ data }: DashboardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("clicks");

  const currentMetric = data.metricCards[activeMetric];

  const maxJourneyValue = Math.max(...data.exitJourney.map((point) => point.value), 1);
  const maxFinanceValue = Math.max(
    ...data.finance.revenue.trend.map((point) => point.value),
    ...data.finance.profit.trend.map((point) => point.value),
    1
  );
  const metricAverage = averageValue(currentMetric.trend);
  const metricPeak = peakPoint(currentMetric.trend);
  const bouncePeak = peakPoint(data.bounceRateSeries);
  const revenueAverage = averageValue(data.finance.revenue.trend);
  const revenuePeak = peakPoint(data.finance.revenue.trend);
  const profitAverage = averageValue(data.finance.profit.trend);
  const profitPeak = peakPoint(data.finance.profit.trend);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="grid gap-[18px] lg:grid-cols-3">
        <article className={panelClass}>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 1</p>
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-900">
                Clicks, Impressions, and CTR
              </h2>
            </div>
            <span className={`${badgeClass} bg-slate-900/6 text-slate-900`}>
              3-way filter
            </span>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="tablist" aria-label="Metric filter">
            {metricKeys.map((metric) => (
              <button
                key={metric}
                className={
                  metric === activeMetric
                    ? "rounded-[20px] border border-slate-900 bg-slate-900 px-4 py-3 text-left text-white transition hover:-translate-y-0.5"
                    : "rounded-[20px] border border-slate-900/10 bg-slate-900/4 px-4 py-3 text-left text-slate-700 transition hover:-translate-y-0.5"
                }
                onClick={() => setActiveMetric(metric)}
                role="tab"
                aria-selected={metric === activeMetric}
              >
                <span className="block text-[0.72rem] font-bold uppercase tracking-[0.18em] opacity-70">
                  {metricLabels[metric]}
                </span>
                <span className="mt-1 block text-xl font-semibold tracking-[-0.03em]">
                  {data.metricCards[metric].total}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-[22px] bg-[linear-gradient(135deg,rgba(13,148,136,0.1),rgba(255,255,255,0.85))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Active Trend
                </p>
                <strong className="mt-1 block text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.05em] text-slate-900">
                  {currentMetric.total}
                </strong>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-teal-500/14 px-3 py-2 text-sm font-semibold text-teal-700">
                  {currentMetric.delta}
                </span>
                <span className="inline-flex rounded-full bg-slate-900/6 px-3 py-2 text-sm font-semibold text-slate-700">
                  Peak {metricPeak.label}
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/70 px-4 py-3">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Daily Average
                </p>
                <strong className="mt-1 block text-lg font-semibold text-slate-900">
                  {formatMetricValue(activeMetric, metricAverage)}
                </strong>
              </div>
              <div className="rounded-2xl bg-white/70 px-4 py-3">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Peak Value
                </p>
                <strong className="mt-1 block text-lg font-semibold text-slate-900">
                  {formatMetricValue(activeMetric, metricPeak.value)}
                </strong>
              </div>
            </div>
          </div>

          <TimeSeriesChart
            points={currentMetric.trend}
            lineColor="#2563eb"
            fillColor="#93c5fd"
            valueFormatter={(value) => formatMetricValue(activeMetric, value)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>Last 14 days</span>
            <span>
              Peak {formatMetricValue(activeMetric, metricPeak.value)} on {metricPeak.label}
            </span>
          </div>
        </article>

        <article className={panelClass}>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 2</p>
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-900">
                Bounce Rate
              </h2>
            </div>
            <span className={`${badgeClass} bg-teal-500/12 text-teal-700`}>
              {data.bounceRateAverage}
            </span>
          </div>

          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Average
              </p>
              <strong className="mt-1 block text-lg font-semibold text-slate-900">
                {data.bounceRateAverage}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Highest Day
              </p>
              <strong className="mt-1 block text-lg font-semibold text-slate-900">
                {bouncePeak.label} · {formatPercentValue(bouncePeak.value)}
              </strong>
            </div>
          </div>

          <TimeSeriesChart
            points={data.bounceRateSeries}
            lineColor="#f97316"
            fillColor="#fdba74"
            valueFormatter={formatPercentValue}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>Last 14 days</span>
            <span>Peak on {bouncePeak.label}</span>
          </div>
        </article>

        <article className={`${panelClass} grid grid-rows-[auto_auto_1fr]`}>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 3</p>
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-900">
                Visit Depth Before Exit
              </h2>
            </div>
            <span className={`${badgeClass} bg-slate-900/6 text-slate-900`}>
              5 top pages
            </span>
          </div>

          <div className="mb-4">
            <div>
              <p className={eyebrowClass}>Pages visited before leaving</p>
              <div className="grid min-h-[150px] grid-cols-[repeat(5,minmax(0,1fr))] items-end gap-3">
                {data.exitJourney.map((point) => (
                  <div key={point.label} className="flex min-w-0 flex-col items-center gap-2">
                    <div
                      className="min-h-6 w-full rounded-t-full rounded-b-2xl bg-gradient-to-b from-orange-500 to-orange-500/35"
                      style={{
                        height: `${Math.max((point.value / maxJourneyValue) * 100, 12)}%`
                      }}
                    />
                    <strong className="text-[0.8rem] font-semibold text-slate-900">
                      {point.value}
                    </strong>
                    <span className="w-full truncate text-center text-[0.72rem] text-slate-500">
                      {point.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <p className={eyebrowClass}>Most popular pages</p>
            <div className="grid gap-3">
              {data.topPages.map((page, index) => (
                <div
                  key={page.page}
                  className="grid items-center gap-3 sm:grid-cols-[auto_1fr_minmax(120px,0.8fr)]"
                >
                  <div className="grid h-[34px] w-[34px] place-items-center rounded-xl bg-slate-900/8 text-sm font-semibold text-slate-900">
                    {index + 1}
                  </div>
                  <div>
                    <strong className="block text-[0.98rem] font-semibold text-slate-900">
                      {page.page}
                    </strong>
                    <span className="text-[0.82rem] text-slate-500">
                      {page.visits.toLocaleString()} visits
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-600/80 to-orange-500/80"
                      style={{ width: `${page.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-[18px] grid gap-[18px] lg:grid-cols-2">
        <article className={panelClass}>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 4</p>
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-900">
                Revenue
              </h2>
            </div>
            <span className={`${badgeClass} bg-blue-500/10 text-blue-700`}>
              {data.finance.revenue.delta}
            </span>
          </div>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-[22px] bg-[linear-gradient(135deg,rgba(13,148,136,0.1),rgba(255,255,255,0.85))] p-5">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                14-Day Revenue
              </p>
              <strong className="mt-1 block text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.05em] text-slate-900">
                {data.finance.revenue.total}
              </strong>
            </div>
            <span className="inline-flex rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700">
              Peak {revenuePeak.label}
            </span>
          </div>

          <div className="grid min-h-[220px] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-3">
            {data.finance.revenue.trend.map((point) => (
              <div key={point.label} className="flex min-w-0 flex-col items-center gap-2">
                <div
                  className="min-h-[18px] w-full rounded-t-full rounded-b-2xl bg-gradient-to-b from-teal-700 to-teal-700/35"
                  style={{
                    height: `${Math.max((point.value / maxFinanceValue) * 100, 10)}%`
                  }}
                />
                <span className="w-full truncate text-center text-[0.72rem] text-slate-500">
                  {point.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Daily Average
              </p>
              <strong className="mt-1 block text-lg font-semibold text-slate-900">
                {currencyFormatter.format(revenueAverage)}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Peak Day
              </p>
              <strong className="mt-1 block text-lg font-semibold text-slate-900">
                {currencyFormatter.format(revenuePeak.value)}
              </strong>
            </div>
          </div>
        </article>

        <article className={panelClass}>
          <div className="mb-[18px] flex items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 5</p>
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-900">
                Profit
              </h2>
            </div>
            <span className={`${badgeClass} bg-teal-500/12 text-teal-700`}>
              {data.finance.margin}
            </span>
          </div>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-[22px] bg-[linear-gradient(135deg,rgba(29,78,216,0.1),rgba(255,255,255,0.88))] p-5">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                14-Day Profit
              </p>
              <strong className="mt-1 block text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.05em] text-slate-900">
                {data.finance.profit.total}
              </strong>
            </div>
            <span className="inline-flex rounded-full bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700">
              {data.finance.profit.delta}
            </span>
          </div>

          <div className="grid min-h-[220px] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-3">
            {data.finance.profit.trend.map((point) => (
              <div key={point.label} className="flex min-w-0 flex-col items-center gap-2">
                <div
                  className="min-h-[18px] w-full rounded-t-full rounded-b-2xl bg-gradient-to-b from-blue-700 to-blue-700/30"
                  style={{
                    height: `${Math.max((point.value / maxFinanceValue) * 100, 10)}%`
                  }}
                />
                <span className="w-full truncate text-center text-[0.72rem] text-slate-500">
                  {point.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Daily Average
              </p>
              <strong className="mt-1 block text-lg font-semibold text-slate-900">
                {currencyFormatter.format(profitAverage)}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Peak Day
              </p>
              <strong className="mt-1 block text-lg font-semibold text-slate-900">
                {currencyFormatter.format(profitPeak.value)}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
