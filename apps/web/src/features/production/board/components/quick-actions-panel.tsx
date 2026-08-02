import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardPlus,
  Cog,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import { InfoCard } from "@/components/cards/info-card";
import { Button } from "@/components/ui/button";
import type { ProductionAction } from "./production-action-types";

const actions: {
  label: string;
  action: ProductionAction;
  icon: typeof Cog;
  /** warehouse.write required — physical ombor qabul */
  requiresWarehouseWrite?: boolean;
}[] = [
  {
    label: "Smena o‘tkazish (+ ishchilar)",
    action: "move-stage",
    icon: ArrowRightLeft,
  },
  {
    label: "Qo‘shimcha faollik kiritish",
    action: "add-activity",
    icon: ClipboardPlus,
  },
  {
    label: "Brak qayd qilish",
    action: "register-defect",
    icon: AlertTriangle,
  },
  {
    label: "Omborga qabul qilish",
    action: "receive-finished",
    icon: PackageCheck,
    requiresWarehouseWrite: true,
  },
];

interface QuickActionsPanelProps {
  onActionSelect: (action: ProductionAction) => void;
  /** If false, hide physical warehouse receipt (Shift Receiver has no warehouse.write). */
  canReceiveFinished?: boolean;
}

export function QuickActionsPanel({
  onActionSelect,
  canReceiveFinished = false,
}: QuickActionsPanelProps) {
  const visibleActions = actions.filter(
    (item) => !item.requiresWarehouseWrite || canReceiveFinished,
  );

  return (
    <InfoCard
      title="Tezkor amallar"
      description="Ishlab chiqarishdagi asosiy kiritish amallari"
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <Link
          href="/machines"
          className="inline-flex min-h-11 w-full items-center justify-start gap-2 rounded-lg border bg-transparent px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Cog size={18} className="shrink-0" />
          <span className="min-w-0 flex-1">Stanokda ishlab chiqarishni boshlash yoki mahsulotni qabul qilish</span>
        </Link>
        {visibleActions.map(({ label, action, icon: Icon }) => (
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
