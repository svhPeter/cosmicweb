import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Orbit, Scale, Gauge } from "lucide-react";

import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Comparison tools to understand the Solar System intuitively: size, gravity, and an interactive weight calculator.",
};

const tools = [
  {
    href: "/compare/size",
    title: "Size comparison",
    description: "Line up the planets to scale and see how vast the gas giants really are.",
    icon: <Orbit className="h-4 w-4" />,
  },
  {
    href: "/compare/gravity",
    title: "Gravity comparison",
    description: "Compare surface gravity across worlds — from Pluto's gentle tug to Jupiter's crushing pull.",
    icon: <Gauge className="h-4 w-4" />,
  },
  {
    href: "/compare/weight",
    title: "What would you weigh?",
    description: "An interactive calculator: type your weight on Earth and see it on every other world.",
    icon: <Scale className="h-4 w-4" />,
  },
];

export default function CompareHubPage() {
  return (
    <div className="container py-20 lg:py-28">
      <SectionHeading
        eyebrow="Compare"
        title="Three ways to see the scale of the Solar System."
        description="Comparison is how we turn abstract numbers into understanding. Each tool is built to be readable, accurate, and quiet."
        as="h1"
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group block focus:outline-none">
            <Card className="h-full p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel/70 text-accent">
                {tool.icon}
              </div>
              <h2 className="mt-5 font-display text-2xl tracking-tight">{tool.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {tool.description}
              </p>
              <p className="mt-6 inline-flex items-center gap-1 text-sm text-foreground/85 group-hover:text-foreground">
                Open tool <ArrowUpRight className="h-3.5 w-3.5" />
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
