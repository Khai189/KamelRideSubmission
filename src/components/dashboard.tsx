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
type RangeKey = "7d" | "14d";
type JourneyMetricKey = "sessions" | "share";
type PageMetricKey = "visits" | "share";

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type TimeSeriesChartProps = {
  compact?: boolean;
  points: TrendSeriesPoint[];
  lineColor: string;
  fillColor: string;
  valueFormatter: (value: number) => string;
};

type HoverBarListItem = {
  helperText: string;
  label: string;
  value: number;
  valueLabel: string;
};

type HoverBarListProps = {
  accentClass: string;
  items: HoverBarListItem[];
  widthBase?: number;
  title: string;
};

const metricLabels: Record<MetricKey, string> = {
  clicks: "Web Clicks",
  impressions: "Imprs.",
  ctr: "CTR"
};

const metricKeys: MetricKey[] = ["clicks", "impressions", "ctr"];

const rangeOptions: SelectOption<RangeKey>[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" }
];

const journeyMetricOptions: SelectOption<JourneyMetricKey>[] = [
  { label: "Depth by sessions", value: "sessions" },
  { label: "Depth by share", value: "share" }
];

const pageMetricOptions: SelectOption<PageMetricKey>[] = [
  { label: "Pages by visits", value: "visits" },
  { label: "Pages by share", value: "share" }
];

const panelClass =
  "relative z-0 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_22px_55px_rgba(24,33,45,0.12)] backdrop-blur-md transition-[z-index] hover:z-10 focus-within:z-10 sm:p-6";

const eyebrowClass =
  "mb-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-500";

const badgeClass =
  "inline-flex whitespace-nowrap rounded-full px-3 py-2 text-[0.78rem] font-semibold";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function sumValues(points: TrendSeriesPoint[]) {
  return points.reduce((sum, point) => sum + point.value, 0);
}

function averageValue(points: TrendSeriesPoint[]) {
  return sumValues(points) / Math.max(points.length, 1);
}

function peakPoint(points: TrendSeriesPoint[]) {
  return points.reduce((peak, point) =>
    point.value > peak.value ? point : peak
  );
}

function slicePoints(points: TrendSeriesPoint[], range: RangeKey) {
  if (range === "7d") {
    return points.slice(-7);
  }

  return points;
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

function formatMetricAggregate(metric: MetricKey, points: TrendSeriesPoint[]) {
  if (metric === "ctr") {
    return formatPercentValue(averageValue(points));
  }

  return compactNumberFormatter.format(sumValues(points));
}

function formatRangeLabel(range: RangeKey) {
  return range === "7d" ? "Last 7 days" : "Last 14 days";
}

function buildAxisTicks(maxValue: number) {
  const safeMaxValue = Math.max(maxValue, 1);
  const roughStep = safeMaxValue / 4;
  const scale = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const base = scale / 10;
  const stepCandidates = [5, 10, 25, 50, 100].map(
    (multiplier) => multiplier * base
  );
  const step =
    stepCandidates.find((candidate) => candidate >= roughStep) ??
    stepCandidates[stepCandidates.length - 1];
  const axisMax = step * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => axisMax - step * index);

  return {
    axisMax,
    ticks
  };
}

function buildXAxisTickIndices(pointCount: number, compact: boolean) {
  const lastIndex = pointCount - 1;

  if (lastIndex <= 0) {
    return [0];
  }

  if (compact || pointCount <= 4) {
    return [0, lastIndex];
  }

  return Array.from(new Set([0, Math.round(lastIndex / 2), lastIndex]));
}

function calculateTrendLabel(points: TrendSeriesPoint[]) {
  if (points.length < 2) {
    return "+0.0%";
  }

  const firstValue = points[0].value;
  const lastValue = points[points.length - 1].value;

  if (firstValue === 0) {
    return "+0.0%";
  }

  const delta = ((lastValue - firstValue) / firstValue) * 100;
  const sign = delta >= 0 ? "+" : "";

  return `${sign}${delta.toFixed(1)}%`;
}

