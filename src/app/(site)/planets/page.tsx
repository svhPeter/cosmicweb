import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { PlanetCard } from "@/components/content/planet-card";
import { Button } from "@/components/ui/button";
import { bodies, planets } from "@/data-static/bodies";

export const metadata: Metadata = {
  title: "Planets",
  description:
    "An editorial overview of every planet in our Solar System — plus Pluto — with the facts that matter most and a path into deeper reading.",
};

export default function PlanetsIndexPage() {
  const sun = bodies.find((b) => b.type === "star");

  return (
    <div className="container py-20 lg:py-28">
      <SectionHeading
        eyebrow="Planets"
        title={
          <>
            A short, careful tour of our{" "}
            <span className="italic text-accent/90">Solar System.</span>
          </>
        }
        description="Eight planets, one dwarf cousin, and a star at the centre of everything. Browse the list, compare worlds, or jump straight into the 3D explorer."
        as="h1"
      />

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild size="md" variant="accent">
          <Link href="/explore">Open 3D explorer</Link>
        </Button>
        <Button asChild size="md" variant="outline">
          <Link href="/compare">Compare planets</Link>
        </Button>
      </div>

      {sun ? (
        <div className="mt-12 cosmos-panel p-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div>
            <p className="cosmos-chip">The Star at the centre</p>
            <h2 className="mt-2 font-display text-2xl tracking-tight">The Sun</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Everything in the Solar System orbits around the Sun — a G-type main-sequence
              star accounting for 99.86% of the system's mass.
            </p>
          </div>
          <div className="md:ml-auto">
            <Button asChild variant="ghost">
              <Link href="/planets/sun">Read about the Sun →</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {planets.map((p) => (
          <PlanetCard key={p.id} body={p} />
        ))}
      </div>
    </div>
  );
}
