import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FeatureCardProps {
  title: string;
  description: string;
  href?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function FeatureCard({ title, description, href, icon, className }: FeatureCardProps) {
  const content = (
    <Card className={cn("flex h-full flex-col gap-4 p-6", className)}>
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel/70 text-accent">
          {icon}
        </div>
      ) : null}
      <div className="flex-1">
        <h3 className="text-lg font-medium tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {href ? (
        <span className="inline-flex items-center gap-1 text-sm text-foreground/80">
          Explore <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </Card>
  );
  if (!href) return content;
  return (
    <Link href={href} className="group block focus:outline-none" aria-label={title}>
      {content}
    </Link>
  );
}
