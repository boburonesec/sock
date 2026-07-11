import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/overlays/drawer";
import { InfoCard } from "@/components/cards/info-card";
import type { MaterialStock } from "@/lib/api/warehouse";

interface MaterialDetailsDrawerProps {
  material: MaterialStock | null;
  onReceive: () => void;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MaterialDetailsDrawer({
  material,
  onReceive,
  onOpenChange,
}: MaterialDetailsDrawerProps) {
  if (!material) return null;

  return (
    <Drawer
      open={Boolean(material)}
      onOpenChange={onOpenChange}
      title={material.material.name}
      description={`${material.warehouse.name} · ${material.zone.name}`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button onClick={onReceive}>Material qabul qilish</Button>
          <Link
            href="/settings/thresholds"
            className="inline-flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold hover:bg-muted"
          >
            Minimal limit sozlash
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard title="Joriy qoldiq">
            <p className="text-xl font-bold">
              {material.quantity} {material.unit}
            </p>
          </InfoCard>
          <InfoCard title="Minimal limit">
            <p className="text-xl font-bold">Mavjud emas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bu bo‘lim hozircha minimal limitni ko‘rsatmaydi.
            </p>
          </InfoCard>
          <InfoCard title="Holat">
            <p className="text-xl font-bold">Mavjud emas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Past qoldiq holati ekranda hisoblanmaydi.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Qoldiq ma’lumoti">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Ombor: {material.warehouse.name}</p>
            <p>Zona: {material.zone.name}</p>
            <p>Oxirgi yangilanish: {formatDate(material.updatedAt)}</p>
          </div>
        </InfoCard>
      </div>
    </Drawer>
  );
}
