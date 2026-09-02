"use client";

import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { employeesApi, employeeWorkProfileLabels } from "@/lib/api/employees";
import {
  organizationApi,
  type OrganizationFactory,
  type OrganizationUser,
  type OrganizationUserRole,
} from "@/lib/api/organization";
import { useAuthStore } from "@/stores/auth-store";

const organizationKeys = {
  factories: ["organization", "factories"] as const,
  users: ["organization", "users"] as const,
};

const EMPTY_FACTORIES: OrganizationFactory[] = [];

type CompanyTab = "factories" | "users";

const accountRoleOptions: Array<{
  value: OrganizationUserRole;
  label: string;
  description: string;
  submitLabel: string;
}> = [
  {
    value: "Manager",
    label: "Menejer",
    description: "Operatsiyalarni keng boshqaradi",
    submitLabel: "Menejer qo‘shish",
  },
  {
    value: "Seller",
    label: "Sotuvchi",
    description: "Mijoz, buyurtma va to‘lovlarni yuritadi",
    submitLabel: "Sotuvchi qo‘shish",
  },
  {
    value: "Warehouse Operator",
    label: "Omborchi",
    description: "Ombor qoldiqlari va harakatlarini yuritadi",
    submitLabel: "Omborchi qo‘shish",
  },
  {
    value: "Shift Receiver",
    label: "Smena qabul qiluvchi",
    description: "Ishlab chiqarish va ishchi faolligini kiritadi",
    submitLabel: "Smena qabul qiluvchi qo‘shish",
  },
  {
    value: "Accountant",
    label: "Buxgalter",
    description: "Moliya, avans va ish haqini yuritadi",
    submitLabel: "Buxgalter qo‘shish",
  },
];

function formatStatus(status: string): string {
  if (status === "ACTIVE") return "Faol";
  if (status === "SUSPENDED") return "To‘xtatilgan";
  return status;
}

function formatRole(role: string): string {
  const labels: Record<string, string> = {
    Owner: "Korxona egasi",
    Manager: "Menejer",
    Accountant: "Buxgalter",
    Seller: "Sotuvchi",
    "Warehouse Operator": "Omborchi",
    "Shift Receiver": "Smena qabul qiluvchi",
  };

  return labels[role] ?? role;
}

