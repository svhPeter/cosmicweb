import type { Metadata } from "next";

import { SectionHeading } from "@/components/ui/section-heading";
import { DataSourceBadge } from "@/components/content/data-source-badge";
import { WeightCalculator } from "./weight-calculator";

export const metadata: Metadata = {
  title: "What would you weigh on another world?",
  description:
    "An interactive weight calculator: type your weight on Earth and see instantly what you'd weigh on every planet and Pluto.",
};

export default function WeightComparePage() {
  return (
    <div className="container py-20 lg:py-28">
      <SectionHeading
        eyebrow="Compare / Weight"
        title="What would you weigh on another world?"
        description="Weight is mass × local gravity. The same body, on Mars, would weigh a little more than a third of what it does on Earth. Type your weight and find out."
        as="h1"
      />

      <div className="mt-14">
        <WeightCalculator />
      </div>

      <div className="mt-16">
        <DataSourceBadge
          sources={[{ source: "NASA planetary fact sheets", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/" }]}
        />
      </div>
    </div>
  );
}
