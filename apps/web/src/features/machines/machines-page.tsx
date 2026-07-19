"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { machinesApi } from "@/lib/api/machines";
import { productionApi } from "@/lib/api/production";
import { useAuthStore } from "@/stores/auth-store";

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
  const [success, setSuccess] = useState("");
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
        "Run outputi qabul qilindi.",
        () => setIntake((current) => ({ ...current, [payload.id]: "" })),
      ),
  };
  const createSpec = {
    ...createSpecMutation,
    mutate: () =>
      void submitOnce(
        "create-spec",
        () => createSpecMutation.mutateAsync(),
        "O‘lchov specificationi yaratildi va aktivlandi.",
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
        title="Stanoklar va ishlab chiqarish runlari"
        description="Stanok, mexanik assignment va qabul qilinadigan outputning yagona ish maydoni"
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
      {(canManageMachines || canManageProduction) && (
        <section className="grid gap-4 lg:grid-cols-3">
          {canManageMachines && (
            <>
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
                <Input
                  placeholder="Kod: ST-01"
                  value={machineForm.code}
                  onChange={(e) =>
                    setMachineForm({ ...machineForm, code: e.target.value })
                  }
                  required
                />
                <Input
                  placeholder="Nomi"
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
                <Select
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
                <Select
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
                <Select
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
                <Input
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
            </>
          )}
          {canManageProduction && (
            <form
              className="space-y-3 rounded-xl border p-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void submitOnce(
                  "create-run",
                  () => createRun.mutateAsync(run),
                  "Production run muvaffaqiyatli boshlandi.",
                );
              }}
            >
              <h2 className="font-semibold">Production run boshlash</h2>
              <Select
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
              <Select
                value={run.productVariantId}
                onChange={(e) =>
                  setRun({ ...run, productVariantId: e.target.value })
                }
                required
              >
                <option value="">Mahsulot varianti</option>
                {variants.data?.data.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Select
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
              <Select
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
                Runni boshlash
              </Button>
            </form>
          )}
        </section>
      )}
      {(canManageMachines || canAssignTasks || canConfigureQuality) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {canManageMachines && (
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
              <Select
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
                value={rate.amount}
                onChange={(e) => setRate({ ...rate, amount: e.target.value })}
                required
              />
              <Button disabled={createRate.isPending}>Stavkani saqlash</Button>
            </form>
          )}
          {canAssignTasks && (
            <form
              className="space-y-3 rounded-xl border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitOnce(
                  "create-task",
                  () => createTask.mutateAsync(),
                  "Mexanikka task yuborildi.",
                  () => setTask({ ...task, description: "" }),
                );
              }}
            >
              <h2 className="font-semibold">Mexanikka task</h2>
              <Select
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
                  value={task.type}
                  onChange={(e) => setTask({ ...task, type: e.target.value })}
                >
                  <option value="REPAIR">Ta’mirlash</option>
                  <option value="SETUP">Sozlash</option>
                  <option value="INSPECTION">Tekshiruv</option>
                  <option value="OTHER">Boshqa</option>
                </Select>
                <Select
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
                placeholder="Vazifa tavsifi"
                value={task.description}
                onChange={(e) =>
                  setTask({ ...task, description: e.target.value })
                }
                required
              />
              <Button disabled={createTask.isPending}>Task berish</Button>
            </form>
          )}
          {canConfigureQuality && (
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
                    "3 ta inspection slot atomik saqlandi.",
                  );
                }}
              >
                <h2 className="font-semibold">Smenadagi 3 inspection slot</h2>
                <Select
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
                  Smena boshlanishidan keyingi daqiqalar
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["first", "second", "third"] as const).map((key, index) => (
                    <Input
                      key={key}
                      type="number"
                      min={0}
                      required
                      aria-label={`${index + 1}-slot`}
                      value={slot[key]}
                      onChange={(e) =>
                        setSlot({ ...slot, [key]: e.target.value })
                      }
                    />
                  ))}
                </div>
                <Button disabled={configureSlots.isPending}>
                  3 slotni saqlash
                </Button>
              </form>
              <form
                className="space-y-3 rounded-xl border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createSpec.mutate();
                }}
              >
                <h2 className="font-semibold">Model o‘lchov specificationi</h2>
                <Select
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
                      placeholder="Min"
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
                      placeholder="Target"
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
                      placeholder="Max"
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
                    Metrika qo‘shish
                  </Button>
                  <Button disabled={createSpec.isPending}>
                    Draft yaratib aktivlash
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Faol runlar{canManageProduction ? " va output qabuli" : ""}
        </h2>
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
                  {r.operator.name} / {r.mechanic.name} · {r.status}
                </p>
              </div>
              {canManageProduction && (
                <>
                  <Input
                    className="w-full sm:w-32"
                    type="number"
                    min={1}
                    disabled={createIntake.isPending}
                    placeholder="Dona"
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
                    Qabul qilish
                  </Button>
                </>
              )}
            </div>
          ))}
      </section>
    </div>
  );
}
