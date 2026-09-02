import { Suspense } from "react";
import { TvDashboard } from "@/features/tv/tv-dashboard";

export default function FactoryTvPage() {
  // TvDashboard reads the per-factory token via useSearchParams(), which
  // Next.js requires a Suspense boundary for during static generation.
  return (
    <Suspense>
      <TvDashboard />
    </Suspense>
  );
}
