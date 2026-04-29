import { Dashboard } from "@/components/dashboard";
import { analyticsStore } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const dashboardData = analyticsStore.summarize();

  return <Dashboard data={dashboardData} />;
}
