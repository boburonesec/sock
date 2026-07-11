import { AlertTriangle, ArrowRightLeft, PackageCheck, Plus } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { Button } from "@/components/ui/button";
import type { ProductionAction } from "./production-action-types";

const actions: {
  label: string;
  action: ProductionAction;
  icon: typeof Plus;
  status: string;
}[] = [
  { label: "Partiya yaratish", action: "create-batch", icon: Plus, status: "ma’lumot" },
  {
    label: "Smena o‘tkazish (+ ishchilar)",
    action: "move-stage",
    icon: ArrowRightLeft,
    status: "ma’lumot",
  },
  {
    label: "Brak qayd qilish",
    action: "register-defect",
    icon: AlertTriangle,
    status: "ma’lumot",
  },
  {
    label: "Omborga qabul qilish",
    action: "receive-finished",
    icon: PackageCheck,
    status: "ma’lumot",
  },
];
interface QuickActionsPanelProps { onActionSelect: (action: ProductionAction) => void; }
export function QuickActionsPanel({ onActionSelect }: QuickActionsPanelProps) {
  return (
    <InfoCard
      title="Tezkor amallar"
      description="Ishlab chiqarishdagi asosiy kiritish amallari"
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map(({ label, action, icon: Icon }) => (
          <Button
            key={action}
            type="button"
            variant="outline"
            className="h-auto min-h-11 w-full justify-start whitespace-normal py-3 text-left"
            onClick={() => onActionSelect(action)}
          >
            <Icon size={18} className="shrink-0" />
            <span className="min-w-0 flex-1">{label}</span>
          </Button>
        ))}
      </div>
    </InfoCard>
  );
}
