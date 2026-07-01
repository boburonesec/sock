"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { settingsApi } from "@/lib/api/settings";

export function useSettingsOverview() {
  return useQuery({
    queryKey: queryKeys.settings.overview(),
    queryFn: settingsApi.getOverview,
  });
}
