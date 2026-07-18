import { apiClient } from "./client";
import type { ApiCollection } from "./types";

export interface AppNotification { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string }
export const notificationsApi = {
  list: () => apiClient<ApiCollection<AppNotification>>("/notifications"),
  read: (id: string) => apiClient<{ data: { id: string; readAt: string } }>(`/notifications/${id}/read`, { method: "PATCH" }),
};
