import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listProviders } from "@/data-platform/sources/registry";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Cosmos is, why it exists, and how it's built: mission, methodology, data sources, and the platform's educational intent.",
};

export default function AboutPage() {
  return (
    <article className="container py-20 lg:py-28 flex flex-col gap-20">
      <section>
        <SectionHeading
          eyebrow="About"
          title={
            <>
              Space, the way it deserves to be told.
            </>
          }
          description="Cosmos is a premium interactive space exploration and learning platform. It's built for space lovers, students, teachers, and curious people who want to explore the universe visually — without being sold a game."
          as="h1"
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Card className="p-8">
          <h2 className="font-display text-2xl tracking-tight">Mission</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
            Make space feel close. Cosmos is designed to help anyone orbit a world, skim a planet,
            and come away understanding it a little better than they did ten minutes earlier. Not
            gamified. Not dumbed down. Just beautiful, careful, grounded visuals and prose.
          </p>
        </Card>
        <Card className="p-8">
          <h2 className="font-display text-2xl tracking-tight">Philosophy</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed text-pretty">
            Typography, negative space, calm motion, and restraint do most of the work.
            Sophisticated should not mean cluttered. The interface floats above the scene instead
            of boxing it in, and every number on the page should be defensible.
          </p>
        </Card>
      </section>

      <section id="methodology">
        <SectionHeading eyebrow="Methodology" title="How Cosmos handles data." />
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <Card className="p-8">
            <h3 className="font-display text-xl tracking-tight">Server-side adapters</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Every external API — NASA APOD, Launch Library, space news — is fetched exclusively
              on the server, inside a dedicated adapter with timeouts, retries, caching, and
              fallback data. The browser never talks to third parties directly.
            </p>
          </Card>
          <Card className="p-8">
            <h3 className="font-display text-xl tracking-tight">Schemas at the boundary</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Raw responses are validated with Zod schemas and normalised into internal models.
              Whatever shape a provider decides to ship today, Cosmos presents a stable, typed
              shape to the rest of the app.
            </p>
          </Card>
          <Card className="p-8">
            <h3 className="font-display text-xl tracking-tight">Standard envelope</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Every internal endpoint returns <code className="cosmos-kbd">data</code>,{" "}
              <code className="cosmos-kbd">meta</code>, and{" "}
              <code className="cosmos-kbd">attribution</code> — so UI, caching layers, and future
              integrations can all reason about freshness and provenance the same way.
            </p>
          </Card>
        </div>
      </section>

      <section id="sources">
        <SectionHeading
          eyebrow="Sources"
          title="Primary data providers"
          description="Every provider powering Cosmos, plus the ones scaffolded for the next phase. What you see in the UI always traces back to one of these."
        />
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {listProviders().map((p) => (
            <li key={p.id}>
              <a
                href={p.attribution.url ?? "#"}
                target={p.attribution.url ? "_blank" : undefined}
                rel={p.attribution.url ? "noopener noreferrer" : undefined}
                className="cosmos-panel flex h-full flex-col gap-2 p-5 transition hover:border-foreground/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge tone={p.status === "live" ? "live" : "neutral"}>
                    {p.status === "live" ? "Live" : "Scaffolded"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {p.description}
                </span>
                {p.attribution.license ? (
                  <span className="mt-auto text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {p.attribution.license}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading eyebrow="What's next" title="On the roadmap" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            "Moons, dwarf planets, and small bodies",
            "Ephemeris-grade orbit visualisation (JPL Horizons, CelesTrak)",
            "Classroom mode with guided tours",
            "Space mission timeline (Voyager, Webb, Artemis, …)",
            "Texture-rich planet surfaces in the 3D scene",
            "Offline-ready service-worker caching",
          ].map((s) => (
            <div key={s} className="cosmos-panel p-5 text-foreground/85">
              {s}
            </div>
          ))}
        </div>
      </section>

      <section className="cosmos-panel p-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Open for curiosity</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Every endpoint Cosmos uses is also exposed internally — if you want to see the shape of
            our normalised data, poke around the API.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/api/v1/bodies">/api/v1/bodies</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/api/v1/apod">/api/v1/apod</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/api/v1/launches">/api/v1/launches</Link>
          </Button>
        </div>
      </section>
    </article>
  );
}
