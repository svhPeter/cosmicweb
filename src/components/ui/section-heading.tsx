import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2" | "h3";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center mx-auto max-w-2xl" : "items-start",
        className
      )}
    >
      {eyebrow ? (
        <span className="cosmos-chip">
          <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> {eyebrow}
        </span>
      ) : null}
      <Heading
        className={cn(
          "font-display text-display-md text-balance text-foreground",
          "tracking-tight"
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className={cn("max-w-xl text-base text-muted-foreground leading-relaxed text-pretty")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
