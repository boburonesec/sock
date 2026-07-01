import { Inbox } from "lucide-react";

interface EmptyTableStateProps { colSpan: number; title?: string; description?: string; }
export function EmptyTableState({ colSpan, title = "Ma’lumot topilmadi", description = "Ko‘rsatish uchun yozuv mavjud emas." }: EmptyTableStateProps) {
  return <tr><td colSpan={colSpan} className="px-5 py-14 text-center"><Inbox className="mx-auto text-muted-foreground" size={24}/><p className="mt-3 font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></td></tr>;
}
