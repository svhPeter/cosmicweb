import { cn } from "@/lib/utils";

/** The Cosmos wordmark/planet logo. Renders crisp at any size. */
export function CosmosMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-accent", className)}
      role="img"
      aria-label="Cosmos logo"
    >
      <defs>
        <radialGradient id="cosmosMarkG" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#e9fbff" />
          <stop offset="55%" stopColor="currentColor" />
          <stop offset="100%" stopColor="#081018" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="7.25" fill="url(#cosmosMarkG)" />
      <ellipse
        cx="16"
        cy="16"
        rx="11.75"
        ry="3.2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="0.9"
        transform="rotate(-18 16 16)"
      />
    </svg>
  );
}
