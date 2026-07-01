"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Drawer } from "@/components/overlays/drawer";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  productApi,
  type MasterDataItem,
  type Product,
  type ProductPayload,
  type ProductPrice,
  type ProductPricePayload,
  type ProductVariantPayload,
} from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProductVariantReference } from "@/lib/api/types";

const productFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Mahsulot nomi kiritilishi shart.")),
  code: z
    .string()
    .transform((value) => value.trim())
    .optional(),
});

const variantFormSchema = z.object({
  colorId: z.string().min(1, "Rang tanlang."),
  materialId: z.string().min(1, "Material tanlang."),
  seasonId: z.string().min(1, "Mavsum tanlang."),
});

const priceFormSchema = z.object({
  amount: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => Number(value) > 0, "Narx musbat bo‘lishi kerak."),
  effectiveFrom: z.string().min(1, "Boshlanish sanasi kiritilishi shart."),
});

type ProductFormValues = z.infer<typeof productFormSchema>;
type VariantFormValues = z.infer<typeof variantFormSchema>;
type PriceFormValues = z.infer<typeof priceFormSchema>;

type ProductFormState =
  | { mode: "create"; product: null }
  | { mode: "edit"; product: Product };

type VariantFormState =
  | { mode: "create"; product: Product; variant: null }
  | { mode: "edit"; product: Product; variant: ProductVariantReference };

