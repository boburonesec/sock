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
import {
  organizationApi,
  type OrganizationFactory,
  type OrganizationUser,
} from "@/lib/api/organization";
import { useAuthStore } from "@/stores/auth-store";

const organizationKeys = {
  factories: ["organization", "factories"] as const,
  users: ["organization", "users"] as const,
};

type CompanyTab = "factories" | "users";

function formatStatus(status: string): string {
  if (status === "ACTIVE") return "Faol";
  if (status === "SUSPENDED") return "To‘xtatilgan";
  return status;
}

function formatRole(role: string): string {
  const labels: Record<string, string> = {
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
  const [managerDrawerOpen, setManagerDrawerOpen] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [factoryForm, setFactoryForm] = useState({ name: "" });
  const [managerForm, setManagerForm] = useState({
    name: "",
    email: "",
    password: "",
    factoryId: "",
  });
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [selectedFactoryIds, setSelectedFactoryIds] = useState<string[]>([]);

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

  const factories = factoriesQuery.data?.data ?? [];
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
    if (isMultiBranch && !managerForm.factoryId && factories[0]?.id) {
      setManagerForm((current) => ({ ...current, factoryId: factories[0].id }));
    }
  }, [factories, isMultiBranch, managerForm.factoryId]);

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

  const createManager = useMutation({
    mutationFn: () =>
      organizationApi.createManager({
        name: managerForm.name,
        email: managerForm.email,
        password: managerForm.password,
        factoryId: isMultiBranch ? managerForm.factoryId : undefined,
      }),
    onSuccess: async () => {
      setManagerForm((current) => ({
        name: "",
        email: "",
        password: "",
        factoryId: current.factoryId,
      }));
      setManagerDrawerOpen(false);
      await invalidateOrganization();
    },
  });

  const resetPassword = useMutation({
    mutationFn: () => {
      if (!selectedUser) {
        throw new Error("Foydalanuvchi tanlanmagan.");
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
        throw new Error("Foydalanuvchi tanlanmagan.");
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

  function submitFactory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createFactory.mutate();
  }

  function submitManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createManager.mutate();
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
    resetPassword.reset();
    updateFactoryAccess.reset();
  }

  if (!isOwner) {
    return (
      <ErrorState
        title="Ruxsat yo‘q"
        description="Korxona sozlamalarini faqat asosiy account boshqara oladi."
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
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        {isMultiBranch ? (
          <div className="inline-flex w-fit rounded-lg border bg-card p-1">
            <TabButton active={activeTab === "factories"} onClick={() => setActiveTab("factories")}>
              Filiallar
            </TabButton>
            <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
              Xodimlar
            </TabButton>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">Xodimlar</h2>
            <p className="text-sm text-muted-foreground">Korxona ichidagi accountlar</p>
          </div>
        )}
        {isMultiBranch && activeTab === "factories" ? (
          <Button type="button" onClick={() => setFactoryDrawerOpen(true)}>
            <Plus size={16} />
            Filial qo‘shish
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setManagerDrawerOpen(true)}
            disabled={isMultiBranch && factories.length === 0}
          >
            <Plus size={16} />
            Xodim qo‘shish
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
        open={managerDrawerOpen}
        onOpenChange={(open) => {
          setManagerDrawerOpen(open);
          if (!open) {
            setManagerForm((current) => ({
              name: "",
              email: "",
              password: "",
              factoryId: current.factoryId,
            }));
            createManager.reset();
          }
        }}
        title="Xodim qo‘shish"
        description="Xodim tizimga email va parol orqali kira oladi."
      >
        <form className="space-y-4" onSubmit={submitManager}>
          <FormField htmlFor="manager-name" label="Ism" required>
            <Input
              id="manager-name"
              placeholder="Masalan: Ali Valiyev"
              value={managerForm.name}
              onChange={(event) => setManagerForm({ ...managerForm, name: event.target.value })}
            />
          </FormField>
          <FormField htmlFor="manager-email" label="Email" required>
            <Input
              id="manager-email"
              type="email"
              placeholder="manager@example.com"
              value={managerForm.email}
              onChange={(event) => setManagerForm({ ...managerForm, email: event.target.value })}
            />
          </FormField>
          <FormField htmlFor="manager-password" label="Parol" required>
            <Input
              id="manager-password"
              type="text"
              minLength={8}
              placeholder="Kamida 8 ta belgi"
              value={managerForm.password}
              onChange={(event) => setManagerForm({ ...managerForm, password: event.target.value })}
            />
          </FormField>
          {isMultiBranch ? (
            <FormField htmlFor="manager-factory" label="Filial" required>
              <select
                id="manager-factory"
                className="flex h-11 w-full rounded-lg border bg-background px-3 text-sm"
                value={managerForm.factoryId}
                onChange={(event) => setManagerForm({ ...managerForm, factoryId: event.target.value })}
              >
                {factories.map((factory) => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          {createManager.isError ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              Xodim yaratilmadi. Email takrorlanmaganini tekshiring.
            </p>
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={
              !managerForm.name.trim() ||
              !managerForm.email.trim() ||
              managerForm.password.trim().length < 8 ||
              (isMultiBranch && !managerForm.factoryId) ||
              createManager.isPending
            }
          >
            {createManager.isPending ? "Yaratilmoqda..." : "Xodim yaratish"}
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
            resetPassword.reset();
            updateFactoryAccess.reset();
          }
        }}
        title={selectedUser?.name ?? "Xodim"}
        description={isMultiBranch ? "Parol va filial ruxsatlarini boshqarish" : "Xodim ma’lumotlari va parolini boshqarish"}
      >
        {selectedUser ? (
          <div className="space-y-5">
            <section className="rounded-xl border p-4 text-sm">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="mt-1 text-muted-foreground">{selectedUser.email}</p>
              <p className="mt-1 text-muted-foreground">
                Rol: {selectedUser.roles.map(formatRole).join(", ")}
              </p>
            </section>

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
                <p className="text-muted-foreground">Biriktirilgan xodimlar</p>
                <p className="mt-1 text-2xl font-bold">{selectedFactory.userCount}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-muted-foreground">Tizim holati</p>
                <p className="mt-1 font-semibold">Ombor va bosqichlar tayyor</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold">Ushbu filialdagi xodimlar</h3>
            <div className="mt-3 divide-y">
              {selectedFactoryUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs">
                    {user.roles.map(formatRole).join(", ")}
                  </span>
                </div>
              ))}
              {selectedFactoryUsers.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Bu filialga hali xodim biriktirilmagan.</p>
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
    return <EmptyPanel title="Xodim yo‘q" description="O‘ng yuqoridagi tugma orqali xodim qo‘shing." />;
  }

  return (
    <section className="panel overflow-hidden">
      <div
        className={
          isMultiBranch
            ? "grid grid-cols-[1.3fr_1fr_1fr_120px] border-b px-5 py-3 text-xs uppercase text-muted-foreground"
            : "grid grid-cols-[1.5fr_1fr_120px] border-b px-5 py-3 text-xs uppercase text-muted-foreground"
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
            className={
              isMultiBranch
                ? "grid w-full grid-cols-[1.3fr_1fr_1fr_120px] items-center px-5 py-4 text-left text-sm hover:bg-muted/30"
                : "grid w-full grid-cols-[1.5fr_1fr_120px] items-center px-5 py-4 text-left text-sm hover:bg-muted/30"
            }
            onClick={() => onOpenUser(user)}
          >
            <span>
              <span className="block font-medium">{user.name}</span>
              <span className="block text-muted-foreground">{user.email}</span>
            </span>
            <span className="text-muted-foreground">
              {user.roles.length ? user.roles.map(formatRole).join(", ") : "Belgilanmagan"}
            </span>
            {isMultiBranch ? (
              <span className="text-muted-foreground">
                {user.factories.length ? user.factories.map((factory) => factory.name).join(", ") : "Biriktirilmagan"}
              </span>
            ) : null}
            <span className="w-fit rounded-full border px-3 py-1 text-xs">
              {formatStatus(user.status)}
            </span>
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
