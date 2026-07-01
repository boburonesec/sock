import { AlertTriangle, ArrowRightLeft, ClipboardPlus, PackageCheck, Plus } from "lucide-react";
import { InfoCard } from "@/components/cards/info-card";
import { Button } from "@/components/ui/button";
import type { ProductionAction } from "./production-action-types";

const actions: {
  label: string;
  action: ProductionAction;
  icon: typeof Plus;
  status: string;
}[] = [
  { label: "Partiya yaratish", action: "create-batch", icon: Plus, status: "API" },
  {
    label: "Bosqichga o‘tkazish",
    action: "move-stage",
    icon: ArrowRightLeft,
    status: "API",
  },
  {
    label: "Ishchi faolligi qo‘shish",
    action: "add-activity",
    icon: ClipboardPlus,
    status: "API",
  },
  {
    label: "Brak qayd qilish",
    action: "register-defect",
    icon: AlertTriangle,
    status: "API",
  },
  {
    label: "Omborga qabul qilish",
    action: "receive-finished",
    icon: PackageCheck,
    status: "API",
  },
];
interface QuickActionsPanelProps { onActionSelect: (action: ProductionAction) => void; }
export function QuickActionsPanel({ onActionSelect }: QuickActionsPanelProps) { return <InfoCard title="Tezkor amallar" description="Production asosiy write flowlari real APIga ulangan"><div className="space-y-2">{actions.map(({ label, action, icon: Icon, status }) => <Button key={action} variant="outline" className="w-full justify-start" onClick={() => onActionSelect(action)}><Icon size={18}/>{label}<span className="ml-auto text-xs font-normal text-muted-foreground">{status}</span></Button>)}</div></InfoCard>; }