export function ProductCatalogPage() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: queryKeys.product.products(),
    queryFn: productApi.getProducts,
  });
  const colorsQuery = useQuery({
    queryKey: queryKeys.product.colors(),
    queryFn: productApi.getColors,
  });
  const materialsQuery = useQuery({
    queryKey: queryKeys.product.materials(),
    queryFn: productApi.getMaterials,
  });
  const seasonsQuery = useQuery({
    queryKey: queryKeys.product.seasons(),
    queryFn: productApi.getSeasons,
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantReference | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormState | null>(null);
  const [priceVariant, setPriceVariant] =
    useState<ProductVariantReference | null>(null);
  const [archiveProduct, setArchiveProduct] = useState<Product | null>(null);
  const [archiveVariant, setArchiveVariant] =
    useState<ProductVariantReference | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createProduct = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => invalidateProducts(queryClient),
  });
  const updateProduct = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductPayload }) =>
      productApi.updateProduct(id, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
  const archiveProductMutation = useMutation({
    mutationFn: productApi.archiveProduct,
    onSuccess: () => invalidateProducts(queryClient),
  });
  const createVariant = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: ProductVariantPayload;
    }) => productApi.createVariant(productId, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
  const updateVariant = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductVariantPayload }) =>
      productApi.updateVariant(id, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
  const archiveVariantMutation = useMutation({
    mutationFn: productApi.archiveVariant,
    onSuccess: () => invalidateProducts(queryClient),
  });

  const products = productsQuery.data?.data ?? [];
  const colors = colorsQuery.data?.data ?? [];
  const materials = materialsQuery.data?.data ?? [];
  const seasons = seasonsQuery.data?.data ?? [];
  const isLoading =
    productsQuery.isPending ||
    colorsQuery.isPending ||
    materialsQuery.isPending ||
    seasonsQuery.isPending;
  const firstError =
    productsQuery.error ??
    colorsQuery.error ??
    materialsQuery.error ??
    seasonsQuery.error;

  useEffect(() => {
    if (!selectedProduct) return;
    const nextSelected = products.find((product) => product.id === selectedProduct.id) ?? null;
    setSelectedProduct(nextSelected);
  }, [products, selectedProduct]);

  return (
    <div>
      <PageHeader
        title="Mahsulotlar"
        description="Mahsulot katalogi, variantlar va narx tarixini boshqarish"
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {feedback ? (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedback.message}
          </p>
        ) : (
          <span />
        )}
        <Button
          onClick={() => {
            setFeedback(null);
            setProductForm({ mode: "create", product: null });
          }}
        >
          Mahsulot qo‘shish
        </Button>
      </div>

      {isLoading ? <LoadingState label="Mahsulot katalogi yuklanmoqda..." /> : null}

      {firstError ? (
        <ErrorState
          title="Mahsulot katalogi yuklanmadi"
          description={firstError instanceof Error ? firstError.message : "Xatolik yuz berdi."}
          action={
            <Button
              variant="outline"
              onClick={() => {
                void productsQuery.refetch();
                void colorsQuery.refetch();
                void materialsQuery.refetch();
                void seasonsQuery.refetch();
              }}
            >
              Qayta urinish
            </Button>
          }
        />
      ) : null}

      {!isLoading && !firstError && products.length === 0 ? (
        <EmptyState
          title="Mahsulotlar mavjud emas"
          description="Mahsulot yaratilgach, variant va narx tarixini shu yerda boshqarasiz."
        />
      ) : null}

      {!isLoading && !firstError && products.length > 0 ? (
        <ProductsTable
          products={products}
          onSelect={setSelectedProduct}
          onEdit={(product) => setProductForm({ mode: "edit", product })}
          onArchive={setArchiveProduct}
        />
      ) : null}

      <ProductFormDrawer
        open={Boolean(productForm)}
        formState={productForm}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
        errorMessage={getMutationError(createProduct.error, updateProduct.error)}
        onOpenChange={(open) => {
          if (!open) setProductForm(null);
        }}
        onSubmit={async (values) => {
          setFeedback(null);
          const payload: ProductPayload = {
            name: values.name,
            code: values.code ? values.code : null,
          };
          if (productForm?.mode === "edit") {
            await updateProduct.mutateAsync({ id: productForm.product.id, payload });
            setFeedback({ tone: "success", message: "Mahsulot yangilandi." });
          } else {
            await createProduct.mutateAsync(payload);
            setFeedback({ tone: "success", message: "Mahsulot yaratildi." });
          }
          setProductForm(null);
        }}
      />

      <ProductDetailDrawer
        product={selectedProduct}
        selectedVariant={selectedVariant}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            setSelectedVariant(null);
          }
        }}
        onCreateVariant={(product) =>
          setVariantForm({ mode: "create", product, variant: null })
        }
        onEditVariant={(product, variant) =>
          setVariantForm({ mode: "edit", product, variant })
        }
        onArchiveVariant={setArchiveVariant}
        onSelectVariant={setSelectedVariant}
        onAddPrice={setPriceVariant}
      />

      <VariantFormDrawer
        open={Boolean(variantForm)}
        formState={variantForm}
        colors={colors}
        materials={materials}
        seasons={seasons}
        isSubmitting={createVariant.isPending || updateVariant.isPending}
        errorMessage={getMutationError(createVariant.error, updateVariant.error)}
        onOpenChange={(open) => {
          if (!open) setVariantForm(null);
        }}
        onSubmit={async (values) => {
          if (!variantForm) return;
          setFeedback(null);
          if (variantForm.mode === "edit") {
            await updateVariant.mutateAsync({
              id: variantForm.variant.id,
              payload: values,
            });
            setFeedback({ tone: "success", message: "Variant yangilandi." });
          } else {
            await createVariant.mutateAsync({
              productId: variantForm.product.id,
              payload: values,
            });
            setFeedback({ tone: "success", message: "Variant yaratildi." });
          }
          setVariantForm(null);
        }}
      />

      <PriceFormDrawer
        variant={priceVariant}
        onOpenChange={(open) => {
          if (!open) setPriceVariant(null);
        }}
        onSuccess={() => {
          setFeedback({ tone: "success", message: "Narx qo‘shildi." });
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveProduct)}
        onOpenChange={(open) => {
          if (!open) setArchiveProduct(null);
        }}
        title="Mahsulotni archive qilish"
        description={
          archiveProduct
            ? `${archiveProduct.name} archive qilinadi. Stock yoki sotuv yozuvlari o‘zgarmaydi.`
            : "Mahsulot archive qilinadi."
        }
        confirmLabel={archiveProductMutation.isPending ? "Bajarilmoqda..." : "Archive qilish"}
        destructive
        onConfirm={() => {
          if (!archiveProduct) return;
          const productName = archiveProduct.name;
          archiveProductMutation.mutate(archiveProduct.id, {
            onSuccess: () => {
              setFeedback({ tone: "success", message: `${productName} archive qilindi.` });
              setArchiveProduct(null);
              setSelectedProduct(null);
            },
            onError: (error) => {
              setFeedback({ tone: "error", message: getErrorMessage(error) });
            },
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveVariant)}
        onOpenChange={(open) => {
          if (!open) setArchiveVariant(null);
        }}
        title="Variantni archive qilish"
        description="Variant archive qilinadi. Stock yoki sotuv yozuvlari o‘zgarmaydi."
        confirmLabel={archiveVariantMutation.isPending ? "Bajarilmoqda..." : "Archive qilish"}
        destructive
        onConfirm={() => {
          if (!archiveVariant) return;
          archiveVariantMutation.mutate(archiveVariant.id, {
            onSuccess: () => {
              setFeedback({ tone: "success", message: "Variant archive qilindi." });
              setArchiveVariant(null);
              setSelectedVariant(null);
            },
            onError: (error) => {
              setFeedback({ tone: "error", message: getErrorMessage(error) });
            },
          });
        }}
      />
    </div>
  );
}

