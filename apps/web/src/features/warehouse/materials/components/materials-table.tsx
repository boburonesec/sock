import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-display/data-table";
import { EmptyTableState } from "@/components/data-display/empty-table-state";
import type { MaterialStock } from "@/lib/api/warehouse";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MaterialsTable({
  materials,
  onSelect,
}: {
  materials: MaterialStock[];
  onSelect: (material: MaterialStock) => void;
}) {
  return (
    <DataTable label="Materiallar ro‘yxati">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeader>Material nomi</DataTableHeader>
          <DataTableHeader>Ombor</DataTableHeader>
          <DataTableHeader>Zona</DataTableHeader>
          <DataTableHeader>Miqdor</DataTableHeader>
          <DataTableHeader>Birlik</DataTableHeader>
          <DataTableHeader>Minimal threshold</DataTableHeader>
          <DataTableHeader>Status</DataTableHeader>
          <DataTableHeader>Yangilangan</DataTableHeader>
        </DataTableRow>
      </DataTableHead>
      <tbody>
        {materials.length > 0 ? (
          materials.map((material) => (
            <DataTableRow key={material.id} className="hover:bg-muted/40">
              <DataTableCell>
                <button
                  onClick={() => onSelect(material)}
                  className="text-left font-semibold hover:text-primary"
                >
                  {material.material.name}
                </button>
              </DataTableCell>
              <DataTableCell>{material.warehouse.name}</DataTableCell>
              <DataTableCell>{material.zone.name}</DataTableCell>
              <DataTableCell>{material.quantity}</DataTableCell>
              <DataTableCell>{material.unit}</DataTableCell>
              <DataTableCell>Mavjud emas</DataTableCell>
              <DataTableCell>Mavjud emas</DataTableCell>
              <DataTableCell>{formatDate(material.updatedAt)}</DataTableCell>
            </DataTableRow>
          ))
        ) : (
          <EmptyTableState
            colSpan={8}
            title="Material qoldiqlari mavjud emas"
            description="Material stock yozuvlari paydo bo‘lgach, ular shu yerda ko‘rinadi."
          />
        )}
      </tbody>
    </DataTable>
  );
}
