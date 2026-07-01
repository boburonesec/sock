"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { InfoCard } from "@/components/cards/info-card";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import type { Client } from "@/lib/api/sales";
import { telegramApi, type TelegramLinkTokenCreated } from "@/lib/api/telegram";
import { TelegramLinkCodeCard } from "@/features/telegram/telegram-link-code-card";

interface ClientDetailsDrawerProps {
  client: Client | null;
  isArchiving: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
}

export function ClientDetailsDrawer({
  client,
  isArchiving,
  onOpenChange,
  onEdit,
  onArchive,
}: ClientDetailsDrawerProps) {
  const [linkToken, setLinkToken] = useState<TelegramLinkTokenCreated | null>(null);
  const createTelegramCode = useMutation({
    mutationFn: (clientId: string) => telegramApi.createClientLinkToken(clientId),
    onSuccess: (response) => {
      setLinkToken(response.data);
    },
  });

  useEffect(() => {
    setLinkToken(null);
    createTelegramCode.reset();
    // Reset when switching selected client so raw codes are not carried
    // between drawer sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  if (!client) return null;

  return (
    <Drawer
      open={Boolean(client)}
      onOpenChange={onOpenChange}
      title={client.name}
      description={`${client.phone ?? "Telefon ko‘rsatilmagan"} · ${client.address ?? "Manzil ko‘rsatilmagan"}`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onEdit(client)}>
            Tahrirlash
          </Button>
          <Button
            variant="outline"
            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
            disabled={isArchiving}
            onClick={() => onArchive(client)}
          >
            {isArchiving ? "Archive qilinmoqda..." : "Archive qilish"}
          </Button>
          <Button disabled>Buyurtma yaratish · Keyingi bosqich</Button>
          <Button disabled variant="outline">To‘lov qayd qilish · Keyingi bosqich</Button>
        </div>

        <TelegramLinkCodeCard
          targetName={client.name}
          linkToken={linkToken}
          isGenerating={createTelegramCode.isPending}
          error={createTelegramCode.error}
          onGenerate={() => {
            setLinkToken(null);
            createTelegramCode.mutate(client.id);
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Telefon">
            <p className="text-sm font-semibold">{client.phone ?? "Ko‘rsatilmagan"}</p>
          </InfoCard>
          <InfoCard title="Manzil">
            <p className="text-sm font-semibold">{client.address ?? "Ko‘rsatilmagan"}</p>
          </InfoCard>
        </div>

        <InfoCard title="Izohlar">
          <p className="text-sm text-muted-foreground">
            {client.notes ?? "Izoh mavjud emas."}
          </p>
        </InfoCard>

        <InfoCard title="Sotuv va qarzdorlik ma’lumoti">
          <p className="text-sm text-muted-foreground">
            Buyurtmalar, to‘lovlar va qarzdorlik alohida read API integratsiyasi
            bilan keyingi bosqichda ko‘rsatiladi.
          </p>
        </InfoCard>
      </div>
    </Drawer>
  );
}
