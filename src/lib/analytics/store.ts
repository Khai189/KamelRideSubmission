import { EventCollector } from "@/lib/analytics/collector";
import { generateMockEvents } from "@/lib/analytics/mock-data";
import type { AnalyticsEvent } from "@/lib/analytics/types";

const seedEvents = generateMockEvents();

export const analyticsStore = new EventCollector(seedEvents);

function createBaseEvent(payload: Record<string, unknown>) {
  if (
    typeof payload.type !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    return null;
  }

  return {
    id:
      typeof payload.id === "string"
        ? payload.id
        : `manual-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    sessionId: payload.sessionId,
    timestamp:
      typeof payload.timestamp === "string"
        ? payload.timestamp
        : new Date().toISOString(),
    type: payload.type
  };
}

export function createIncomingEvent(payload: Record<string, unknown>) {
  const baseEvent = createBaseEvent(payload);

  if (!baseEvent) {
    return null;
  }

  switch (baseEvent.type) {
    case "click":
      if (typeof payload.page !== "string" || typeof payload.target !== "string") {
        return null;
      }

      return {
        ...baseEvent,
        type: "click",
        page: payload.page,
        target: payload.target,
        count: typeof payload.count === "number" ? payload.count : 1
      } satisfies AnalyticsEvent;
    case "impression":
      if (typeof payload.page !== "string" || typeof payload.target !== "string") {
        return null;
      }

      return {
        ...baseEvent,
        type: "impression",
        page: payload.page,
        target: payload.target,
        count: typeof payload.count === "number" ? payload.count : 1
      } satisfies AnalyticsEvent;
    case "page_view":
      if (typeof payload.page !== "string") {
        return null;
      }

      return {
        ...baseEvent,
        type: "page_view",
        page: payload.page,
        sequence: typeof payload.sequence === "number" ? payload.sequence : 1
      } satisfies AnalyticsEvent;
    case "purchase":
      if (
        typeof payload.orderId !== "string" ||
        typeof payload.revenue !== "number" ||
        typeof payload.profit !== "number"
      ) {
        return null;
      }

      return {
        ...baseEvent,
        type: "purchase",
        orderId: payload.orderId,
        revenue: payload.revenue,
        profit: payload.profit
      } satisfies AnalyticsEvent;
    default:
      return null;
  }
}
