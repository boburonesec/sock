import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { ExecutiveSummary } from "@/lib/api/dashboard";

type AttentionItem = ExecutiveSummary["attentionItems"][number];

const icons = {
  LOW: Info,
  MEDIUM: AlertTriangle,
  HIGH: CircleAlert,
};

const styles = {
  LOW: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-500",
};

export function AttentionNeeded({ items }: { items: AttentionItem[] }) {
  return (
    <InfoCard title="E’tibor kerak" description="Tizim qaytargan muhim holatlar">
      {items.length === 0 ? (
        <EmptyState
          title="E’tibor talab qiladigan holat yo‘q"
          description="Tizim attentionItems bo‘sh ro‘yxat qaytardi."
          className="min-h-40"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = icons[item.priority];

            return (
              <div key={item.id} className={`rounded-lg border p-3 ${styles[item.priority]}`}>
                <div className="flex gap-2">
                  <Icon size={18} className="shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs opacity-85">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </InfoCard>
  );
}
