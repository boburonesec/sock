import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { containerClassName?: string; };
export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-2 rounded-lg border bg-card px-3 sm:w-auto sm:min-w-[16rem]",
        containerClassName,
      )}
    >
      <Search size={18} className="shrink-0 text-muted-foreground" />
      <input
        type="search"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}
