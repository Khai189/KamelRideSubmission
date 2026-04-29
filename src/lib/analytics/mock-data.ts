import type { AnalyticsEvent } from "@/lib/analytics/types";

const pages = [
  "/",
  "/pricing",
  "/rides",
  "/fleet",
  "/enterprise",
  "/checkout",
  "/support"
];

const targets = [
  "hero-cta",
  "pricing-card",
  "navbar-link",
  "feature-tile",
  "checkout-button"
];

function createSeededRandom(seed: number) {
  let current = seed >>> 0;

  return () => {
    current = (1664525 * current + 1013904223) % 4294967296;
    return current / 4294967296;
  };
}

function choosePath(random: () => number) {
  const length = 1 + Math.floor(random() * 5);
  const path: string[] = ["/"];

  for (let index = 1; index < length; index += 1) {
    path.push(pages[1 + Math.floor(random() * (pages.length - 1))]);
  }

  return path;
}

function createId(prefix: string, index: number) {
  return `${prefix}-${index.toString().padStart(4, "0")}`;
}

export function generateMockEvents() {
  const random = createSeededRandom(42);
  const events: AnalyticsEvent[] = [];
  const today = new Date();
  let eventIndex = 1;
  let orderIndex = 1;

  for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - dayOffset);
    currentDate.setHours(8, 0, 0, 0);

    const sessionsForDay = 26 + Math.floor(random() * 12);

    for (let sessionIndex = 0; sessionIndex < sessionsForDay; sessionIndex += 1) {
      const sessionId = `session-${dayOffset}-${sessionIndex}`;
      const pagePath = choosePath(random);
      const minuteOffset = sessionIndex * 7 + Math.floor(random() * 6);
      const sessionStart = new Date(currentDate);
      sessionStart.setMinutes(sessionStart.getMinutes() + minuteOffset);

      pagePath.forEach((page, sequence) => {
        const viewedAt = new Date(sessionStart);
        viewedAt.setMinutes(viewedAt.getMinutes() + sequence * 2);

        events.push({
          id: createId("view", eventIndex += 1),
          type: "page_view",
          sessionId,
          timestamp: viewedAt.toISOString(),
          page,
          sequence: sequence + 1
        });

        const impressions = 8 + Math.floor(random() * 15);
        const clicks = Math.max(1, Math.floor(impressions * (0.18 + random() * 0.22)));

        events.push({
          id: createId("impression", eventIndex += 1),
          type: "impression",
          sessionId,
          timestamp: viewedAt.toISOString(),
          page,
          target: targets[Math.floor(random() * targets.length)],
          count: impressions
        });

        events.push({
          id: createId("click", eventIndex += 1),
          type: "click",
          sessionId,
          timestamp: viewedAt.toISOString(),
          page,
          target: targets[Math.floor(random() * targets.length)],
          count: clicks
        });
      });

      const converted =
        pagePath.includes("/checkout") ||
        (pagePath.length > 2 && random() > 0.58) ||
        (pagePath.length > 3 && random() > 0.35);

      if (converted) {
        const purchaseTime = new Date(sessionStart);
        purchaseTime.setMinutes(purchaseTime.getMinutes() + pagePath.length * 3);

        const revenue = 80 + Math.round(random() * 240);
        const margin = 0.26 + random() * 0.22;
        const profit = Math.round(revenue * margin);

        events.push({
          id: createId("purchase", eventIndex += 1),
          type: "purchase",
          sessionId,
          timestamp: purchaseTime.toISOString(),
          orderId: createId("order", orderIndex += 1),
          revenue,
          profit
        });
      }
    }
  }

  return events.sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
}
