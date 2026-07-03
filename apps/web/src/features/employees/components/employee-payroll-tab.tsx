import { InfoCard } from "@/components/cards/info-card";
import type { Employee } from "@/lib/api/employees";

export function EmployeePayrollTab({ employee }: { employee: Employee }) {
  return (
    <InfoCard title="Ish haqi ma’lumotlari">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Xodim: {employee.name}</p>
        <p>
          Ish haqi, bonus, jarima va avans ma’lumotlari keyingi
          yangilanishlarda ko‘rinadi.
        </p>
      </div>
    </InfoCard>
  );
}
