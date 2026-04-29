import { buildDashboardData } from "@/lib/analytics/dashboard";
import type { AnalyticsEvent } from "@/lib/analytics/types";

export class EventCollector {
  private events: AnalyticsEvent[];

  constructor(seedEvents: AnalyticsEvent[] = []) {
    this.events = [...seedEvents];
  }

  track(event: AnalyticsEvent) {
    this.events.push(event);
  }

  trackMany(events: AnalyticsEvent[]) {
    this.events.push(...events);
  }

  all() {
    return [...this.events].sort(
      (left, right) =>
        new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
    );
  }

  summarize() {
    return buildDashboardData(this.all());
  }
}
