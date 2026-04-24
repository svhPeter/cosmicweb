"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The homepage hero uses the same 3D scene as /explore but non-interactive
 * and framed. It boots lazily so non-hero content renders fast.
 */
const HomeScene = dynamic(() => import("./home-hero-scene").then((m) => m.HomeHeroScene), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-background" aria-hidden />,
});

export function HomeHero() {
  return (
    <section className="relative h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <HomeScene />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/35 to-background" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 35%, rgba(0,0,0,0.0), rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      <div className="container relative z-10 flex h-[100dvh] flex-col justify-end pb-20 pt-28 sm:pb-24 lg:justify-center lg:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <div className="inline-flex items-center gap-2 text-xs tracking-[0.34em] text-foreground/80">
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
            <span>COSMOS</span>
          </div>
          <h1 className="mt-6 font-display text-[clamp(2.1rem,5.2vw,3.6rem)] leading-[1.02] tracking-tight text-balance">
            A quiet place to look back at home.
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="accent">
              <Link href="/explore">
                <Play className="h-4 w-4" /> Enter the observatory
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-foreground/80 hover:text-foreground">
              <Link href="/planets">
                Browse planets <ArrowRight className="h-4 w-4 opacity-70" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
