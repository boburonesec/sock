import { InfoCard } from "@/components/cards/info-card";
import type { Employee } from "@/lib/api/employees";

export function EmployeePayrollTab({ employee }: { employee: Employee }) {
  return (
    <InfoCard title="Payroll ma’lumotlari">
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Xodim: {employee.name}</p>
        <p>
          API data not available yet. `/employees` endpoint hozircha salary,
          payroll, bonus, jarima, avans yoki balance ma’lumotlarini qaytarmaydi.
        </p>
        <p>Frontend payroll hisob-kitob qilmaydi.</p>
      </div>
    </InfoCard>
  );
}
