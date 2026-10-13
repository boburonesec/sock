import { MIN_REASON_LENGTH, correctionDomainLabel, type CorrectionRequest } from "@paypoq/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAccess } from "@/lib/access/use-access";
import { useCorrectionRequestsQuery, useResolveCorrectionRequest } from "@/lib/api/recovery";
import { routes } from "@/lib/routes";
import { Button, Segmented, TextField } from "@/shared/ui/controls";
import { AccessDenied, Badge, MutationError } from "@/shared/ui/feedback";
import { AreaGuard, QueryState } from "@/shared/ui/guard";
import { KeyValueList, ListRow } from "@/shared/ui/lists";
import { Screen } from "@/shared/ui/screen";
import { EmptyState } from "@/shared/ui/states";
import { formatDateTime } from "@/shared/utils/format";

type StatusFilter = "OPEN" | "RESOLVED";

export default function CorrectionQueueRoute() {
  return (
    <AreaGuard
      area="production"
      backTo={routes.production}
      endpoint="recoveryCorrectionRequests"
      title="Tuzatish so'rovlari"
    >
      <CorrectionQueue />
    </AreaGuard>
  );
}

function CorrectionQueue() {
  const access = useAccess();
  // Same rule as Web: the queue is for whoever can close a request.
  const canApproveProduction = access.permissions.includes("production.approve");
  const canApproveSupplier = access.permissions.includes("expense.approve");
  const canReview = canApproveProduction || canApproveSupplier;
  const query = useCorrectionRequestsQuery(canReview);
  const resolve = useResolveCorrectionRequest();
  const [filter, setFilter] = useState<StatusFilter>("OPEN");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (!canReview) {
    return (
      <Screen backTo={routes.production} title="Tuzatish so'rovlari">
        <AccessDenied reason="Tuzatish so'rovlarini ko'rib chiqish uchun tasdiqlash ruxsati kerak." />
      </Screen>
    );
  }

  const requests = (query.data ?? []).filter((item) => item.status === filter);

  // The API requires expense.approve for supplier payments, production.approve otherwise.
  function canResolve(item: CorrectionRequest) {
    return item.domain === "SUPPLIER_PAYMENT" ? canApproveSupplier : canApproveProduction;
  }

  async function submit(item: CorrectionRequest) {
    setResolvingId(item.id);
    try {
      const result = await resolve.submit({ id: item.id, resolutionNote: (notes[item.id] ?? "").trim() });
      if (result) {
        setNotes((current) => ({ ...current, [item.id]: "" }));
        setResolvingId(null);
      }
    } catch {
      // The API message is rendered from resolve.error next to this request.
    }
  }

  return (
    <Screen
      backTo={routes.production}
      eyebrow="Ishlab chiqarish"
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      subtitle="Asl yozuvlar o'zgarmaydi; tekshiruv natijasini izoh bilan yoping."
      title="Tuzatish so'rovlari"
    >
      <Segmented
        onChange={setFilter}
        options={[
          { value: "OPEN", label: "Ko'rib chiqilmoqda" },
          { value: "RESOLVED", label: "Yopilgan" },
        ]}
        value={filter}
      />

      <QueryState queries={[query]}>
        {requests.length === 0 ? (
          <EmptyState
            description={filter === "OPEN" ? "Ochiq so'rovlar yo'q." : "Yopilgan so'rovlar yo'q."}
            title="So'rovlar yo'q"
          />
        ) : null}

        {requests.map((item) => {
          const note = notes[item.id] ?? "";

          return (
            <ListRow
              badge={
                <Badge
                  label={item.status === "OPEN" ? "Ko'rib chiqilmoqda" : "Yopilgan"}
                  tone={item.status === "OPEN" ? "warning" : "success"}
                />
              }
              footer={
                <View style={styles.requestBody}>
                  <KeyValueList
                    items={[
                      ...item.source.details.filter((detail) => detail.label !== "Vaqt" && detail.label !== "Sana"),
                      { label: "Sabab", value: item.reason },
                      ...(item.resolutionNote
                        ? [
                            { label: "Natija", value: item.resolutionNote },
                            { label: "Yopgan", value: item.resolver?.name ?? "Noma'lum" },
                          ]
                        : []),
                    ]}
                  />
                  {item.status === "OPEN" && canResolve(item) ? (
                    <>
                      <TextField
                        label="Tekshiruv natijasi"
                        multiline
                        onChangeText={(text) => setNotes((current) => ({ ...current, [item.id]: text }))}
                        placeholder="Nima aniqlandi va nima qilindi?"
                        required
                        value={note}
                      />
                      {resolvingId === item.id ? <MutationError error={resolve.error} /> : null}
                      <Button
                        disabled={note.trim().length < MIN_REASON_LENGTH || resolve.isPending}
                        label="So'rovni yopish"
                        loading={resolve.isPending && resolvingId === item.id}
                        onPress={() => void submit(item)}
                      />
                    </>
                  ) : null}
                </View>
              }
              key={item.id}
              meta={`So'ragan: ${item.requester?.name ?? "Noma'lum"} · ${formatDateTime(item.requestedAt)}`}
              subtitle={item.source.title}
              title={correctionDomainLabel[item.domain]}
            />
          );
        })}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  requestBody: {
    gap: 12,
  },
});
