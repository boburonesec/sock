"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
} from "@/lib/api/settings";
import { cn } from "@/lib/utils";

function getShiftDuration(start: string, end: string) {
  if (!start || !end) return null;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  if (isNaN(h1) || isNaN(h2)) return null;

  let min1 = h1 * 60 + m1;
  let min2 = h2 * 60 + m2;
  
  if (min1 === min2) return null;

  let crossesMidnight = false;
  if (min2 < min1) {
    min2 += 24 * 60;
    crossesMidnight = true;
  }
  const diff = min2 - min1;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return { hours, mins, crossesMidnight };
}

export function WorkShiftsPage() {
  const shiftsQuery = useQuery({
    queryKey: queryKeys.settings.workShifts(),
    queryFn: settingsApi.getWorkShifts,
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
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShiftForm({ code, shift }: {
  code: "DAY" | "NIGHT";
  shift?: WorkShift;
}) {
  const queryClient = useQueryClient();
  const defaultName = shift?.name ?? (code === "DAY" ? "Kunduzgi smena" : "Kechki smena");
  const defaultStart = shift?.startTime ?? (code === "DAY" ? "08:00" : "20:00");
  const defaultEnd = shift?.endTime ?? (code === "DAY" ? "20:00" : "08:00");
  const defaultPremium = shift?.premiumPerPiece?.toString() ?? (code === "NIGHT" ? "10" : "0");

  const [name, setName] = useState(defaultName);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [premiumPerPiece, setPremiumPerPiece] = useState(defaultPremium);
  
  const [lastUpdatedAt, setLastUpdatedAt] = useState(shift?.updatedAt);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (shift?.updatedAt !== lastUpdatedAt) {
    setName(defaultName);
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setPremiumPerPiece(defaultPremium);
    setLastUpdatedAt(shift?.updatedAt);
  }

  const mutation = useMutation({
    mutationFn: settingsApi.upsertWorkShift,
    onSuccess: async () => {
      setSuccessMsg("Smena sozlamasi saqlandi.");
      setTimeout(() => setSuccessMsg(null), 3000);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.workShifts() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.overview() }),
      ]);
    },
  });

  const isSaving = mutation.isPending;
  const error = mutation.error instanceof Error ? mutation.error.message : null;

  const isDirty = 
    name !== defaultName || 
    startTime !== defaultStart || 
    endTime !== defaultEnd || 
    premiumPerPiece !== defaultPremium;

  const premiumNum = Number(premiumPerPiece);
  const invalid = !name.trim() || !startTime || !endTime || startTime === endTime 
    || premiumPerPiece.trim() === "" || isNaN(premiumNum) || !isFinite(premiumNum) || premiumNum < 0 
    || (code === "DAY" && premiumNum !== 0);
  
  const durationInfo = getShiftDuration(startTime, endTime);
  const durationText = durationInfo 
    ? `${durationInfo.hours} soat${durationInfo.mins > 0 ? ` ${durationInfo.mins} daqiqa` : ""}`
    : null;
  const isSameTime = startTime === endTime && startTime !== "";

  return (
    <form
      className={cn("flex flex-col space-y-4 rounded-2xl border bg-card p-4 sm:p-5 transition-colors", isDirty && "border-amber-500/50 ring-1 ring-amber-500/20")}
      onSubmit={(event) => {
        event.preventDefault();
        if (invalid || !isDirty) return;
        setSuccessMsg(null);
        mutation.mutate({ code, name: name.trim(), startTime, endTime, premiumPerPiece: premiumPerPiece.trim() });
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{code === "DAY" ? "Kunduzgi smena" : "Kechki smena"}</p>
        <h2 className="mt-1 text-lg font-semibold">{name || "Nomsiz smena"}</h2>
        {isSameTime ? (
          <p className="mt-1 text-sm text-rose-500 font-medium">Boshlanish va tugash vaqti bir xil bo&apos;la olmaydi</p>
        ) : durationInfo ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {durationText} {durationInfo.crossesMidnight ? <span className="text-amber-500 font-medium">(Keyingi kunga o&apos;tadi)</span> : null}
          </p>
        ) : null}
      </div>
      
      <div className="flex-1 space-y-4">
        <FormField htmlFor={`${code}-name`} label="Smena nomi" required>
          <Input id={`${code}-name`} value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField htmlFor={`${code}-start`} label="Boshlanish" required>
            <Input id={`${code}-start`} type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={isSaving} />
          </FormField>
          <FormField htmlFor={`${code}-end`} label="Tugash" required>
            <Input id={`${code}-end`} type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={isSaving} />
          </FormField>
        </div>
        <FormField htmlFor={`${code}-premium`} label="Dona uchun ustama (so‘m)" required>
          <Input id={`${code}-premium`} type="number" min="0" step="0.01" value={premiumPerPiece} onChange={(event) => setPremiumPerPiece(event.target.value)} disabled={isSaving || code === "DAY"} />
        </FormField>
        {code === "DAY" ? <p className="text-xs text-muted-foreground">Kunduzgi smenada ustama qo‘llanmaydi.</p> : null}
      </div>
      
      <div className="pt-2 mt-auto">
        {error ? <p role="alert" className="mb-3 text-sm text-rose-500">{error}</p> : null}
        {successMsg ? <p role="status" className="mb-3 text-sm text-emerald-500">{successMsg}</p> : null}
        <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || invalid || !isDirty}>
          {isSaving ? "Saqlanmoqda..." : isDirty ? "O'zgarishlarni saqlash" : "Saqlangan"}
        </Button>
      </div>
    </form>
  );
}
