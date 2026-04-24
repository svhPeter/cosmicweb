import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getApod } from "@/data-platform/sources/apod";
import { getUpcomingLaunches } from "@/data-platform/sources/launches";
import { LastUpdatedLabel } from "@/components/content/last-updated-label";

export async function HomeTodayPreview() {
  const [apod, launches] = await Promise.all([getApod(), getUpcomingLaunches()]);
  const nextLaunch = launches.data[0];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="cosmos-chip mb-3">Today in Space</p>
        <h2 className="font-display text-3xl tracking-tight text-balance">
          A daily window on space, updated automatically.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
          Cosmos pulls public NASA + launch feeds through its own resilient API layer. Stale or
          offline? A curated fallback keeps the page informative.
        </p>
      </div>

      <Card className="p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="accent" className="mb-2">APOD</Badge>
            <h3 className="text-lg font-medium tracking-tight">{apod.data.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
              {apod.data.explanation}
            </p>
          </div>
        </div>
        <LastUpdatedLabel iso={apod.meta.lastUpdated} integrity={apod.meta.integrity} />
      </Card>

      {nextLaunch ? (
        <Card className="p-6">
          <Badge tone="neutral" className="mb-2">Next launch</Badge>
          <h3 className="text-base font-medium tracking-tight">{nextLaunch.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextLaunch.provider ?? "Provider TBD"} · {new Date(nextLaunch.net).toLocaleString()}
          </p>
        </Card>
      ) : null}

      <Link
        href="/today"
        className="mt-1 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80"
      >
        Open Today <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
