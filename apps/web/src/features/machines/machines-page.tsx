"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { machinesApi } from "@/lib/api/machines";
import { productionApi, type ProductionRun } from "@/lib/api/production";
import { formatVisibleStatusText } from "@/lib/status-labels";
import { useAuthStore } from "@/stores/auth-store";

type MachineWorkflow =
  | "create-machine"
  | "assign-mechanic"
  | "start-run"
  | "piece-rate"
  | "maintenance-task"
  | "inspection-slots"
  | "measurement-spec";

export function MachinesPage() {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const canManageMachines = permissions.includes("machines.write");
  const canManageProduction = permissions.includes("production.write");
  const canAssignTasks =
    permissions.includes("maintenance.write") && !roles.includes("Mechanic");
  const canConfigureQuality =
    permissions.includes("quality.write") && !roles.includes("Mechanic");
  const machines = useQuery({
    queryKey: ["machines"],
    queryFn: machinesApi.list,
  });
  const lookups = useQuery({
    queryKey: ["machines", "lookups"],
    queryFn: machinesApi.lookups,
  });
  const variants = useQuery({
    queryKey: ["production", "variant-lookups"],
    queryFn: productionApi.getLookupProductVariants,
  });
  const runs = useQuery({
    queryKey: ["production", "runs"],
    queryFn: productionApi.getRuns,
  });
  const [machineForm, setMachineForm] = useState({ code: "", name: "" });
  const [assignment, setAssignment] = useState({
    machineId: "",
    mechanicId: "",
    workShiftId: "",
    validFrom: new Date().toISOString().slice(0, 16),
  });
  const [run, setRun] = useState({
    machineId: "",
    productVariantId: "",
    operatorEmployeeId: "",
    workShiftId: "",
  });
  const [rate, setRate] = useState<{
    productId: string;
    workRole: "MECHANIC" | "MACHINE_OPERATOR";
    amount: string;
  }>({ productId: "", workRole: "MECHANIC", amount: "" });
  const [task, setTask] = useState({
    machineId: "",
    assigneeMechanicId: "",
    type: "REPAIR",
    priority: "MEDIUM",
    description: "",
  });
  const [slot, setSlot] = useState({
    workShiftId: "",
    first: "0",
    second: "120",
    third: "240",
  });
  const [specProductId, setSpecProductId] = useState("");
  const [metrics, setMetrics] = useState([
    {
      code: "TOTAL_LENGTH",
      name: "Umumiy uzunlik",
      unit: "cm",
      target: "",
      min: "",
      max: "",
    },
  ]);
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [runToComplete, setRunToComplete] = useState<ProductionRun | null>(
    null,
  );
  const [success, setSuccess] = useState("");
  const [activeWorkflow, setActiveWorkflow] =
    useState<MachineWorkflow | null>(null);
  const inFlight = useRef(new Set<string>());
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["machines"] }),
      queryClient.invalidateQueries({ queryKey: ["production", "runs"] }),
    ]);
  };
  const submitOnce = async (
    key: string,
    action: () => Promise<unknown>,
    message: string,
    afterSuccess?: () => void,
  ) => {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setSuccess("");
    try {
      await action();
      await refresh();
      afterSuccess?.();
      setSuccess(message);
    } catch {
      /* mutation.error renders the API message */
    } finally {
      inFlight.current.delete(key);
    }
  };
  const createMachine = useMutation({ mutationFn: machinesApi.create });
  const assign = useMutation({ mutationFn: machinesApi.assign });
  const createRun = useMutation({ mutationFn: productionApi.createRun });
  const createIntakeMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      productionApi.createRunIntake(id, {
        quantity,
        idempotencyKey: crypto.randomUUID(),
      }),
  });
  const completeRunMutation = useMutation({
    mutationFn: (id: string) => productionApi.changeRunStatus(id, "COMPLETED"),
  });
  const createRate = useMutation({
    mutationFn: () =>
      machinesApi.createRate({
        productId: rate.productId,
        workRole: rate.workRole,
        amount: Number(rate.amount),
        effectiveFrom: new Date().toISOString(),
      }),
  });
  const createTask = useMutation({
    mutationFn: () => machinesApi.createTask(task),
  });
  const configureSlots = useMutation({
    mutationFn: () =>
      machinesApi.configureInspectionSlots({
        workShiftId: slot.workShiftId,
        slots: [slot.first, slot.second, slot.third].map((value, index) => ({
          slotNumber: index + 1,
          minuteOffset: Number(value),
        })),
      }),
  });
  const createSpecMutation = useMutation({
    mutationFn: async () => {
      const created = await machinesApi.createSpecification(
        specProductId,
        metrics.map((m, index) => ({
          ...m,
          target: Number(m.target),
          min: Number(m.min),
          max: Number(m.max),
          displayOrder: index + 1,
        })),
      );
      await machinesApi.activateSpecification(created.data.id);
    },
  });
  const createIntake = {
    ...createIntakeMutation,
    mutate: (payload: { id: string; quantity: number }) =>
      void submitOnce(
        `intake:${payload.id}`,
        () => createIntakeMutation.mutateAsync(payload),
        "Ishlab chiqarilgan mahsulot qabul qilindi.",
        () => setIntake((current) => ({ ...current, [payload.id]: "" })),
      ),
  };
  const completeRun = async (run: ProductionRun) => {
    await submitOnce(
      `complete-run:${run.id}`,
      () => completeRunMutation.mutateAsync(run.id),
      "Stanok ishi yakunlandi.",
      () => setRunToComplete(null),
    );
  };
  const createSpec = {
    ...createSpecMutation,
    mutate: () =>
      void submitOnce(
        "create-spec",
        () => createSpecMutation.mutateAsync(),
        "O‘lchov me’yorlari yaratildi va faollashtirildi.",
      ),
  };
  const mechanics = (lookups.data?.data.employees ?? []).filter(
    (e) => e.workProfile === "MECHANIC",
  );
  const operators = (lookups.data?.data.employees ?? []).filter(
    (e) => e.workProfile === "MACHINE_OPERATOR",
  );
  const error = [
    createMachine.error,
    assign.error,
    createRun.error,
    createIntake.error,
    createRate.error,
    createTask.error,
    configureSlots.error,
    createSpec.error,
  ].find(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stanok ishi"
        description="Stanok ishini boshlash va stanokdan chiqqan mahsulotni qabul qilish"
      />
      {success && (
        <p
          role="status"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      )}
      {error instanceof Error && (
        <p
          role="alert"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
        >
          {error.message}
        </p>
      )}
      {(canManageMachines || canManageProduction || canAssignTasks || canConfigureQuality) && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div>
            <h2 className="font-semibold">Qaysi ishni bajarmoqchisiz?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kerakli amalni tanlang. Bir vaqtda faqat bitta forma ochiladi.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              canManageMachines && ["create-machine", "Yangi stanok qo‘shish"],
              canManageMachines && ["assign-mechanic", "Mexanik biriktirish"],
              canManageProduction && ["start-run", "Stanok ishini boshlash"],
              canManageMachines && ["piece-rate", "Ishbay stavka belgilash"],
              canAssignTasks && ["maintenance-task", "Mexanikka vazifa berish"],
              canConfigureQuality && ["inspection-slots", "Tekshiruv vaqtlarini sozlash"],
              canConfigureQuality && ["measurement-spec", "O‘lchov me’yorlarini sozlash"],
            ]
              .filter((item): item is string[] => Boolean(item))
              .map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={activeWorkflow === value ? "default" : "outline"}
                  className="h-auto min-h-11 justify-start whitespace-normal py-3 text-left"
                  aria-pressed={activeWorkflow === value}
                  onClick={() =>
                    setActiveWorkflow((current) =>
                      current === value ? null : (value as MachineWorkflow),
                    )
                  }
                >
                  {label}
                </Button>
              ))}
          </div>
        </section>
      )}
      {(canManageMachines || canManageProduction) && (
        <section className="grid gap-4">
          {canManageMachines && activeWorkflow === "create-machine" && (
              <form
                className="space-y-3 rounded-xl border p-4"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void submitOnce(
                    "create-machine",
                    () => createMachine.mutateAsync(machineForm),
                    "Stanok muvaffaqiyatli qo‘shildi.",
                    () => setMachineForm({ code: "", name: "" }),
                  );
                }}
              >
                <h2 className="font-semibold">Stanok qo‘shish</h2>
                <p className="text-xs text-muted-foreground">Yangi stanokning zavoddagi kodi va nomini kiriting.</p>
                <p className="text-xs font-medium">Stanok kodi</p>
                <Input
                  aria-label="Stanok kodi"
                  placeholder="Stanok kodi, masalan ST-01"
                  value={machineForm.code}
                  onChange={(e) =>
                    setMachineForm({ ...machineForm, code: e.target.value })
                  }
                  required
                />
                <p className="text-xs font-medium">Stanok nomi</p>
                <Input
                  aria-label="Stanok nomi"
                  placeholder="Stanok nomi"
                  value={machineForm.name}
                  onChange={(e) =>
                    setMachineForm({ ...machineForm, name: e.target.value })
                  }
                  required
                />
                <Button className="w-full" disabled={createMachine.isPending}>
                  Saqlash
                </Button>
              </form>
          )}
          {canManageMachines && activeWorkflow === "assign-mechanic" && (
              <form
                className="space-y-3 rounded-xl border p-4"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void submitOnce(
                    "assign",
                    () =>
                      assign.mutateAsync({
                        ...assignment,
                        validFrom: new Date(assignment.validFrom).toISOString(),
                      }),
                    "Mexanik muvaffaqiyatli biriktirildi.",
                  );
                }}
              >
                <h2 className="font-semibold">Mexanik biriktirish</h2>
                <p className="text-xs text-muted-foreground">Qaysi mexanik qaysi stanok va smenaga mas’ul ekanini belgilang.</p>
                <p className="text-xs font-medium">Stanok</p>
                <Select
                  aria-label="Stanok"
                  value={assignment.machineId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, machineId: e.target.value })
                  }
                  required
                >
                  <option value="">Stanok</option>
                  {machines.data?.data.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} · {m.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs font-medium">Mas’ul mexanik</p>
                <Select
                  aria-label="Mas’ul mexanik"
                  value={assignment.mechanicId}
                  onChange={(e) =>
                    setAssignment({ ...assignment, mechanicId: e.target.value })
                  }
                  required
                >
                  <option value="">Mexanik</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs font-medium">Ish smenasi</p>
                <Select
                  aria-label="Ish smenasi"
                  value={assignment.workShiftId}
                  onChange={(e) =>
                    setAssignment({
                      ...assignment,
                      workShiftId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Smena</option>
                  {lookups.data?.data.shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs font-medium">Biriktirish boshlanadigan vaqt</p>
                <Input
                  aria-label="Biriktirish boshlanadigan vaqt"
                  type="datetime-local"
                  value={assignment.validFrom}
                  onChange={(e) =>
                    setAssignment({ ...assignment, validFrom: e.target.value })
                  }
                  required
                />
                <Button className="w-full" disabled={assign.isPending}>
                  Biriktirish
                </Button>
              </form>
          )}
          {canManageProduction && activeWorkflow === "start-run" && (
            <form
              className="space-y-3 rounded-xl border p-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void submitOnce(
                  "create-run",
                  () => createRun.mutateAsync(run),
                    "Stanokda ishlab chiqarish boshlandi.",
                );
              }}
            >
              <h2 className="font-semibold">Stanok ishini boshlash</h2>
              <p className="text-xs text-muted-foreground">Stanok, mahsulot, operator va smenani tanlang.</p>
              <p className="text-xs font-medium">Stanok</p>
              <Select
                aria-label="Stanok"
                value={run.machineId}
                onChange={(e) => setRun({ ...run, machineId: e.target.value })}
                required
              >
                <option value="">Stanok</option>
                {machines.data?.data.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code}
                  </option>
                ))}
              </Select>
              <p className="text-xs font-medium">Mahsulot turi</p>
              <Select
                aria-label="Mahsulot turi"
                value={run.productVariantId}
                onChange={(e) =>
                  setRun({ ...run, productVariantId: e.target.value })
                }
                required
              >
                <option value="">Mahsulot turini tanlang</option>
                {variants.data?.data.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs font-medium">Stanok operatori</p>
              <Select
                aria-label="Stanok operatori"
                value={run.operatorEmployeeId}
                onChange={(e) =>
                  setRun({ ...run, operatorEmployeeId: e.target.value })
                }
                required
              >
                <option value="">Operator</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs font-medium">Ish smenasi</p>
              <Select
                aria-label="Ish smenasi"
                value={run.workShiftId}
                onChange={(e) =>
                  setRun({ ...run, workShiftId: e.target.value })
                }
                required
              >
                <option value="">Smena</option>
                {lookups.data?.data.shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Button className="w-full" disabled={createRun.isPending}>
                Stanok ishini boshlash
              </Button>
            </form>
          )}
        </section>
      )}
      {(canManageMachines || canAssignTasks || canConfigureQuality) && (
        <section className="grid gap-4">
          {canManageMachines && activeWorkflow === "piece-rate" && (
            <form
              className="space-y-3 rounded-xl border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitOnce(
                  "create-rate",
                  () => createRate.mutateAsync(),
                  "Ishbay stavka saqlandi.",
                );
              }}
            >
              <h2 className="font-semibold">Model bo‘yicha ishbay stavka</h2>
              <p className="text-xs text-muted-foreground">Bir dona mahsulot uchun mexanik yoki operatorga to‘lanadigan haq.</p>
              <Select
                aria-label="Mahsulot modeli"
                value={rate.productId}
                onChange={(e) =>
                  setRate({ ...rate, productId: e.target.value })
                }
                required
              >
                <option value="">Mahsulot modeli</option>
                {lookups.data?.data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Ish turi"
                value={rate.workRole}
                onChange={(e) =>
                  setRate({
                    ...rate,
                    workRole: e.target.value as "MECHANIC" | "MACHINE_OPERATOR",
                  })
                }
              >
                <option value="MECHANIC">Mexanik</option>
                <option value="MACHINE_OPERATOR">Operator</option>
              </Select>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="so‘m/dona"
                aria-label="Bir dona uchun haq"
                value={rate.amount}
                onChange={(e) => setRate({ ...rate, amount: e.target.value })}
                required
              />
              <Button disabled={createRate.isPending}>Stavkani saqlash</Button>
            </form>
          )}
          {canAssignTasks && activeWorkflow === "maintenance-task" && (
            <form
              className="space-y-3 rounded-xl border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitOnce(
                  "create-task",
                  () => createTask.mutateAsync(),
                  "Mexanikka vazifa yuborildi.",
                  () => setTask({ ...task, description: "" }),
                );
              }}
            >
              <h2 className="font-semibold">Mexanikka vazifa</h2>
              <p className="text-xs text-muted-foreground">Stanokni tanlang, mas’ul mexanikni belgilang va vazifani yozing.</p>
              <Select
                aria-label="Stanok"
                value={task.machineId}
                onChange={(e) =>
                  setTask({ ...task, machineId: e.target.value })
                }
                required
              >
                <option value="">Stanok</option>
                {machines.data?.data.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Mas’ul mexanik"
                value={task.assigneeMechanicId}
                onChange={(e) =>
                  setTask({ ...task, assigneeMechanicId: e.target.value })
                }
                required
              >
                <option value="">Mexanik</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  aria-label="Vazifa turi"
                  value={task.type}
                  onChange={(e) => setTask({ ...task, type: e.target.value })}
                >
                  <option value="REPAIR">Ta’mirlash</option>
                  <option value="SETUP">Sozlash</option>
                  <option value="INSPECTION">Tekshiruv</option>
                  <option value="OTHER">Boshqa</option>
                </Select>
                <Select
                  aria-label="Vazifa muhimligi"
                  value={task.priority}
                  onChange={(e) =>
                    setTask({ ...task, priority: e.target.value })
                  }
                >
                  <option value="LOW">Past</option>
                  <option value="MEDIUM">O‘rta</option>
                  <option value="HIGH">Yuqori</option>
                  <option value="URGENT">Shoshilinch</option>
                </Select>
              </div>
              <Input
                aria-label="Vazifa tavsifi"
                placeholder="Vazifa tavsifi"
                value={task.description}
                onChange={(e) =>
                  setTask({ ...task, description: e.target.value })
                }
                required
              />
              <Button disabled={createTask.isPending}>Vazifani yuborish</Button>
            </form>
          )}
          {canConfigureQuality && activeWorkflow === "inspection-slots" && (
            <>
              <form
                className="space-y-3 rounded-xl border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitOnce(
                    "configure-slots",
                    async () => {
                      const result = await configureSlots.mutateAsync();
                      const values = result.data.map((item) =>
                        String(item.minuteOffset),
                      );
                      setSlot({
                        workShiftId: slot.workShiftId,
                        first: values[0],
                        second: values[1],
                        third: values[2],
                      });
                    },
                    "Smenadagi uchta tekshiruv vaqti saqlandi.",
                  );
                }}
              >
                <h2 className="font-semibold">Smenadagi tekshiruv vaqtlari</h2>
                <Select
                  aria-label="Ish smenasi"
                  value={slot.workShiftId}
                  onChange={(e) => {
                    const shift = lookups.data?.data.shifts.find(
                      (item) => item.id === e.target.value,
                    );
                    const values = shift?.inspectionSlots.map((item) =>
                      String(item.minuteOffset),
                    );
                    setSlot({
                      workShiftId: e.target.value,
                      first: values?.[0] ?? "0",
                      second: values?.[1] ?? "120",
                      third: values?.[2] ?? "240",
                    });
                  }}
                  required
                >
                  <option value="">Smena</option>
                  {lookups.data?.data.shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Smena boshlanganidan necha daqiqa keyin tekshirilishini kiriting.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["first", "second", "third"] as const).map((key, index) => (
                    <Input
                      key={key}
                      type="number"
                      min={0}
                      required
                      aria-label={`${index + 1}-tekshiruv vaqti`}
                      value={slot[key]}
                      onChange={(e) =>
                        setSlot({ ...slot, [key]: e.target.value })
                      }
                    />
                  ))}
                </div>
                <Button disabled={configureSlots.isPending}>
                  Tekshiruv vaqtlarini saqlash
                </Button>
              </form>
            </>
          )}
          {canConfigureQuality && activeWorkflow === "measurement-spec" && (
            <>
              <form
                className="space-y-3 rounded-xl border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createSpec.mutate();
                }}
              >
                <h2 className="font-semibold">Mahsulot o‘lchov me’yorlari</h2>
                <p className="text-xs text-muted-foreground">Sifat tekshiruvida o‘lchanadigan qiymatlar va ruxsat etilgan chegaralar.</p>
                <Select
                  aria-label="Mahsulot modeli"
                  value={specProductId}
                  onChange={(e) => setSpecProductId(e.target.value)}
                  required
                >
                  <option value="">Mahsulot modeli</option>
                  {lookups.data?.data.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                {metrics.map((metric, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border p-2 sm:grid-cols-3"
                  >
                    <Input
                      aria-label={`O‘lchov ${index + 1} kodi`}
                      placeholder="Kod"
                      value={metric.code}
                      onChange={(e) =>
                        setMetrics(
                          metrics.map((m, i) =>
                            i === index ? { ...m, code: e.target.value } : m,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`O‘lchov ${index + 1} nomi`}
                      placeholder="Nomi"
                      value={metric.name}
                      onChange={(e) =>
                        setMetrics(
                          metrics.map((m, i) =>
                            i === index ? { ...m, name: e.target.value } : m,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`O‘lchov ${index + 1} birligi`}
                      placeholder="Birlik"
                      value={metric.unit}
                      onChange={(e) =>
                        setMetrics(
                          metrics.map((m, i) =>
                            i === index ? { ...m, unit: e.target.value } : m,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Eng kam"
                      aria-label="Eng kam qiymat"
                      value={metric.min}
                      onChange={(e) =>
                        setMetrics(
                          metrics.map((m, i) =>
                            i === index ? { ...m, min: e.target.value } : m,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Maqsad"
                      aria-label="Maqsad qiymat"
                      value={metric.target}
                      onChange={(e) =>
                        setMetrics(
                          metrics.map((m, i) =>
                            i === index ? { ...m, target: e.target.value } : m,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Eng ko‘p"
                      aria-label="Eng ko‘p qiymat"
                      value={metric.max}
                      onChange={(e) =>
                        setMetrics(
                          metrics.map((m, i) =>
                            i === index ? { ...m, max: e.target.value } : m,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={createSpec.isPending}
                    onClick={() =>
                      setMetrics([
                        ...metrics,
                        {
                          code: "",
                          name: "",
                          unit: "cm",
                          target: "",
                          min: "",
                          max: "",
                        },
                      ])
                    }
                  >
                    O‘lchov qo‘shish
                  </Button>
                  <Button disabled={createSpec.isPending}>
                    Me’yorlarni yaratish va faollashtirish
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      )}
      <section id="machine-output" className="scroll-mt-20 space-y-3">
        <h2 className="text-lg font-semibold">
          {canManageProduction
            ? "Stanokdan chiqqan mahsulotni qabul qilish"
            : "Faol stanok ishlari"}
        </h2>
        {(runs.data?.data ?? []).filter((r) =>
          ["RUNNING", "HOLD"].includes(r.status),
        ).length === 0 && (
          <EmptyState
            title="Faol stanok ishi yo‘q"
            description="Stanok ishga tushirilgach, u shu yerda ko‘rinadi."
          />
        )}
        {(runs.data?.data ?? [])
          .filter((r) => ["RUNNING", "HOLD"].includes(r.status))
          .map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.machine.code} · {r.productVariant.product.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Operator: {r.operator.name} · Mexanik: {r.mechanic.name} · {formatVisibleStatusText(r.status)}
                </p>
              </div>
              {canManageProduction && (
                <>
                  <Input
                    className="w-full sm:w-32"
                    type="number"
                    min={1}
                    disabled={createIntake.isPending}
                    aria-label="Stanokdan chiqqan mahsulot soni"
                    placeholder="Chiqqan dona"
                    value={intake[r.id] ?? ""}
                    onChange={(e) =>
                      setIntake({ ...intake, [r.id]: e.target.value })
                    }
                  />
                  <Button
                    className="w-full sm:w-auto"
                    disabled={r.status !== "RUNNING" || createIntake.isPending}
                    onClick={() =>
                      createIntake.mutate({
                        id: r.id,
                        quantity: Number(intake[r.id]),
                      })
                    }
                  >
                    Chiqqan mahsulotni qabul qilish
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-rose-500/40 text-rose-300 hover:bg-rose-500/10 sm:w-auto"
                    disabled={r.status !== "RUNNING" || completeRunMutation.isPending}
                    onClick={() => setRunToComplete(r)}
                  >
                    Ishni yakunlash
                  </Button>
                </>
              )}
            </div>
          ))}
      </section>
      <ConfirmDialog
        open={Boolean(runToComplete)}
        onOpenChange={(open) => {
          if (!open) setRunToComplete(null);
        }}
        title="Stanok ishini yakunlaysizmi?"
        description={
          runToComplete
            ? `${runToComplete.machine.code} uchun ishlab chiqarish jarayoni yakunlangan deb belgilanadi. Bu amalni ortga qaytarib bo‘lmaydi — yakunlangandan so‘ng bu run uchun yangi mahsulot qabul qilib bo‘lmaydi.`
            : ""
        }
        confirmLabel="Ha, ishni yakunlash"
        destructive
        isPending={completeRunMutation.isPending}
        errorMessage={
          completeRunMutation.error instanceof Error
            ? completeRunMutation.error.message
            : null
        }
        onConfirm={() => {
          if (!runToComplete) return;
          return completeRun(runToComplete);
        }}
      />
    </div>
  );
}
