import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Opt-in responsive wrapper: renders `children` (an existing `<DataTable>`
 * tree, unchanged) at `sm:` and up, and a mobile-native card list below that
 * breakpoint. Nothing here touches `DataTable` itself or any of its other
 * consumers — a screen only gets the card list if it explicitly renders
 * `ResponsiveDataList`, so migrating one list never affects another.
 *
 * A mobile card is not a table row turned vertical: `renderCard` is left to
 * the caller precisely so each screen can choose its own scan-first
 * information hierarchy instead of dumping every column into the card.
 */
interface ResponsiveDataListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  /** Desktop table — typically a `<DataTable>` tree, rendered unchanged at `sm:` and up. */
  children: React.ReactNode;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ResponsiveDataList<T>({
  items,
  getKey,
  renderCard,
  children,
  ariaLabel,
  emptyTitle = "Ma’lumot topilmadi",
  emptyDescription = "Ko‘rsatish uchun yozuv mavjud emas.",
}: ResponsiveDataListProps<T>) {
  return (
    <div className="w-full min-w-0">
      <div className="hidden sm:block">{children}</div>
      <div className="sm:hidden">
        {items.length > 0 ? (
          <ul className={cn("space-y-2")} aria-label={ariaLabel}>
            {items.map((item) => (
              <li key={getKey(item)}>{renderCard(item)}</li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Inbox className="mx-auto text-muted-foreground" size={24} />
            <p className="mt-3 font-medium">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
}
