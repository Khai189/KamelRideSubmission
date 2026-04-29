import { NextResponse } from "next/server";
import { analyticsStore } from "@/lib/analytics/store";
import { createIncomingEvent } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = analyticsStore.all();

  return NextResponse.json({
    totalEvents: events.length,
    events: events.slice(-50)
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const event = createIncomingEvent(payload);

  if (!event) {
    return NextResponse.json(
      { error: "Invalid event payload." },
      { status: 400 }
    );
  }

  analyticsStore.track(event);

  return NextResponse.json({
    ok: true,
    totalEvents: analyticsStore.all().length
  });
}
