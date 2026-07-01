import { cn } from "@/lib/utils";

interface FormFieldProps { label: string; htmlFor: string; error?: string; required?: boolean; children: React.ReactNode; className?: string; }
export function FormField({ label, htmlFor, error, required, children, className }: FormFieldProps) { return <div className={cn("space-y-1.5", className)}><label htmlFor={htmlFor} className="text-sm font-medium">{label}{required && <span className="ml-1 text-rose-500">*</span>}</label>{children}{error && <p role="alert" className="text-xs text-rose-500">{error}</p>}</div>; }
