import type { Metadata } from "next";

import { BlackHoleExperience } from "@/components/concepts/black-hole/black-hole-experience";
import { RealImageGallery } from "@/components/concepts/real-image-gallery";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Black holes — the only photographs",
  description:
    "A dark gravity well that traps light. Accretion disk, event horizon, photon ring, and the two real photographs humanity has of one: M87* and Sgr A*, from the Event Horizon Telescope.",
  openGraph: {
    title: "Black holes — the only photographs",
    description:
      "A dark gravity well that traps light — with the two real photographs humanity has of one.",
    type: "article",
    images: [
      {
        url: "/images/eht/m87.jpg",
        width: 1280,
        height: 746,
        alt: "M87* — Event Horizon Telescope, 10 April 2019",
      },
    ],
  },
};

/**
 * /black-hole is an interactive concept experience: a real-time 3D
 * view up top (orbit to explore), science copy in the middle, and the
 * two real photographs humanity has of one (M87* and Sgr A*) in the
 * lower fold.
 */
export default function BlackHolePage() {
  return (
    <article className="flex flex-col">
      {/* Full-viewport interactive hero. Owns its own WebGL canvas and
          orbit camera. */}
      <section
        aria-label="Interactive view of a black hole"
        className="relative h-[100dvh] min-h-[640px] w-full overflow-hidden bg-background"
      >
        <BlackHoleExperience />
      </section>

      {/* Science layer. Three cards, plain prose, one metaphor per
          concept. Deliberately not a fact sheet. */}
      <section id="science" className="container section-y-tight flex flex-col gap-10">
        <SectionHeading
          eyebrow="The shape of the dark"
          title={<>What a black hole is, in plain words.</>}
          description="Nothing escapes, including light, once it crosses a one-way boundary called the event horizon. Everything else follows from that single rule."
          align="left"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Event horizon</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              A boundary — not a surface — where the escape speed equals the
              speed of light. Cross it from outside and you cannot come back,
              because coming back would mean travelling faster than light.
              That is why it looks dark: no light reaches us from inside.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Photon sphere</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              A thin shell, a little outside the horizon, where gravity is
              exactly strong enough to bend a photon into a circular orbit.
              The bright thin ring in real images is light that looped the
              horizon once or twice before reaching us.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h3 className="font-display text-xl tracking-tight">Accretion disk</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              Matter falling toward the horizon forms a flat, fast-spinning
              disk. Friction heats it to millions of kelvin and it glows
              brightly across the sky. The side rotating toward us looks
              brighter — relativistic Doppler boost, a direct visual test
              of Einstein.
            </p>
          </Card>
        </div>
      </section>

      {/* The real photographs. The headline is deliberate: two is every
          photograph humanity has ever taken of a black hole. */}
      <section className="container section-y-tight flex flex-col gap-10">
        <SectionHeading
          eyebrow="The only photographs"
          title={<>Two images. That is every one we have.</>}
          description="Both are from the Event Horizon Telescope — a planet-scale array of radio dishes synchronised into a single Earth-sized instrument. Everything else you have seen of a black hole was painted, rendered, or modelled."
          align="left"
        />

        <RealImageGallery items={EHT_IMAGES} />
      </section>

      {/* How the scene is rendered — a quiet footer that explains the
          physics we simulate, without naming films or people. */}
      <section className="container section-y-tight">
        <Card className="p-8 sm:p-10">
          <div className="flex flex-col gap-4">
            <span className="cosmos-chip self-start">
              <span className="h-1 w-1 rounded-full bg-accent" aria-hidden /> How this scene works
            </span>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Every pixel is a light ray, bent by gravity.
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              The hero view above is a real-time simulation. For every
              pixel on your screen a fragment shader casts a light ray
              back into space, bends it around the black hole using the
              Schwarzschild weak-field deflection{" "}
              <span className="whitespace-nowrap">(α ≈ 2r_s / b)</span>,
              and then asks two questions: did it fall into the
              horizon, or did it escape? Rays that escape carry the
              colour of whatever they were pointing at after the bend —
              which is why stars behind the hole curl into arcs, and
              some stars appear duplicated on both sides.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
              The bright disk you see is the accretion disk's sampled
              temperature profile with a Doppler brightness boost on
              the approaching side — a direct visual test of general
              relativity. The thin ring hugging the silhouette is the
              photon ring: light that looped the hole once or twice
              before reaching us.
            </p>
          </div>
        </Card>
      </section>

      <div className="section-y-tight" />
    </article>
  );
}

const EHT_IMAGES = [
  {
    id: "m87",
    src: "/images/eht/m87.jpg",
    alt: "M87* — the first direct image of a black hole, released by the Event Horizon Telescope on 10 April 2019.",
    title: "M87*",
    provenance: "EHT · 10 April 2019",
    caption:
      "The first time anyone saw one. 55 million light-years away, six and a half billion solar masses, imaged at millimetre wavelengths by a planet-sized radio telescope.",
    credit: "Event Horizon Telescope Collaboration · CC BY 4.0",
    sourceHref: "https://www.eso.org/public/images/eso1907a/",
    width: 1280,
    height: 746,
  },
  {
    id: "sgr-a",
    src: "/images/eht/sgr-a.jpg",
    alt: "Sagittarius A* — the supermassive black hole at the centre of the Milky Way, released by the Event Horizon Telescope on 12 May 2022.",
    title: "Sagittarius A*",
    provenance: "EHT · 12 May 2022",
    caption:
      "The centre of our own galaxy. Smaller than M87* but closer, which is why it took longer — its disk evolves on minutes, not weeks, and the image had to be averaged across hundreds of snapshots.",
    credit: "Event Horizon Telescope Collaboration · CC BY 4.0",
    sourceHref: "https://www.eso.org/public/images/eso2208-eht-mwa/",
    width: 1280,
    height: 1280,
  },
] as const;
