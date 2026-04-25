import type { Metadata } from "next";

import { NeutronStarExperience } from "@/components/concepts/neutron-star/neutron-star-experience";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Neutron stars — the lighthouses of the galaxy",
  description:
    "A 20 km ball of nuclear matter, spinning hundreds of times per second, firing twin beams of radiation across space. Real-time shader: surface, magnetosphere, polar beams, light cylinder.",
  openGraph: {
    title: "Neutron stars — the lighthouses of the galaxy",
    description:
      "A 20 km ball of nuclear matter with a magnetic field a trillion times Earth's — and two beams that sweep across the galaxy every time it spins.",
    type: "article",
    // No single famous photograph exists — pulsars are resolved through
    // timing and X-ray spectroscopy. Site OG keeps the social card from
    // rendering blank.
    images: [
      {
        url: site.ogImage,
        width: 1200,
        height: 630,
        alt: "Cosmos — phenomena at the edges of physics",
      },
    ],
  },
};

/**
 * /neutron-star — the third concept in the Cosmos Concepts line.
 * Structure mirrors /black-hole: interactive hero, three science
 * cards, observational-evidence block, then a "how this scene works"
 * footer. Where /black-hole has photographs we have measurements —
 * neutron stars are observed through timing, X-ray spectroscopy, and
 * gravitational waves rather than a single famous photograph.
 */
export default function NeutronStarPage() {
  return (
    <article className="flex flex-col">
      <section
        aria-label="Interactive view of a pulsar"
        className="relative h-[100dvh] min-h-[640px] w-full overflow-hidden bg-background"
      >
        <NeutronStarExperience />
      </section>

      {/* Science layer. Three cards, plain prose, one image per
          concept. We don't hide the complexity — we name the hard
          parts and give each a one-paragraph honest explanation. */}
      <section id="science" className="container section-y-tight flex flex-col gap-10">
        <SectionHeading
          eyebrow="The densest thing we can still see"
          title={<>What a neutron star is, in plain words.</>}
          description="The core of a massive star that ran out of fuel, collapsed in a fraction of a second, and stopped only when the nuclei themselves could not be packed any tighter. What's left is about twenty kilometres across and heavier than the Sun."
          align="left"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Nuclear-density crust</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              A teaspoon of the surface weighs more than a mountain.
              Below a thin iron lattice, the matter is a sea of free
              neutrons, held up against gravity by quantum mechanical
              pressure alone — the same principle that keeps an atomic
              nucleus from collapsing in on itself.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Magnetic field</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              A trillion times stronger than Earth's. Field lines
              funnel charged plasma onto the magnetic poles, heating
              two compact hotspots on the crust to millions of kelvin.
              The closed-field region co-rotates with the star; out
              beyond the light cylinder it has to open up, because
              co-rotating faster than light is not allowed.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Twin beams, swept by spin</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              Particles accelerated along the open field lines radiate
              in a narrow cone out of each magnetic pole. The magnetic
              axis is tilted from the rotation axis, so as the star
              spins, the beams sweep across space. If one happens to
              cross Earth, we receive a pulse — and the object is a
              pulsar.
            </p>
          </Card>
        </div>
      </section>

      {/* Observational evidence — presented as measurements rather
          than photographs. This is honest: there is no single famous
          photograph of a neutron star the way there is of M87*. What
          there is, is ninety years of timing data. */}
      <section className="container section-y-tight flex flex-col gap-10">
        <SectionHeading
          eyebrow="How we know"
          title={<>Ninety years of precise timing.</>}
          description="Neutron stars are not photographed — they are resolved through measurement. Every milestone below is a direct observational result, traceable in the open scientific literature."
          align="left"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-border">
              <span className="cosmos-chip">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> 1967
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Discovery
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg tracking-tight">CP 1919 — the first pulsar</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Jocelyn Bell Burnell detects a radio source pulsing every
              1.337 seconds. The regularity is machine-like; the
              working nickname is "LGM-1", for little green men.
              Within months the origin is identified as a rotating
              neutron star.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-border">
              <span className="cosmos-chip">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> 1974
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                General relativity test
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg tracking-tight">The Hulse–Taylor binary</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Two neutron stars orbiting each other so precisely that
              their orbital period shrinks by exactly as much as
              Einstein's equations predict for gravitational-wave
              energy loss. The first indirect detection of
              gravitational waves. 1993 Nobel.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-border">
              <span className="cosmos-chip">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> 2017
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Multi-messenger
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg tracking-tight">GW170817 — a merger, heard and seen</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              LIGO and Virgo detect the gravitational waves from two
              neutron stars spiralling together; 1.7 seconds later a
              gamma-ray burst arrives. Dozens of telescopes follow up
              across the electromagnetic spectrum. Direct proof that
              neutron-star mergers forge heavy elements.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-border">
              <span className="cosmos-chip">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> 2019
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Surface imaging
              </span>
            </div>
            <h3 className="mt-4 font-display text-lg tracking-tight">NICER maps the hotspots of J0030+0451</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              A soft X-ray telescope on the ISS traces how the
              star's surface brightness varies with rotation and
              reconstructs the thermal hotspots where the magnetic
              field pins plasma to the crust. The first direct shape
              measurement of a neutron star's surface.
            </p>
          </Card>
        </div>
      </section>

      {/* How this scene works — the consistent closing footer.
          Match the /black-hole and /wormhole register: the maths, the
          honest trade-offs, no film references. */}
      <section className="container section-y-tight">
        <Card className="p-8 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="cosmos-chip self-start">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> How this scene works
            </span>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              One sphere, one dipole, and two rotating cones.
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              The hero view is a real-time simulation. For every pixel
              the fragment shader casts a ray from the camera. If the
              ray strikes the stellar sphere, it is shaded as a
              blackbody with two hot polar caps where the magnetic
              axis pierces the crust. If it misses, the shader marches
              the ray through the surrounding volume and accumulates a
              glow whose intensity follows the dipole field strength{" "}
              <span className="whitespace-nowrap">|B| ∝ √(1 + 3cos²θ) / r³</span>
              {" "}— the same expression Maxwell's equations give for a
              static magnetic dipole.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              The two beams are evaluated analytically as gaussians
              around the magnetic axis, which is tilted ~25° from the
              rotation axis and spins around the world vertical. As
              the star rotates, the beams sweep through space — the
              lighthouse effect that defines a pulsar. A small
              Schwarzschild-style deflection is applied to the ray
              near the surface so the curvature of a real neutron
              star's spacetime reads visibly at the limb.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              One honest caveat: real pulsars spin between once a
              second and seven hundred times a second. At those
              speeds the beams would strobe illegibly on a computer
              screen, so this scene rotates at about one revolution
              every eight seconds. Everything else — the geometry,
              the tilt, the beam shape, the magnetosphere topology —
              is as the mathematics of a rotating magnetic dipole
              describes it.
            </p>
          </div>
        </Card>
      </section>

      <div className="section-y-tight" />
    </article>
  );
}