export function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const roles = useAuthStore((state) => state.roles);
  const branchMode = useAuthStore((state) => state.branchMode);
  const isOwner = roles.includes("Owner");
  const isMultiBranch = branchMode === "MULTI";
  const [activeTab, setActiveTab] = useState<CompanyTab>("users");
  const [factoryDrawerOpen, setFactoryDrawerOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [factoryForm, setFactoryForm] = useState({ name: "" });
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "Manager" as OrganizationUserRole,
    factoryId: "",
  });
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<string[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const factoriesQuery = useQuery({
    queryKey: organizationKeys.factories,
    queryFn: organizationApi.getFactories,
    enabled: isOwner,
  });

  const usersQuery = useQuery({
    queryKey: organizationKeys.users,
    queryFn: organizationApi.getUsers,
    enabled: isOwner,
  });
  const employeesQuery = useQuery({
    queryKey: ["employees", "account-reconciliation"],
    queryFn: employeesApi.getEmployees,
    enabled: isOwner,
  });

  const factories = factoriesQuery.data?.data ?? EMPTY_FACTORIES;
  const users = usersQuery.data?.data ?? [];
  const selectedFactory = useMemo(
    () => factories.find((factory) => factory.id === selectedFactoryId) ?? factories[0] ?? null,
    [factories, selectedFactoryId],
  );
  const selectedFactoryUsers = selectedFactory
    ? users.filter((user) => user.factories.some((factory) => factory.id === selectedFactory.id))
    : [];

  useEffect(() => {
    if (isMultiBranch && !selectedFactoryId && factories[0]?.id) {
      setSelectedFactoryId(factories[0].id);
    }
  }, [factories, isMultiBranch, selectedFactoryId]);

  useEffect(() => {
    if (isMultiBranch && !accountForm.factoryId && factories[0]?.id) {
      setAccountForm((current) => ({ ...current, factoryId: factories[0].id }));
    }
  }, [factories, isMultiBranch, accountForm.factoryId]);

  useEffect(() => {
    if (!isMultiBranch && activeTab === "factories") {
      setActiveTab("users");
    }
  }, [activeTab, isMultiBranch]);

  const invalidateOrganization = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationKeys.factories }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.users }),
    ]);
  };

  const createFactory = useMutation({
    mutationFn: () => organizationApi.createFactory({ name: factoryForm.name }),
    onSuccess: async (response) => {
      setFactoryForm({ name: "" });
      setFactoryDrawerOpen(false);
      setSelectedFactoryId(response.data.id);
      await invalidateOrganization();
    },
  });

  const selectedRoleOption =
    accountRoleOptions.find((option) => option.value === accountForm.roleName) ?? accountRoleOptions[0];

  const createAccount = useMutation({
    mutationFn: () =>
      organizationApi.createUser({
        name: accountForm.name,
        email: accountForm.email,
        password: accountForm.password,
        roleName: accountForm.roleName,
        factoryId: isMultiBranch ? accountForm.factoryId : undefined,
      }),
    onSuccess: async () => {
      setAccountForm((current) => ({
        name: "",
        email: "",
        password: "",
        roleName: current.roleName,
        factoryId: current.factoryId,
      }));
      setAccountDrawerOpen(false);
      await invalidateOrganization();
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => {
      if (!selectedUser) {
        throw new Error("Operator tanlanmagan.");
      }

      return organizationApi.updateUserPassword(selectedUser.id, {
        password: passwordForm.password,
      });
    },
    onSuccess: async () => {
      setPasswordForm({ password: "" });
      await invalidateOrganization();
    },
  });

  const updateFactoryAccess = useMutation({
    mutationFn: () => {
      if (!selectedUser) {
        throw new Error("Operator tanlanmagan.");
      }

      return organizationApi.updateUserFactoryAccess(selectedUser.id, {
        factoryIds: selectedFactoryIds,
      });
    },
    onSuccess: async (response) => {
      setSelectedUser(response.data);
      setSelectedFactoryIds(response.data.factories.map((factory) => factory.id));
      await invalidateOrganization();
    },
  });
  const linkEmployee = useMutation({
    mutationFn: () => {
      if (!selectedUser || !selectedEmployeeId) {
        throw new Error("User va xodim tanlanishi shart.");
      }
      return organizationApi.linkUserEmployee(selectedUser.id, selectedEmployeeId);
    },
    onSuccess: async (response) => {
      setSelectedUser((current) => current ? {
        ...current,
        employee: response.data.employee,
        employeeLinkStatus: "LINKED",
      } : current);
      await invalidateOrganization();
    },
  });

  function submitFactory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFactory.mutate();
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAccount.mutate();
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetPassword.mutate();
  }

  function submitFactoryAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFactoryAccess.mutate();
  }

  function openUser(user: OrganizationUser) {
    setSelectedUser(user);
    setPasswordForm({ password: "" });
    setSelectedFactoryIds(user.factories.map((factory) => factory.id));
    setSelectedEmployeeId(user.employee?.id ?? "");
    resetPassword.reset();
    updateFactoryAccess.reset();
    linkEmployee.reset();
  }

  if (!isOwner) {
    return (
      <ErrorState
        title="Ruxsat yo‘q"
        description="Korxona sozlamalarini faqat korxona egasi boshqara oladi."
      />
    );
  }

  if (factoriesQuery.isPending || usersQuery.isPending) {
    return <LoadingState label="Korxona sozlamalari yuklanmoqda..." />;
  }

  if (factoriesQuery.isError || usersQuery.isError) {
    return (
      <ErrorState
        title="Korxona sozlamalari yuklanmadi"
        description="Ma’lumotlarni olishda xatolik yuz berdi."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              factoriesQuery.refetch();
              usersQuery.refetch();
            }}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 rounded-xl border bg-card p-4 text-sm md:grid-cols-3">
        <div>
          <p className="font-semibold">Kichik sex</p>
          <p className="mt-1 text-muted-foreground">Korxona egasi o‘zi ishlashi mumkin, qo‘shimcha operator shart emas.</p>
        </div>
        <div>
          <p className="font-semibold">Operatsion boshqaruv</p>
          <p className="mt-1 text-muted-foreground">Kundalik ishlar uchun bitta Menejer operator qo‘shing.</p>
        </div>
        <div>
          <p className="font-semibold">Katta korxona</p>
          <p className="mt-1 text-muted-foreground">Sotuvchi, Omborchi, Smena qabul qiluvchi va Buxgalterni ajrating.</p>
        </div>
      </section>

      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        {isMultiBranch ? (
          <div className="inline-flex w-fit rounded-lg border bg-card p-1">
            <TabButton active={activeTab === "factories"} onClick={() => setActiveTab("factories")}>
              Filiallar
            </TabButton>
            <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
              Operatorlar
            </TabButton>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">Operatorlar</h2>
            <p className="text-sm text-muted-foreground">
              Dasturga kiradigan hisoblar (menejer, sotuvchi…). Ishbay ishchilar — «Xodimlar» bo‘limida.
            </p>
          </div>
        )}
        {isMultiBranch && activeTab === "factories" ? (
          <Button type="button" className="w-full sm:w-auto" onClick={() => setFactoryDrawerOpen(true)}>
            <Plus size={16} />
            Filial qo‘shish
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setAccountDrawerOpen(true)}
            disabled={isMultiBranch && factories.length === 0}
          >
            <Plus size={16} />
            Operator qo‘shish
          </Button>
        )}
      </div>

      {isMultiBranch && activeTab === "factories" ? (
        <FactoriesTab
          factories={factories}
          selectedFactory={selectedFactory}
          selectedFactoryUsers={selectedFactoryUsers}
          onSelectFactory={setSelectedFactoryId}
        />
      ) : (
        <UsersTab users={users} isMultiBranch={isMultiBranch} onOpenUser={openUser} />
      )}

      {isMultiBranch ? (
        <Drawer
        open={factoryDrawerOpen}
        onOpenChange={(open) => {
          setFactoryDrawerOpen(open);
          if (!open) {
            setFactoryForm({ name: "" });
            createFactory.reset();
          }
        }}
        title="Filial qo‘shish"
        description="Yangi filial uchun ombor va ishlab chiqarish bosqichlari avtomatik yaratiladi."
        >
          <form className="space-y-4" onSubmit={submitFactory}>
            <FormField htmlFor="factory-name" label="Filial nomi" required>
              <Input
                id="factory-name"
                placeholder="Masalan: Asosiy ishlab chiqarish"
                value={factoryForm.name}
                onChange={(event) => setFactoryForm({ name: event.target.value })}
              />
            </FormField>
            {createFactory.isError ? (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                Filial yaratilmadi. Nomni tekshiring.
              </p>
            ) : null}
            <Button
              className="w-full"
              type="submit"
              disabled={!factoryForm.name.trim() || createFactory.isPending}
            >
              {createFactory.isPending ? "Yaratilmoqda..." : "Filial yaratish"}
            </Button>
          </form>
        </Drawer>
      ) : null}

      <Drawer
        open={accountDrawerOpen}
        onOpenChange={(open) => {
          setAccountDrawerOpen(open);
          if (!open) {
            setAccountForm((current) => ({
              name: "",
              email: "",
              password: "",
              roleName: current.roleName,
              factoryId: current.factoryId,
            }));
            createAccount.reset();
          }
        }}
        title="Yangi operator ochish"
        description="Operator roli uning dasturda qaysi bo‘limlarda ishlashini belgilaydi. Ishbay ishchilar bu yerga kiritilmaydi."
      >
        <form className="space-y-4" onSubmit={submitAccount}>
          <FormField htmlFor="account-role" label="Rol" required>
            <select
              id="account-role"
              className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
              value={accountForm.roleName}
              onChange={(event) =>
                setAccountForm({
                  ...accountForm,
                  roleName: event.target.value as OrganizationUserRole,
                })
              }
            >
              {accountRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} — {role.description}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="account-name" label="Ism" required>
            <Input
              id="account-name"
              placeholder="Masalan: Ali Valiyev"
              value={accountForm.name}
              onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
            />
          </FormField>
          <FormField htmlFor="account-email" label="Email" required>
            <Input
              id="account-email"
              type="email"
              placeholder="account@example.com"
              value={accountForm.email}
              onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })}
            />
          </FormField>
          <FormField htmlFor="account-password" label="Parol" required>
            <Input
              id="account-password"
              type="text"
              minLength={8}
              placeholder="Kamida 8 ta belgi"
              value={accountForm.password}
              onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })}
            />
          </FormField>
          {isMultiBranch ? (
            <FormField htmlFor="account-factory" label="Filial" required>
              <select
                id="account-factory"
                className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
                value={accountForm.factoryId}
                onChange={(event) => setAccountForm({ ...accountForm, factoryId: event.target.value })}
              >
                {factories.map((factory) => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          {createAccount.isError ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              Operator qo‘shilmadi. Email takrorlanmaganini va rol tanlanganini tekshiring.
            </p>
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={
              !accountForm.name.trim() ||
              !accountForm.email.trim() ||
              accountForm.password.trim().length < 8 ||
              (isMultiBranch && !accountForm.factoryId) ||
              createAccount.isPending
            }
          >
            {createAccount.isPending ? "Yaratilmoqda..." : selectedRoleOption.submitLabel}
          </Button>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setPasswordForm({ password: "" });
            setSelectedFactoryIds([]);
            setSelectedEmployeeId("");
            resetPassword.reset();
            updateFactoryAccess.reset();
            linkEmployee.reset();
          }
        }}
        title={selectedUser?.name ?? "Operator"}
        description={
          isMultiBranch
            ? "Operator roli, paroli va filial ruxsatlarini boshqarish"
            : "Operator roli, ma’lumotlari va parolini boshqarish"
        }
      >
        {selectedUser ? (
          <div className="space-y-5">
            <section className="rounded-xl border p-4 text-sm">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="mt-1 text-muted-foreground">{selectedUser.email}</p>
              <p className="mt-1 text-muted-foreground">
                Rol: {selectedUser.roles.map(formatRole).join(", ")}
              </p>
              <p className="mt-1 text-muted-foreground">
                Xodim profili: {selectedUser.employee?.name ?? "Xodim profiliga bog‘lanmagan"}
              </p>
            </section>

            {!selectedUser.employee ? (
              <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); linkEmployee.mutate(); }}>
                <FormField htmlFor="employee-link" label="Mavjud xodim profiliga bog‘lash" required>
                  <select id="employee-link" className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm" value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                    <option value="">Xodimni tanlang</option>
                    {(employeesQuery.data?.data ?? []).filter((employee) => !employee.account && ["STAFF", "MECHANIC", "MECHANIC_MASTER"].includes(employee.workProfile)).map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employeeWorkProfileLabels[employee.workProfile]}</option>)}
                  </select>
                </FormField>
                <p className="text-xs text-muted-foreground">Yangi xodim profili «Xodimlar» bo‘limida yaratiladi.</p>
                {linkEmployee.isError ? <p className="text-sm text-rose-300">Bog‘lash amalga oshmadi. Profil boshqa dastur hisobiga biriktirilmaganini tekshiring.</p> : null}
                <Button className="w-full" disabled={!selectedEmployeeId || linkEmployee.isPending}>{linkEmployee.isPending ? "Bog‘lanmoqda..." : "Xodim profiliga bog‘lash"}</Button>
              </form>
            ) : null}

            <form className="space-y-4" onSubmit={submitPassword}>
              <FormField htmlFor="reset-password" label="Yangi parol" required>
                <Input
                  id="reset-password"
                  type="text"
                  minLength={8}
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm({ password: event.target.value })}
                />
              </FormField>
              {resetPassword.isSuccess ? (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  Parol yangilandi.
                </p>
              ) : null}
              {resetPassword.isError ? (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  Parol yangilanmadi.
                </p>
              ) : null}
              <Button
                className="w-full"
                type="submit"
                disabled={passwordForm.password.trim().length < 8 || resetPassword.isPending}
              >
                {resetPassword.isPending ? "Yangilanmoqda..." : "Parolni yangilash"}
              </Button>
            </form>

            {isMultiBranch ? (
              <form className="space-y-4" onSubmit={submitFactoryAccess}>
                <div>
                  <p className="text-sm font-medium">Filial ruxsatlari</p>
                  <div className="mt-3 space-y-2">
                    {factories.map((factory) => (
                      <label
                        key={factory.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFactoryIds.includes(factory.id)}
                          onChange={(event) => {
                            setSelectedFactoryIds((current) =>
                              event.target.checked
                                ? Array.from(new Set([...current, factory.id]))
                                : current.filter((id) => id !== factory.id),
                            );
                          }}
                        />
                        <span>{factory.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {updateFactoryAccess.isSuccess ? (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    Filial ruxsatlari yangilandi.
                  </p>
                ) : null}
                {updateFactoryAccess.isError ? (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    Filial ruxsatlari yangilanmadi.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  type="submit"
                  disabled={selectedFactoryIds.length === 0 || updateFactoryAccess.isPending}
                >
                  {updateFactoryAccess.isPending ? "Saqlanmoqda..." : "Ruxsatlarni saqlash"}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          : "rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FactoriesTab({
  factories,
  selectedFactory,
  selectedFactoryUsers,
  onSelectFactory,
}: {
  factories: OrganizationFactory[];
  selectedFactory: OrganizationFactory | null;
  selectedFactoryUsers: OrganizationUser[];
  onSelectFactory: (factoryId: string) => void;
}) {
  if (factories.length === 0) {
    return <EmptyPanel title="Filial yo‘q" description="O‘ng yuqoridagi tugma orqali birinchi filialni qo‘shing." />;
  }

  return (
    <section className="panel p-5">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {factories.map((factory) => (
          <button
            key={factory.id}
            type="button"
            className={
              selectedFactory?.id === factory.id
                ? "shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "shrink-0 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            }
            onClick={() => onSelectFactory(factory.id)}
          >
            {factory.name}
          </button>
        ))}
      </div>

      {selectedFactory ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground">Filial</p>
            <h2 className="mt-1 text-xl font-semibold">{selectedFactory.name}</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground">Biriktirilgan operatorlar</p>
                <p className="mt-1 text-2xl font-bold">{selectedFactory.userCount}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground">Tizim holati</p>
                <p className="mt-1 font-semibold">Ombor va bosqichlar tayyor</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Ushbu filialdagi operatorlar</h3>
            <div className="mt-3 divide-y">
              {selectedFactoryUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="w-fit shrink-0 rounded-full border px-3 py-1 text-xs">
                    {user.roles.map(formatRole).join(", ")}
                  </span>
                </div>
              ))}
              {selectedFactoryUsers.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Bu filialga hali operator biriktirilmagan.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UsersTab({
  users,
  isMultiBranch,
  onOpenUser,
}: {
  users: OrganizationUser[];
  isMultiBranch: boolean;
  onOpenUser: (user: OrganizationUser) => void;
}) {
  if (users.length === 0) {
    return (
      <EmptyPanel
        title="Operator yo‘q"
        description="O‘ng yuqoridagi tugma orqali dasturga kiradigan operator qo‘shing. Ishbay ishchilar «Xodimlar» bo‘limida."
      />
    );
  }

  return (
    <section className="panel overflow-hidden">
      {/* Desktop header */}
      <div
        className={
          isMultiBranch
            ? "hidden border-b px-5 py-3 text-xs uppercase text-muted-foreground md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_120px]"
            : "hidden border-b px-5 py-3 text-xs uppercase text-muted-foreground md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px]"
        }
      >
        <span>Ism</span>
        <span>Rol</span>
        {isMultiBranch ? <span>Filial</span> : null}
        <span>Holat</span>
      </div>
      <div className="divide-y">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            className="w-full px-4 py-4 text-left text-sm hover:bg-muted/30 sm:px-5"
            onClick={() => onOpenUser(user)}
          >
            {/* Mobile card layout */}
            <div className="space-y-2 md:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-muted-foreground">{user.email}</p>
                </div>
                <span className="shrink-0 rounded-full border px-3 py-1 text-xs">
                  {formatStatus(user.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {user.roles.length ? user.roles.map(formatRole).join(", ") : "Belgilanmagan"}
              </p>
              {isMultiBranch ? (
                <p className="text-xs text-muted-foreground">
                  {user.factories.length
                    ? user.factories.map((factory) => factory.name).join(", ")
                    : "Filial biriktirilmagan"}
                </p>
              ) : null}
            </div>

            {/* Desktop row layout */}
            <div
              className={
                isMultiBranch
                  ? "hidden md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_120px] md:items-center"
                  : "hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px] md:items-center"
              }
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{user.name}</span>
                <span className="block truncate text-muted-foreground">{user.email}</span>
              </span>
              <span className="truncate text-muted-foreground">
                {user.roles.length ? user.roles.map(formatRole).join(", ") : "Belgilanmagan"}
              </span>
              {isMultiBranch ? (
                <span className="truncate text-muted-foreground">
                  {user.factories.length
                    ? user.factories.map((factory) => factory.name).join(", ")
                    : "Biriktirilmagan"}
                </span>
              ) : null}
              <span className="w-fit rounded-full border px-3 py-1 text-xs">
                {formatStatus(user.status)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="panel grid min-h-64 place-items-center p-6 text-center">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
