export type MetricKey = "clicks" | "impressions" | "ctr";

type BaseEvent = {
  id: string;
  sessionId: string;
  timestamp: string;
};

export type ImpressionEvent = BaseEvent & {
  type: "impression";
  page: string;
  target: string;
  count: number;
};

export type ClickEvent = BaseEvent & {
  type: "click";
  page: string;
  target: string;
  count: number;
};

export type PageViewEvent = BaseEvent & {
  type: "page_view";
  page: string;
  sequence: number;
};

export type PurchaseEvent = BaseEvent & {
  type: "purchase";
  orderId: string;
  revenue: number;
  profit: number;
};

export type AnalyticsEvent =
  | ImpressionEvent
  | ClickEvent
  | PageViewEvent
  | PurchaseEvent;