function DashboardSelect<T extends string>({
  ariaLabel,
  onChange,
  options,
  value
}: {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  value: T;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[0.78rem] font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-slate-400"
      onChange={(event) => onChange(event.target.value as T)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function TimeSeriesChart({
  compact = false,
  points,
  lineColor,
  fillColor,
  valueFormatter
}: TimeSeriesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState(points.length - 1);

  const chartPixelHeight = compact ? 132 : 204;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const { axisMax, ticks: yTicks } = buildAxisTicks(maxValue);
  const left = 7;
  const right = 2;
  const top = 10;
  const bottom = 14;
  const chartWidth = 100 - left - right;
  const chartHeight = 100 - top - bottom;
  const safeHoveredIndex = Math.min(hoveredIndex, points.length - 1);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1 ? left : left + (index / (points.length - 1)) * chartWidth;
    const y = top + chartHeight - (point.value / axisMax) * chartHeight;

    return { ...point, x, y };
  });

  const activePoint = coordinates[safeHoveredIndex];
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${lastPoint.x} ${100 - bottom} L ${firstPoint.x} ${100 - bottom} Z`;
  const xTickIndices = buildXAxisTickIndices(points.length, compact);

  return (
    <div
      className={
        compact
          ? "relative z-0 mx-auto w-full max-w-[23.5rem] overflow-visible rounded-[24px] border border-slate-900/8 bg-slate-50/80 p-3 hover:z-20 focus-within:z-20"
          : "relative z-0 overflow-visible rounded-[24px] border border-slate-900/8 bg-slate-50/80 p-3.5 hover:z-20 focus-within:z-20"
      }
    >
      <div className="mb-2 flex items-center justify-between text-[0.62rem] font-medium text-slate-400">
        <span>Hover to inspect</span>
        <span>{activePoint.label}</span>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2.5">
        <div
          className="flex flex-col justify-between pb-5 text-[0.58rem] font-medium text-slate-400"
          style={{ height: chartPixelHeight }}
        >
          {yTicks.map((tick, index) => (
            <span key={`${tick}-${index}`}>{valueFormatter(tick)}</span>
          ))}
        </div>

        <div className="relative overflow-visible">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 overflow-visible"
            style={{ height: chartPixelHeight }}
          >
            <div
              className="absolute rounded-xl bg-slate-900 px-3 py-2 text-[0.64rem] font-medium text-white shadow-[0_12px_30px_rgba(15,23,42,0.28)]"
              style={{
                left: `${activePoint.x}%`,
                top: `${Math.max(activePoint.y - 6, 10)}%`,
                transform: "translate(-50%, -100%)"
              }}
            >
              <div>{activePoint.label}</div>
              <div className="mt-0.5 text-[0.78rem] font-semibold">
                {valueFormatter(activePoint.value)}
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-white"
            style={{ height: chartPixelHeight }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {yTicks.map((tick, index) => {
                const y = top + chartHeight - (tick / axisMax) * chartHeight;

                return (
                  <line
                    key={`grid-${index}`}
                    x1={left}
                    y1={y}
                    x2={100 - right}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.2)"
                    strokeDasharray={index === yTicks.length - 1 ? "0" : "2.5 3.5"}
                    strokeWidth="0.8"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <line
                x1={activePoint.x}
                y1={top}
                x2={activePoint.x}
                y2={100 - bottom}
                stroke="rgba(100, 116, 139, 0.35)"
                strokeDasharray="2.5 3.5"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />

              <path d={areaPath} fill={fillColor} opacity="0.18" />
              <path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />

              {coordinates.map((point, index) => (
                <circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  fill={index === safeHoveredIndex ? "white" : lineColor}
                  r={index === safeHoveredIndex ? "2.2" : "1.2"}
                  stroke={lineColor}
                  strokeWidth={index === safeHoveredIndex ? "1.6" : "0"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`
              }}
            >
              {points.map((point, index) => (
                <button
                  key={`${point.label}-hover-${index}`}
                  aria-label={`${point.label}: ${valueFormatter(point.value)}`}
                  className="h-full cursor-crosshair bg-transparent"
                  onBlur={() => setHoveredIndex(points.length - 1)}
                  onFocus={() => setHoveredIndex(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(points.length - 1)}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="relative mt-2 h-4 text-[0.54rem] font-medium text-slate-500">
            {xTickIndices.map((index, tickOrder) => {
              const isFirst = tickOrder === 0;
              const isLast = tickOrder === xTickIndices.length - 1;

              return (
                <span
                  key={`${points[index]?.label}-${index}`}
                  className={
                    isFirst
                      ? "absolute left-0 whitespace-nowrap text-left"
                      : isLast
                        ? "absolute right-0 whitespace-nowrap text-right"
                        : "absolute -translate-x-1/2 whitespace-nowrap text-center"
                  }
                  style={
                    isFirst || isLast
                      ? undefined
                      : { left: `${coordinates[index]?.x}%` }
                  }
                >
                  {points[index]?.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function HoverBarList({
  accentClass,
  items,
  widthBase,
  title
}: HoverBarListProps) {
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const activeItem = items[Math.min(hoveredIndex, items.length - 1)] ?? items[0];
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const widthReference = Math.max(widthBase ?? maxValue, 1);

  return (
    <div className="rounded-[24px] border border-slate-900/8 bg-slate-50/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-slate-500">
            {title}
          </p>
          <strong className="mt-1 block text-sm font-semibold text-slate-900">
            {activeItem.label}
          </strong>
        </div>
        <div className="text-right">
          <strong className="block text-sm font-semibold text-slate-900">
            {activeItem.valueLabel}
          </strong>
          <span className="text-[0.68rem] text-slate-500">{activeItem.helperText}</span>
        </div>
      </div>

      <div className="grid gap-2.5">
        {items.map((item, index) => {
          const isActive = index === hoveredIndex;

          return (
            <button
              key={`${item.label}-${index}`}
              className={
                isActive
                  ? "grid grid-cols-[minmax(84px,0.9fr)_1fr_auto] items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left shadow-sm ring-1 ring-slate-900/8"
                  : "grid grid-cols-[minmax(84px,0.9fr)_1fr_auto] items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/90"
              }
              onBlur={() => setHoveredIndex(0)}
              onFocus={() => setHoveredIndex(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              type="button"
            >
              <div className="min-w-0">
                <span className="block truncate text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[0.68rem] text-slate-500">
                  {item.helperText}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200/90">
                <div
                  className={`h-full rounded-full ${accentClass}`}
                  style={{
                    width: `${Math.max((item.value / widthReference) * 100, 10)}%`
                  }}
                />
              </div>

              <span className="text-[0.72rem] font-semibold text-slate-900">
                {item.valueLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard({ data }: DashboardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("clicks");
  const [metricRange, setMetricRange] = useState<RangeKey>("14d");
  const [bounceRange, setBounceRange] = useState<RangeKey>("14d");
  const [financeRange, setFinanceRange] = useState<RangeKey>("14d");
  const [journeyMetric, setJourneyMetric] = useState<JourneyMetricKey>("sessions");
  const [pageMetric, setPageMetric] = useState<PageMetricKey>("share");

  const currentMetric = data.metricCards[activeMetric];
  const metricTrend = slicePoints(currentMetric.trend, metricRange);
  const bounceTrend = slicePoints(data.bounceRateSeries, bounceRange);
  const revenueTrend = slicePoints(data.finance.revenue.trend, financeRange);
  const profitTrend = slicePoints(data.finance.profit.trend, financeRange);
  const metricPeak = peakPoint(metricTrend);
  const bouncePeak = peakPoint(bounceTrend);
  const revenuePeak = peakPoint(revenueTrend);
  const profitPeak = peakPoint(profitTrend);
  const totalExitSessions = sumValues(data.exitJourney);
  const selectedMetricDelta = calculateTrendLabel(metricTrend);
  const selectedBounceAverage = formatPercentValue(averageValue(bounceTrend));
  const selectedRevenueDelta = calculateTrendLabel(revenueTrend);
  const selectedProfitDelta = calculateTrendLabel(profitTrend);
  const selectedMargin =
    sumValues(revenueTrend) === 0
      ? "0.0% margin"
      : `${formatPercentValue((sumValues(profitTrend) / sumValues(revenueTrend)) * 100)} margin`;

  const journeyItems: HoverBarListItem[] = data.exitJourney.map((point) => {
    const shareValue = (point.value / Math.max(totalExitSessions, 1)) * 100;

    return {
      helperText:
        journeyMetric === "sessions"
          ? `${shareValue.toFixed(1)}% of all exits`
          : `${point.value} sessions`,
      label: point.label,
      value: journeyMetric === "sessions" ? point.value : shareValue,
      valueLabel:
        journeyMetric === "sessions"
          ? `${point.value} sessions`
          : `${shareValue.toFixed(1)}%`
    };
  });

  const pageItems: HoverBarListItem[] = data.topPages.map((page) => ({
    helperText:
      pageMetric === "visits"
        ? `${page.share}% of tracked page views`
        : `${page.visits.toLocaleString()} visits`,
    label: page.page,
    value: pageMetric === "visits" ? page.visits : page.share,
    valueLabel:
      pageMetric === "visits"
        ? `${page.visits.toLocaleString()}`
        : `${page.share}%`
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="grid gap-[18px] lg:grid-cols-3">
        <article className={panelClass}>
          <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 1</p>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-900">
                Clicks, Impressions, and CTR
              </h2>
            </div>

            <DashboardSelect
              ariaLabel="Metric zoom range"
              onChange={setMetricRange}
              options={rangeOptions}
              value={metricRange}
            />
          </div>

          <div
            className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="tablist"
            aria-label="Metric filter"
          >
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
                type="button"
              >
                <span className="block text-[0.66rem] font-bold uppercase tracking-[0.18em] opacity-70">
                  {metricLabels[metric]}
                </span>
                <span className="mt-1 block text-lg font-semibold tracking-[-0.03em]">
                  {data.metricCards[metric].total}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.88))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Selected Window · {formatRangeLabel(metricRange)}
                </p>
                <strong className="mt-1 block text-[clamp(1.8rem,3vw,2.5rem)] font-semibold tracking-[-0.05em] text-slate-900">
                  {formatMetricAggregate(activeMetric, metricTrend)}
                </strong>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-blue-500/12 px-3 py-2 text-[0.76rem] font-semibold text-blue-700">
                  {selectedMetricDelta}
                </span>
                <span className="inline-flex rounded-full bg-white/85 px-3 py-2 text-[0.76rem] font-semibold text-slate-700">
                  Peak {metricPeak.label}
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/75 px-4 py-3">
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Daily Average
                </p>
                <strong className="mt-1 block text-base font-semibold text-slate-900">
                  {formatMetricValue(activeMetric, averageValue(metricTrend))}
                </strong>
              </div>
              <div className="rounded-2xl bg-white/75 px-4 py-3">
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Peak Value
                </p>
                <strong className="mt-1 block text-base font-semibold text-slate-900">
                  {formatMetricValue(activeMetric, metricPeak.value)}
                </strong>
              </div>
            </div>
          </div>

          <TimeSeriesChart
            fillColor="#93c5fd"
            lineColor="#2563eb"
            points={metricTrend}
            valueFormatter={(value) => formatMetricValue(activeMetric, value)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[0.76rem] text-slate-500">
            <span>{formatRangeLabel(metricRange)}</span>
            <span>{currentMetric.context}</span>
          </div>
        </article>

        <article className={panelClass}>
          <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 2</p>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-900">
                Bounce Rate
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`${badgeClass} bg-teal-500/12 text-teal-700`}>
                {selectedBounceAverage}
              </span>
              <DashboardSelect
                ariaLabel="Bounce rate zoom range"
                onChange={setBounceRange}
                options={rangeOptions}
                value={bounceRange}
              />
            </div>
          </div>

          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Window Average · {formatRangeLabel(bounceRange)}
              </p>
              <strong className="mt-1 block text-base font-semibold text-slate-900">
                {formatPercentValue(averageValue(bounceTrend))}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Highest Day
              </p>
              <strong className="mt-1 block text-base font-semibold text-slate-900">
                {bouncePeak.label} · {formatPercentValue(bouncePeak.value)}
              </strong>
            </div>
          </div>

          <TimeSeriesChart
            fillColor="#fdba74"
            lineColor="#f97316"
            points={bounceTrend}
            valueFormatter={formatPercentValue}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[0.76rem] text-slate-500">
            <span>{formatRangeLabel(bounceRange)}</span>
            <span>Hover to inspect daily bounce rate</span>
          </div>
        </article>

        <article className={panelClass}>
          <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 3</p>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-900">
                Visit Depth Before Exit
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <DashboardSelect
                ariaLabel="Visit depth metric"
                onChange={setJourneyMetric}
                options={journeyMetricOptions}
                value={journeyMetric}
              />
              <DashboardSelect
                ariaLabel="Popular pages metric"
                onChange={setPageMetric}
                options={pageMetricOptions}
                value={pageMetric}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <HoverBarList
              accentClass="bg-gradient-to-r from-teal-600 to-cyan-400"
              items={pageItems}
              title="Top pages"
              widthBase={pageMetric === "share" ? 100 : undefined}
            />

            <HoverBarList
              accentClass="bg-gradient-to-r from-orange-500 to-amber-400"
              items={journeyItems}
              title="Exit depth"
              widthBase={journeyMetric === "sessions" ? totalExitSessions : 100}
            />
          </div>
        </article>
      </section>

      <section className="mx-auto mt-[18px] grid max-w-4xl gap-[18px] lg:grid-cols-2">
        <article className={`${panelClass} mx-auto w-full max-w-[25rem]`}>
          <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 4A</p>
              <h2 className="text-[1.22rem] font-semibold tracking-[-0.03em] text-slate-900">
                Revenue
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`${badgeClass} bg-emerald-500/12 text-emerald-700`}>
                {selectedRevenueDelta}
              </span>
              <DashboardSelect
                ariaLabel="Revenue zoom range"
                onChange={setFinanceRange}
                options={rangeOptions}
                value={financeRange}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-[22px] bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.9))] p-4">
            <div>
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Selected Revenue · {formatRangeLabel(financeRange)}
              </p>
              <strong className="mt-1 block text-[clamp(1.3rem,1.8vw,1.7rem)] font-semibold tracking-[-0.05em] text-slate-900">
                {currencyFormatter.format(sumValues(revenueTrend))}
              </strong>
            </div>
            <span className="inline-flex rounded-full bg-white/85 px-3 py-2 text-[0.76rem] font-semibold text-slate-700">
              Peak {revenuePeak.label}
            </span>
          </div>

          <TimeSeriesChart
            compact
            fillColor="#6ee7b7"
            lineColor="#059669"
            points={revenueTrend}
            valueFormatter={(value) => currencyFormatter.format(value)}
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Daily Average
              </p>
              <strong className="mt-1 block text-base font-semibold text-slate-900">
                {currencyFormatter.format(averageValue(revenueTrend))}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Peak Day
              </p>
              <strong className="mt-1 block text-base font-semibold text-slate-900">
                {currencyFormatter.format(revenuePeak.value)}
              </strong>
            </div>
          </div>
        </article>

        <article className={`${panelClass} mx-auto w-full max-w-[25rem]`}>
          <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={eyebrowClass}>Segment 4B</p>
              <h2 className="text-[1.22rem] font-semibold tracking-[-0.03em] text-slate-900">
                Profit
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`${badgeClass} bg-blue-500/10 text-blue-700`}>
                {selectedMargin}
              </span>
              <DashboardSelect
                ariaLabel="Profit zoom range"
                onChange={setFinanceRange}
                options={rangeOptions}
                value={financeRange}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.9))] p-4">
            <div>
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Selected Profit · {formatRangeLabel(financeRange)}
              </p>
              <strong className="mt-1 block text-[clamp(1.3rem,1.8vw,1.7rem)] font-semibold tracking-[-0.05em] text-slate-900">
                {currencyFormatter.format(sumValues(profitTrend))}
              </strong>
            </div>
            <span className="inline-flex rounded-full bg-white/85 px-3 py-2 text-[0.76rem] font-semibold text-slate-700">
              {selectedProfitDelta}
            </span>
          </div>

          <TimeSeriesChart
            compact
            fillColor="#93c5fd"
            lineColor="#2563eb"
            points={profitTrend}
            valueFormatter={(value) => currencyFormatter.format(value)}
          />

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Daily Average
              </p>
              <strong className="mt-1 block text-base font-semibold text-slate-900">
                {currencyFormatter.format(averageValue(profitTrend))}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                Peak Day
              </p>
              <strong className="mt-1 block text-base font-semibold text-slate-900">
                {currencyFormatter.format(profitPeak.value)}
              </strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
