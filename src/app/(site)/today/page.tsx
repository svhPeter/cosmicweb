import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Rocket, Newspaper } from "lucide-react";

import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LastUpdatedLabel } from "@/components/content/last-updated-label";
import { DataSourceBadge } from "@/components/content/data-source-badge";
import { getApod } from "@/data-platform/sources/apod";
import { getUpcomingLaunches } from "@/data-platform/sources/launches";
import { getRecentNews } from "@/data-platform/sources/news";

export const metadata: Metadata = {
  title: "Today in Space",
  description:
    "NASA's Astronomy Picture of the Day, upcoming launches and fresh space news — all served through Cosmos' internal data platform.",
};

export const revalidate = 300;

export default async function TodayPage() {
  const [apod, launches, news] = await Promise.all([
    getApod(),
    getUpcomingLaunches(),
    getRecentNews(),
  ]);

  const featuredLaunch = launches.data[0];
  const secondaryLaunches = launches.data.slice(1, 6);

  return (
    <div className="container section-y-tight">
      <SectionHeading
        eyebrow="Today"
        title="Today, curated."
        description="A calm daily briefing: one remarkable image, the next meaningful launch, and a handful of stories worth your time."
        as="h1"
      />

      {/* APOD */}
      <section className="mt-14">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] items-start">
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/10] w-full bg-panel">
              {apod.data.mediaType === "image" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apod.data.hdUrl ?? apod.data.url}
                    alt={apod.data.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.78) 100%)",
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-panel/80 to-panel/30">
                  <div className="max-w-md px-8 text-center">
                    <p className="cosmos-chip mx-auto inline-flex">NASA APOD · Video</p>
                    <h2 className="mt-4 font-display text-2xl tracking-tight text-balance">{apod.data.title}</h2>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      Today’s APOD is a video. We link you out to the original so it loads reliably and keeps NASA’s context intact.
                    </p>
                    <Button asChild size="lg" variant="accent" className="mt-6">
                      <a href={apod.data.url} target="_blank" rel="noopener noreferrer">
                        Watch on NASA <ArrowUpRight className="ml-1 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <Badge tone="accent">NASA APOD</Badge>
                    <h2 className="mt-3 font-display text-2xl sm:text-3xl tracking-tight text-balance">
                      {apod.data.title}
                    </h2>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      <span>{new Date(apod.data.date).toLocaleDateString("en-US", { dateStyle: "long" })}</span>
                    </div>
                    {apod.data.copyright ? <div className="mt-1">© {apod.data.copyright}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:pt-2">
            <p className="cosmos-chip inline-flex">
              {apod.meta.integrity === "fresh"
                ? "Fresh from NASA"
                : apod.meta.integrity === "cache"
                  ? apod.meta.stale
                    ? "Cached (stale)"
                    : "Cached"
                  : "Curated fallback"}
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
              One image a day is enough to recalibrate your sense of scale. Read the context, then take a moment.
            </p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed text-pretty line-clamp-[10]">
              {apod.data.explanation}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <LastUpdatedLabel iso={apod.meta.lastUpdated} integrity={apod.meta.integrity} />
              <DataSourceBadge sources={apod.attribution.map((a) => ({ source: a.source, url: a.url }))} />
              {apod.data.mediaType === "image" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={apod.data.url} target="_blank" rel="noopener noreferrer">
                      Open on NASA <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {apod.data.hdUrl ? (
                    <Button asChild variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                      <a href={apod.data.hdUrl} target="_blank" rel="noopener noreferrer">
                        HD <ArrowUpRight className="ml-1 h-3.5 w-3.5 opacity-70" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Launches */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-muted-foreground uppercase">
              <Rocket className="h-3.5 w-3.5" aria-hidden />
              Upcoming
            </div>
            <h2 className="mt-2 font-display text-3xl tracking-tight">Next launch to watch.</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Not every launch deserves your attention. Here’s the next one we’d put on the calendar — plus a quieter list behind it.
            </p>
          </div>
          <LastUpdatedLabel iso={launches.meta.lastUpdated} integrity={launches.meta.integrity} />
        </div>

        {featuredLaunch ? (
          <Card className="mt-8 overflow-hidden">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative min-h-[220px] bg-gradient-to-b from-panel/70 to-panel/30">
                {featuredLaunch.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredLaunch.imageUrl}
                    alt={featuredLaunch.name}
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                    loading="lazy"
                  />
                ) : null}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.15) 100%)",
                  }}
                />
                <div className="relative p-6 sm:p-8">
                  <Badge tone="neutral">{prettyStatus(featuredLaunch.status)}</Badge>
                  <h3 className="mt-3 font-display text-2xl tracking-tight text-balance">{featuredLaunch.name}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
                    {bestLaunchSummary(featuredLaunch)}
                  </p>
                </div>
              </div>
              <div className="p-6 sm:p-8 flex flex-col gap-3">
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-foreground/85">NET</span>
                    <span>{prettyDateTime(featuredLaunch.net)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-foreground/85">Vehicle</span>
                    <span className="text-right">{featuredLaunch.rocket ?? "Vehicle TBD"}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-foreground/85">Provider</span>
                    <span className="text-right">{featuredLaunch.provider ?? "Provider TBD"}</span>
                  </div>
                  {featuredLaunch.location ? (
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <span className="text-foreground/85">Site</span>
                      <span className="text-right">{featuredLaunch.location}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {featuredLaunch.infoUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={featuredLaunch.infoUrl} target="_blank" rel="noopener noreferrer">
                        Details <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
                    <Link href="/explore">See it in context</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mt-8 p-8">
            <p className="text-muted-foreground">
              No upcoming launches are available right now. We’ll keep checking — this section will update automatically.
            </p>
          </Card>
        )}

        {secondaryLaunches.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {secondaryLaunches.map((l) => (
              <Card key={l.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium tracking-tight">{l.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {prettyDateTime(l.net)} · {l.provider ?? "Provider TBD"}
                    </p>
                  </div>
                  <Badge tone="neutral" className="shrink-0">
                    {prettyStatus(l.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {bestLaunchSummary(l)}
                </p>
              </Card>
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          <DataSourceBadge sources={launches.attribution.map((a) => ({ source: a.source, url: a.url }))} />
        </div>
      </section>

      {/* News */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs tracking-[0.22em] text-muted-foreground uppercase">
              <Newspaper className="h-3.5 w-3.5" aria-hidden />
              Reading
            </div>
            <h2 className="mt-2 font-display text-3xl tracking-tight">A few stories worth opening.</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              We keep the list short on purpose. If you read one thing today, let it be something good.
            </p>
          </div>
          <LastUpdatedLabel iso={news.meta.lastUpdated} integrity={news.meta.integrity} />
        </div>

        {news.data.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.data.map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block focus:outline-none"
              >
                <Card className="h-full overflow-hidden">
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone="neutral">{n.source}</Badge>
                      <span className="text-xs text-muted-foreground">{prettyRelativeTime(n.publishedAt)}</span>
                    </div>
                    <h3 className="text-base font-medium tracking-tight text-balance line-clamp-3">
                      {n.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                      {n.summary}
                    </p>
                    <div className="mt-auto pt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                      Open story <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <Card className="mt-8 p-8">
            <p className="text-muted-foreground">
              No stories are available right now. If this persists, we’ll fall back to a curated set automatically.
            </p>
          </Card>
        )}

        <div className="mt-4">
          <DataSourceBadge sources={news.attribution.map((a) => ({ source: a.source, url: a.url }))} />
        </div>
      </section>
    </div>
  );
}

function prettyStatus(s: string) {
  const t = s.replaceAll("_", " ").trim();
  if (t === "tbd") return "Scheduled";
  if (t === "unknown") return "Scheduled";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function prettyDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Time to be confirmed";
  }
}

function bestLaunchSummary(l: { missionDescription?: string; mission?: string; location?: string }) {
  const primary = l.missionDescription ?? l.mission;
  if (primary && primary.trim().length > 0) return primary;
  if (l.location) return `A launch currently listed without mission details. Site: ${l.location}.`;
  return "A launch currently listed without full mission details. We’ll refine this brief as the schedule firms up.";
}

function prettyRelativeTime(iso: string) {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  const diff = Date.now() - d;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