function ProductsTable({
  products,
  onSelect,
  onEdit,
  onArchive,
}: {
  products: Product[];
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
}) {
  return (
    <DataTable label="Mahsulotlar jadvali">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Nomi</DataTableHeader>
          <DataTableHeader>Kod</DataTableHeader>
          <DataTableHeader>Variantlar</DataTableHeader>
          <DataTableHeader>Amallar</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {products.map((product) => (
          <DataTableRow key={product.id}>
            <DataTableCell>
              <button className="text-left font-semibold" onClick={() => onSelect(product)}>
                {product.name}
              </button>
            </DataTableCell>
            <DataTableCell>{product.code ?? "—"}</DataTableCell>
            <DataTableCell>{product.variants.length}</DataTableCell>
            <DataTableCell>
              <div className="flex flex-wrap gap-2">
                <Button className="h-9" variant="outline" onClick={() => onSelect(product)}>
                  Ochish
                </Button>
                <Button className="h-9" variant="outline" onClick={() => onEdit(product)}>
                  Tahrirlash
                </Button>
                <Button
                  className="h-9 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                  variant="outline"
                  onClick={() => onArchive(product)}
                >
                  Archive
                </Button>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function ProductFormDrawer({
  open,
  formState,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  formState: ProductFormState | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: "", code: "" },
  });

  useEffect(() => {
    reset({
      name: formState?.mode === "edit" ? formState.product.name : "",
      code: formState?.mode === "edit" ? formState.product.code ?? "" : "",
    });
  }, [formState, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={formState?.mode === "edit" ? "Mahsulotni tahrirlash" : "Mahsulot qo‘shish"}
      description="Mahsulot master-data yozuvi"
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField htmlFor="productName" label="Nomi" error={errors.name?.message} required>
          <Input id="productName" disabled={isSubmitting} {...register("name")} />
        </FormField>
        <FormField htmlFor="productCode" label="Kod">
          <Input id="productCode" placeholder="Ixtiyoriy" disabled={isSubmitting} {...register("code")} />
        </FormField>
        {errorMessage ? <FormError message={errorMessage} /> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}

function ProductDetailDrawer({
  product,
  selectedVariant,
  onOpenChange,
  onCreateVariant,
  onEditVariant,
  onArchiveVariant,
  onSelectVariant,
  onAddPrice,
}: {
  product: Product | null;
  selectedVariant: ProductVariantReference | null;
  onOpenChange: (open: boolean) => void;
  onCreateVariant: (product: Product) => void;
  onEditVariant: (product: Product, variant: ProductVariantReference) => void;
  onArchiveVariant: (variant: ProductVariantReference) => void;
  onSelectVariant: (variant: ProductVariantReference | null) => void;
  onAddPrice: (variant: ProductVariantReference) => void;
}) {
  if (!product) return null;

  return (
    <Drawer
      open={Boolean(product)}
      onOpenChange={onOpenChange}
      title={product.name}
      description={`Kod: ${product.code ?? "—"}`}
      className="max-w-5xl"
    >
      <div className="space-y-5">
        <div className="flex justify-end">
          <Button onClick={() => onCreateVariant(product)}>Variant qo‘shish</Button>
        </div>
        <DataTable label="Variantlar">
          <DataTableHead>
            <DataTableRow>
              <DataTableHeader>Rang</DataTableHeader>
              <DataTableHeader>Material</DataTableHeader>
              <DataTableHeader>Mavsum</DataTableHeader>
              <DataTableHeader>Amallar</DataTableHeader>
            </DataTableRow>
          </DataTableHead>
          <tbody>
            {product.variants.length > 0 ? (
              product.variants.map((variant) => (
                <DataTableRow key={variant.id}>
                  <DataTableCell>{variant.color.name}</DataTableCell>
                  <DataTableCell>{variant.material.name}</DataTableCell>
                  <DataTableCell>{variant.season.name}</DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button className="h-9" variant="outline" onClick={() => onSelectVariant(variant)}>
                        Narxlar
                      </Button>
                      <Button className="h-9" variant="outline" onClick={() => onEditVariant(product, variant)}>
                        Tahrirlash
                      </Button>
                      <Button className="h-9" variant="outline" onClick={() => onAddPrice(variant)}>
                        Narx qo‘shish
                      </Button>
                      <Button
                        className="h-9 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                        variant="outline"
                        onClick={() => onArchiveVariant(variant)}
                      >
                        Archive
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))
            ) : (
              <EmptyTableState
                colSpan={4}
                title="Variantlar mavjud emas"
                description="Rang, material va mavsum tanlab variant yarating."
              />
            )}
          </tbody>
        </DataTable>

        <VariantPriceHistory variant={selectedVariant} />
      </div>
    </Drawer>
  );
}

function VariantFormDrawer({
  open,
  formState,
  colors,
  materials,
  seasons,
  isSubmitting,
  errorMessage,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  formState: VariantFormState | null;
  colors: MasterDataItem[];
  materials: MasterDataItem[];
  seasons: MasterDataItem[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VariantFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: { colorId: "", materialId: "", seasonId: "" },
  });

  useEffect(() => {
    reset({
      colorId: formState?.mode === "edit" ? formState.variant.color.id : "",
      materialId: formState?.mode === "edit" ? formState.variant.material.id : "",
      seasonId: formState?.mode === "edit" ? formState.variant.season.id : "",
    });
  }, [formState, reset]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={formState?.mode === "edit" ? "Variantni tahrirlash" : "Variant qo‘shish"}
      description={formState?.product.name}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <SelectField id="colorId" label="Rang" error={errors.colorId?.message} registration={register("colorId")} items={colors} disabled={isSubmitting} />
        <SelectField id="materialId" label="Material" error={errors.materialId?.message} registration={register("materialId")} items={materials} disabled={isSubmitting} />
        <SelectField id="seasonId" label="Mavsum" error={errors.seasonId?.message} registration={register("seasonId")} items={seasons} disabled={isSubmitting} />
        {errorMessage ? <FormError message={errorMessage} /> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </form>
    </Drawer>
  );
}

function PriceFormDrawer({
  variant,
  onOpenChange,
  onSuccess,
}: {
  variant: ProductVariantReference | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const createPrice = useMutation({
    mutationFn: ({ variantId, payload }: { variantId: string; payload: ProductPricePayload }) =>
      productApi.createVariantPrice(variantId, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.product.variantPrices(variables.variantId),
      });
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: { amount: "", effectiveFrom: "" },
  });

  useEffect(() => {
    reset({ amount: "", effectiveFrom: new Date().toISOString().slice(0, 10) });
  }, [variant, reset]);

  return (
    <Drawer
      open={Boolean(variant)}
      onOpenChange={onOpenChange}
      title="Narx qo‘shish"
      description={variant ? `${variant.product.name} · ${variant.color.name}` : undefined}
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          if (!variant) return;
          await createPrice.mutateAsync({
            variantId: variant.id,
            payload: {
              amount: values.amount,
              effectiveFrom: values.effectiveFrom,
            },
          });
          onSuccess();
          onOpenChange(false);
        })}
      >
        <FormField htmlFor="priceAmount" label="Narx" error={errors.amount?.message} required>
          <Input id="priceAmount" type="number" min="0" step="0.01" disabled={createPrice.isPending} {...register("amount")} />
        </FormField>
        <FormField htmlFor="effectiveFrom" label="Boshlanish sanasi" error={errors.effectiveFrom?.message} required>
          <Input id="effectiveFrom" type="date" disabled={createPrice.isPending} {...register("effectiveFrom")} />
        </FormField>
        {createPrice.error ? <FormError message={getErrorMessage(createPrice.error)} /> : null}
        <Button type="submit" className="w-full" disabled={createPrice.isPending}>
          {createPrice.isPending ? "Saqlanmoqda..." : "Narx qo‘shish"}
        </Button>
      </form>
    </Drawer>
  );
}

function VariantPriceHistory({ variant }: { variant: ProductVariantReference | null }) {
  const pricesQuery = useQuery({
    queryKey: queryKeys.product.variantPrices(variant?.id ?? "none"),
    queryFn: () => productApi.getVariantPrices(variant?.id ?? ""),
    enabled: Boolean(variant),
  });

  if (!variant) {
    return (
      <EmptyState
        title="Narx tarixi"
        description="Narx tarixini ko‘rish uchun variant tanlang."
      />
    );
  }

  if (pricesQuery.isPending) {
    return <LoadingState label="Narx tarixi yuklanmoqda..." />;
  }

  if (pricesQuery.isError) {
    return (
      <ErrorState
        title="Narx tarixi yuklanmadi"
        description={getErrorMessage(pricesQuery.error)}
        action={
          <Button variant="outline" onClick={() => pricesQuery.refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const prices = pricesQuery.data?.data ?? [];

  return (
    <DataTable label="Narx tarixi">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Narx</DataTableHeader>
          <DataTableHeader>Boshlanish sanasi</DataTableHeader>
          <DataTableHeader>Yaratilgan</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {prices.length > 0 ? (
          prices.map((price: ProductPrice) => (
            <DataTableRow key={price.id}>
              <DataTableCell>{price.amount}</DataTableCell>
              <DataTableCell>{formatDate(price.effectiveFrom)}</DataTableCell>
              <DataTableCell>{formatDate(price.createdAt)}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={3}
            title="Narxlar mavjud emas"
            description="Bu variant uchun narx tarixi hali kiritilmagan."
          />
        )}
      </tbody>
    </DataTable>
  );
}

function SelectField({
  id,
  label,
  items,
  error,
  disabled,
  registration,
}: {
  id: string;
  label: string;
  items: MasterDataItem[];
  error?: string;
  disabled?: boolean;
  registration: ReturnType<typeof useForm<VariantFormValues>>["register"] extends (
    name: infer _Name,
  ) => infer Registration
    ? Registration
    : never;
}) {
  return (
    <FormField htmlFor={id} label={label} error={error} required>
      <Select id={id} disabled={disabled} defaultValue="" {...registration}>
        <option value="" disabled>
          Tanlang
        </option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
    >
      {message}
    </p>
  );
}

function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.product.products() });
}

function getMutationError(...errors: unknown[]): string | null {
  const error = errors.find(Boolean);
  return error ? getErrorMessage(error) : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Xatolik yuz berdi.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
  }).format(new Date(value));
}
