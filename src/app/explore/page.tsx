import type { Metadata } from "next";
import { Suspense } from "react";

import { ExploreLoader } from "@/components/space/explore-loader";
import Experience from "./experience";

/**
 * /explore is the immersive 3D Solar System experience.
 *
 * The scene is entirely client-side and lazy-loaded so the rest of the site
 * stays lightweight. A cinematic loader shows while the WebGL runtime and
 * geometry initialise.
 */
export const metadata: Metadata = {
  title: "Explore the Solar System",
  description:
    "A calm, cinematic 3D view of our Solar System. Click a planet to focus, orbit with your mouse, and dive into educational details.",
};

export const dynamic = "force-dynamic";

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoader />}>
      <Experience />
    </Suspense>
  );
}
