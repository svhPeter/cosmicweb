import { cn } from "@/lib/utils";

export function LoadingState({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-accent/60 animate-ping" />
        <span className="relative h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="tracking-wide">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:400px_100%]",
        className
      )}
    />
  );
}
