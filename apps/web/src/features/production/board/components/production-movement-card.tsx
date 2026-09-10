import type { StageMovement } from "@/lib/api/production";
import { formatNumber } from "@/lib/utils";
import { formatDateTimeForUser } from "@/lib/format";
import { CorrectionRequestButton } from "./correction-request-panel";

/**
 * Mobile card for one stage-to-stage production movement — a history/event
 * record, not an editable entity (matches the desktop table: no row
 * click). Source → destination direction and quantity lead (what moved,
 * how much), product/team/who-recorded-it follow as supporting context.
 *
 * `canRequestProductionCorrection` is passed straight through from
 * `ProductionBoard`'s own single permission check, exactly like the
 * desktop table's conditional "Amal" column — no RBAC condition is
 * re-derived here, so desktop and mobile cannot drift.
 */
export function ProductionMovementCard({
  movement,
  canRequestProductionCorrection,
}: {
  movement: StageMovement;
  canRequestProductionCorrection: boolean;
}) {
  const team =
    movement.productionBatch?.mechanic && movement.productionBatch.machineOperator
      ? `Mexanik: ${movement.productionBatch.mechanic.name} · Operator: ${movement.productionBatch.machineOperator.name}`
      : null;

  return (
    <div className="min-h-[44px] space-y-2 rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-semibold">
          {movement.sourceStage.name} → {movement.destinationStage.name}
        </span>
        <span className="shrink-0 text-base font-semibold">{formatNumber(movement.quantity)} dona</span>
      </div>
      <p className="truncate text-sm text-muted-foreground">
        {movement.productVariant.product.name} · {movement.productVariant.color.name}
      </p>
      {team ? <p className="text-xs text-muted-foreground">{team}</p> : null}
      <p className="text-xs text-muted-foreground">
        {movement.recordedBy.name} · {formatDateTimeForUser(new Date(movement.occurredAt))}
      </p>
      {canRequestProductionCorrection ? (
        <div className="pt-1">
          <CorrectionRequestButton
            domain="PRODUCTION_MOVEMENT"
            sourceRecordId={movement.id}
            title={`${movement.sourceStage.name} → ${movement.destinationStage.name}`}
            details={[
              {
                label: "Mahsulot",
                value: `${movement.productVariant.product.name} · ${movement.productVariant.color.name}`,
              },
              { label: "Miqdor", value: `${movement.quantity} dona` },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
