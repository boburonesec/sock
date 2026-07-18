"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/api/query-keys";
import {
  settingsApi,
  type WorkShift,
  type WorkShiftPayload,
} from "@/lib/api/settings";

export function WorkShiftsPage() {
  const queryClient = useQueryClient();
  const shiftsQuery = useQuery({
    queryKey: queryKeys.settings.workShifts(),
    queryFn: settingsApi.getWorkShifts,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: settingsApi.upsertWorkShift,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.workShifts() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.overview() }),
      ]);
      setFeedback("Smena sozlamasi saqlandi. Yangi faolliklarda shu qiymat ishlatiladi.");
    },
  });

  return (
    <div>
      <PageHeader
        title="Ish smenalari"
        description="Kunduzgi va kechki smena vaqti, kechki smena uchun dona ustamasi"
      />
      <p className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Ustama o‘zgarsa, faqat keyingi xodim faolliklariga ta’sir qiladi. Oldingi ish haqi snapshotlari o‘zgarmaydi.
      </p>
      {feedback ? <p role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{feedback}</p> : null}
      {shiftsQuery.isPending ? <LoadingState label="Smenalar yuklanmoqda..." /> : null}
      {shiftsQuery.error ? (
        <ErrorState
          title="Smenalar yuklanmadi"
          description={shiftsQuery.error instanceof Error ? shiftsQuery.error.message : "Xatolik yuz berdi."}
          action={<Button variant="outline" onClick={() => shiftsQuery.refetch()}>Qayta urinish</Button>}
        />
      ) : null}
      {!shiftsQuery.isPending && !shiftsQuery.error ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {(["DAY", "NIGHT"] as const).map((code) => (
            <ShiftForm
              key={code}
              code={code}
              shift={(shiftsQuery.data?.data ?? []).find((item) => item.code === code)}
              isSaving={mutation.isPending}
              error={mutation.error instanceof Error ? mutation.error.message : null}
              onSave={async (payload) => {
                setFeedback(null);
                await mutation.mutateAsync(payload);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShiftForm({ code, shift, isSaving, error, onSave }: {
  code: "DAY" | "NIGHT";
  shift?: WorkShift;
  isSaving: boolean;
  error: string | null;
  onSave: (payload: WorkShiftPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [premiumPerPiece, setPremiumPerPiece] = useState("0");
  useEffect(() => {
    setName(shift?.name ?? (code === "DAY" ? "Kunduzgi smena" : "Kechki smena"));
    setStartTime(shift?.startTime ?? (code === "DAY" ? "08:00" : "20:00"));
    setEndTime(shift?.endTime ?? (code === "DAY" ? "20:00" : "08:00"));
    setPremiumPerPiece(shift?.premiumPerPiece ?? (code === "NIGHT" ? "10" : "0"));
  }, [code, shift]);

  const invalid = !name.trim() || !startTime || !endTime || startTime === endTime || Number(premiumPerPiece) < 0;
  return (
    <form
      className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid) return;
        void onSave({ code, name: name.trim(), startTime, endTime, premiumPerPiece });
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{code === "DAY" ? "Kunduzgi" : "Kechki"}</p>
        <h2 className="mt-1 text-lg font-semibold">{shift?.name ?? "Smena sozlanmagan"}</h2>
      </div>
      <FormField htmlFor={`${code}-name`} label="Smena nomi" required><Input id={`${code}-name`} value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} /></FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField htmlFor={`${code}-start`} label="Boshlanish" required><Input id={`${code}-start`} type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={isSaving} /></FormField>
        <FormField htmlFor={`${code}-end`} label="Tugash" required><Input id={`${code}-end`} type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={isSaving} /></FormField>
      </div>
      <FormField htmlFor={`${code}-premium`} label="Dona uchun ustama (so‘m)" required>
        <Input id={`${code}-premium`} type="number" min="0" step="0.01" value={premiumPerPiece} onChange={(event) => setPremiumPerPiece(event.target.value)} disabled={isSaving || code === "DAY"} />
      </FormField>
      {code === "DAY" ? <p className="text-xs text-muted-foreground">Kunduzgi smenada ustama qo‘llanmaydi.</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
      <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || invalid}>{isSaving ? "Saqlanmoqda..." : "Saqlash"}</Button>
    </form>
  );
}
