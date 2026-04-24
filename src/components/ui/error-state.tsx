import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't reach that source. Showing the best local fallback instead.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "cosmos-panel p-6 flex items-start gap-4",
        className
      )}
    >
      <div className="mt-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 p-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("cosmos-panel p-10 text-center", className)}>
      <h3 className="text-base font-medium">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
