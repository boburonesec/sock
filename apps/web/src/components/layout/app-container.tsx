import { cn } from "@/lib/utils";

interface AppContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function AppContainer({ children, className }: AppContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1600px] px-3 py-4 sm:p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
