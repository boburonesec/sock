import { ApiError } from "@/lib/api/client";
import type { TelegramLinkTokenCreated } from "@/lib/api/telegram";
import { Button } from "@/components/ui/button";

interface TelegramLinkCodeCardProps {
  targetName: string;
  linkToken: TelegramLinkTokenCreated | null;
  isGenerating: boolean;
  error: unknown;
  onGenerate: () => void;
}

export function TelegramLinkCodeCard({
  targetName,
  linkToken,
  isGenerating,
  error,
  onGenerate,
}: TelegramLinkCodeCardProps) {
  return (
    <section className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Telegram ulanish kodi</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {targetName} uchun Telegram botga ulanish kodi yaratiladi.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isGenerating}
          onClick={onGenerate}
        >
          {isGenerating ? "Kod yaratilmoqda..." : "Telegram kod yaratish"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {getErrorMessage(error)}
        </p>
      ) : null}

      {linkToken ? (
        <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/45 bg-emerald-950/70 p-4 text-emerald-50 shadow-inner shadow-black/20">
          <div>
            <p className="text-xs uppercase text-emerald-200">
              Kod faqat bir marta ko‘rsatiladi
            </p>
            <p className="mt-2 select-all break-all font-mono text-3xl font-bold text-emerald-50">
              {linkToken.code}
            </p>
          </div>
          <p className="text-sm text-emerald-100">
            Amal qilish muddati: {formatDateTime(linkToken.expiresAt)}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-100">
            <li>Oyna yopilganda kod qayta ko‘rinmaydi.</li>
            <li>Kodni faqat to‘g‘ri odamga yuboring.</li>
            <li>Kod 10 daqiqadan keyin yoki ishlatilgandan so‘ng yaroqsiz bo‘ladi.</li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message =
      typeof error.body === "object" &&
      error.body &&
      "message" in error.body
        ? (error.body as { message?: unknown }).message
        : null;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(", ");
    }
  }

  return error instanceof Error
    ? error.message
    : "Telegram kod yaratishda xatolik yuz berdi.";
}
